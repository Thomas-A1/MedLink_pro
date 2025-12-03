import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  createOrganization,
  fetchOrganizations,
  clearLastCreated,
  updateOrganization,
  deleteOrganization,
  OrganizationSummary,
} from "../store/slices/organizations.slice";
import LocationPicker, {
  LocationSelection,
} from "../components/LocationPicker";
import LogoDropzone from "../components/LogoDropzone";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";
import { resetDatabaseKeepingSuperAdmin } from "../services/admin.service";

const AdminOrganizationsPage = () => {
  const dispatch = useAppDispatch();
  const { items, loading, creating, error, lastCreated } = useAppSelector(
    (state) => state.organizations
  );
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationSummary | null>(
    null
  );
  const [formState, setFormState] = useState({
    name: "",
    type: "pharmacy",
    primaryLocationName: "",
    primaryLocationAddress: "",
    primaryLocationRegion: "",
    primaryLocationDistrict: "",
    primaryLocationCountry: "",
    primaryLocationPhone: "",
    timezone: "Africa/Accra",
    brandColor: "#3949ff",
    logoUrl: "",
    adminEmail: "",
    adminFirstName: "",
    adminLastName: "",
    adminPassword: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [locationSelection, setLocationSelection] =
    useState<LocationSelection | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resettingDb, setResettingDb] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  useEffect(() => {
    dispatch(fetchOrganizations());
  }, [dispatch]);

  useEffect(() => {
    if (lastCreated) {
      // Scroll to top so the success banner is visible
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        // No-op if running in a non-browser context
        window.scrollTo(0, 0);
      }
      // Clear form after successful creation, but don't reset immediately
      setTimeout(() => {
        resetForm();
        dispatch(clearLastCreated());
      }, 3000);
    }
  }, [lastCreated, dispatch]);

  useEffect(() => {
    if (editingOrg) {
      setFormState({
        name: editingOrg.name,
        type: editingOrg.type,
        primaryLocationName: editingOrg.primaryLocation?.name || "",
        primaryLocationAddress: editingOrg.primaryLocation?.address || "",
        primaryLocationRegion: editingOrg.primaryLocation?.region || "",
        primaryLocationDistrict: editingOrg.primaryLocation?.district || "",
        primaryLocationCountry: editingOrg.primaryLocation?.country || "",
        primaryLocationPhone: editingOrg.primaryLocation?.contactPhone || "",
        timezone: editingOrg.timezone || "Africa/Accra",
        brandColor: editingOrg.brandColor || "#3949ff",
        logoUrl: editingOrg.logoUrl || "",
        adminEmail: editingOrg.admin?.email || "",
        adminFirstName: editingOrg.admin?.firstName || "",
        adminLastName: editingOrg.admin?.lastName || "",
        adminPassword: "",
      });
      if (
        editingOrg.primaryLocation?.latitude &&
        editingOrg.primaryLocation?.longitude
      ) {
        setLocationSelection({
          latitude: editingOrg.primaryLocation.latitude,
          longitude: editingOrg.primaryLocation.longitude,
          displayName: editingOrg.primaryLocation.address,
          address: {
            road: editingOrg.primaryLocation.address,
            city: editingOrg.primaryLocation.district,
            state: editingOrg.primaryLocation.region,
            country: editingOrg.primaryLocation.country || "",
          },
        });
      }
      setShowForm(true);
    }
  }, [editingOrg]);

  const resetForm = () => {
    setFormState({
      name: "",
      type: "pharmacy",
      primaryLocationName: "",
      primaryLocationAddress: "",
      primaryLocationRegion: "",
      primaryLocationDistrict: "",
      primaryLocationCountry: "",
      primaryLocationPhone: "",
      timezone: "Africa/Accra",
      brandColor: "#3949ff",
      logoUrl: "",
      adminEmail: "",
      adminFirstName: "",
      adminLastName: "",
      adminPassword: "",
    });
    setFormErrors({});
    setLocationSelection(null);
    setLocationError(null);
    setEditingOrg(null);
    setShowForm(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formState.name.trim()) {
      errors.name = "Organization name is required";
    }

    if (!formState.primaryLocationPhone.trim()) {
      errors.primaryLocationPhone = "Contact phone is required";
    } else if (
      !/^\+?\d{10,}$/.test(formState.primaryLocationPhone.replace(/[\s-]/g, ""))
    ) {
      errors.primaryLocationPhone = "Please enter a valid phone number";
    }

    if (!locationSelection && !editingOrg?.primaryLocation) {
      errors.location = "Please select a location on the map";
    }

    if (!formState.adminEmail.trim()) {
      errors.adminEmail = "Admin email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.adminEmail)) {
      errors.adminEmail = "Please enter a valid email address";
    }

    if (!formState.adminFirstName.trim()) {
      errors.adminFirstName = "Admin first name is required";
    }

    if (!formState.timezone.trim()) {
      errors.timezone = "Timezone is required";
    }

    if (!formState.brandColor.trim()) {
      errors.brandColor = "Brand color is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Verify authentication before submitting
    if (!accessToken || !user) {
      setFormErrors({
        submit:
          "You must be logged in to perform this action. Please refresh and log in again.",
      });
      return;
    }

    if (user.role !== "super_admin") {
      setFormErrors({
        submit:
          "You don't have permission to create organizations. Super admin access required.",
      });
      return;
    }

    if (editingOrg) {
      // Update existing organization
      setUpdating(true);
      try {
        await dispatch(
          updateOrganization({
            id: editingOrg.id,
            name: formState.name,
            type: formState.type,
            primaryLocationName: formState.primaryLocationName || undefined,
            primaryLocationAddress:
              formState.primaryLocationAddress || undefined,
            primaryLocationRegion: formState.primaryLocationRegion || undefined,
            primaryLocationDistrict:
              formState.primaryLocationDistrict || undefined,
            primaryLocationCountry:
              formState.primaryLocationCountry || undefined,
            primaryLocationPhone: formState.primaryLocationPhone,
            primaryLocationLatitude:
              locationSelection?.latitude ||
              editingOrg.primaryLocation?.latitude,
            primaryLocationLongitude:
              locationSelection?.longitude ||
              editingOrg.primaryLocation?.longitude,
            timezone: formState.timezone,
            brandColor: formState.brandColor,
            logoUrl: formState.logoUrl || undefined,
            adminEmail: formState.adminEmail,
            adminFirstName: formState.adminFirstName,
            adminLastName: formState.adminLastName || undefined,
          })
        ).unwrap();
        resetForm();
        dispatch(fetchOrganizations());
      } catch (err: any) {
        const apiMsg = parseApiError(err);
        if (apiMsg && /phone number.*already/i.test(apiMsg)) {
          setFormErrors({
            primaryLocationPhone:
              "Phone number already exists. Please use a different number.",
          });
        } else {
          setFormErrors({
            submit:
              apiMsg || "Failed to update organization. Please try again.",
          });
        }
      } finally {
        setUpdating(false);
      }
    } else {
      // Create new organization
      if (!locationSelection) {
        setLocationError("Please select a location on the map.");
        return;
      }

      try {
        // Double-check authentication before making request
        const currentToken = accessToken || localStorage.getItem("accessToken");
        if (!currentToken) {
          setFormErrors({
            submit:
              "Your session has expired. Please refresh the page and log in again.",
          });
          return;
        }

        await dispatch(
          createOrganization({
            name: formState.name,
            type: formState.type,
            primaryLocationName: formState.primaryLocationName || undefined,
            primaryLocationAddress:
              formState.primaryLocationAddress || undefined,
            primaryLocationRegion: formState.primaryLocationRegion || undefined,
            primaryLocationDistrict:
              formState.primaryLocationDistrict || undefined,
            primaryLocationCountry:
              formState.primaryLocationCountry || undefined,
            primaryLocationPhone: formState.primaryLocationPhone,
            primaryLocationLatitude: locationSelection.latitude,
            primaryLocationLongitude: locationSelection.longitude,
            timezone: formState.timezone,
            brandColor: formState.brandColor,
            logoUrl: formState.logoUrl || undefined,
            adminEmail: formState.adminEmail,
            adminFirstName: formState.adminFirstName,
            adminLastName: formState.adminLastName || undefined,
            adminPassword: formState.adminPassword || undefined,
          })
        ).unwrap();
        dispatch(fetchOrganizations());
      } catch (err: any) {
        const message = parseApiError(err);
        if (/phone number.*already/i.test(message)) {
          setFormErrors({
            primaryLocationPhone:
              "Phone number already exists. Please use a different number.",
          });
          return;
        }
        setFormErrors({ submit: message });
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone. All associated data will be removed and users will lose access.`
      )
    ) {
      return;
    }
    setDeleting(id);
    try {
      await dispatch(deleteOrganization(id)).unwrap();
      dispatch(fetchOrganizations());
    } catch (err: any) {
      console.error("Failed to delete organization:", err);
      alert(err?.message || "Failed to delete organization. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleLogoChange = (logoUrl: string) => {
    setFormState((prev) => ({ ...prev, logoUrl }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.logoUrl;
      return next;
    });
  };

  const handleLogoError = (error: string) => {
    if (error) {
      setFormErrors((prev) => ({ ...prev, logoUrl: error }));
    } else {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.logoUrl;
        return next;
      });
    }
  };

  const handleResetDatabase = async () => {
    if (!user || user.role !== "super_admin") {
      alert("Only the Super Admin can perform a full system reset.");
      return;
    }

    // First click just reveals the inline confirmation panel
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      setResetConfirmText("");
      return;
    }

    if (resetConfirmText.trim() !== "RESET_ALL_DATA") {
      alert("Confirmation phrase did not match. System reset was cancelled.");
      return;
    }

    try {
      setResettingDb(true);
      await resetDatabaseKeepingSuperAdmin();
      alert(
        "System reset completed.\n\nAll data has been cleared except the Super Admin account.\nYou will now be signed out."
      );
      // Best-effort: clear local auth and reload
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("healthconnect-auth");
      window.location.href = "/login";
    } catch (err: any) {
      console.error("Failed to reset database:", err);
      alert(
        parseApiError(err) ||
          "Failed to reset database. Please check the backend logs."
      );
    } finally {
      setResettingDb(false);
    }
  };

  const locationSummary = useMemo(() => {
    if (!locationSelection) {
      return null;
    }
    const { address, latitude, longitude, displayName } = locationSelection;
    return {
      displayName,
      latitude,
      longitude,
      addressLine:
        address.road ??
        address.neighbourhood ??
        address.suburb ??
        address.city ??
        address.town ??
        address.village ??
        "",
      city:
        address.city ?? address.town ?? address.village ?? address.county ?? "",
      region: address.state ?? address.region ?? address.county ?? "",
      country: address.country ?? "",
      postalCode: address.postcode ?? "",
    };
  }, [locationSelection]);

  useEffect(() => {
    if (!locationSummary) {
      return;
    }
    setFormState((prev) => ({
      ...prev,
      primaryLocationAddress: locationSummary.addressLine,
      primaryLocationDistrict: locationSummary.city,
      primaryLocationRegion: locationSummary.region,
      primaryLocationCountry: locationSummary.country,
    }));
    setLocationError(null);
    // Clear location error in form errors
    if (formErrors.location) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.location;
        return next;
      });
    }
  }, [locationSummary]);

  return (
    <div className="page admin-organizations-page">
      <div className="page-header">
        <div>
          <h1>Organizations</h1>
          <p className="subtitle">
            Manage pharmacy and hospital organizations. Create, edit, or remove
            organizations and their administrators.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            className="primary-button"
            onClick={() => {
              if (showForm) {
                resetForm(); // This already sets showForm to false
              } else {
                resetForm(); // Clear any existing state first
                setShowForm(true); // Then show the form
              }
            }}
          >
            {showForm ? "✕ Cancel" : "+ New Organization"}
          </button>
          <button
            type="button"
            className="ghost-button danger"
            onClick={handleResetDatabase}
            disabled={resettingDb}
            title="Danger: Erase all data except the Super Admin. Intended for development/testing only."
          >
            {resettingDb ? "Resetting system…" : "🧨 Reset All Data"}
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <section
          className="card removal-panel"
          style={{ marginBottom: "24px", maxWidth: 640 }}
        >
          <h3>Danger zone: Reset all data</h3>
          <p>
            This will permanently erase{" "}
            <strong>
              all organizations, pharmacies, staff, inventory, prescriptions,
              queue entries, and activity
            </strong>
            , keeping only the Super Admin account. This is intended for{" "}
            <strong>development and testing environments</strong> only.
          </p>
          <p>
            To confirm, type <code>RESET_ALL_DATA</code> below and click{" "}
            <strong>Confirm reset</strong>.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Type RESET_ALL_DATA to confirm"
              style={{
                flex: "1 1 220px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(148,163,184,0.6)",
              }}
            />
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setShowResetConfirm(false);
                setResetConfirmText("");
              }}
              disabled={resettingDb}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ghost-button danger"
              onClick={handleResetDatabase}
              disabled={resettingDb}
            >
              {resettingDb ? "Resetting…" : "Confirm reset"}
            </button>
          </div>
        </section>
      )}

      {error && <div className="error-banner">{error}</div>}
      {lastCreated && (
        <div className="success-banner">
          <div>
            <strong>{lastCreated.name}</strong> was created successfully.
            {lastCreated.admin?.temporaryPassword && (
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1.5rem",
                  backgroundColor: "#e7f5ff",
                  border: "2px solid #228be6",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <strong style={{ fontSize: "1.1rem", color: "#1864ab" }}>
                    🔐 Temporary Password Generated
                  </strong>
                </div>
                <p style={{ margin: "0 0 0.75rem 0", color: "#495057" }}>
                  A temporary password has been created for{" "}
                  <strong>{lastCreated.admin.email}</strong>.
                  <strong style={{ color: "#1864ab" }}>
                    {" "}
                    Please copy and share this password securely
                  </strong>{" "}
                  with the organization admin. They should use this to log in
                  and will be prompted to change it on first login.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid #dee2e6",
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      color: "#1864ab",
                      fontFamily: "monospace",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {lastCreated.admin.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={(e) => {
                      navigator.clipboard.writeText(
                        lastCreated.admin?.temporaryPassword || ""
                      );
                      const btn = e.currentTarget;
                      const originalText = btn.textContent;
                      btn.textContent = "✓ Copied!";
                      btn.style.backgroundColor = "#51cf66";
                      setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.backgroundColor = "";
                      }, 2000);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#228be6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <p
                  style={{
                    margin: "0.75rem 0 0 0",
                    fontSize: "0.85rem",
                    color: "#868e96",
                    fontStyle: "italic",
                  }}
                >
                  💡 Tip: To set a custom password instead, fill in the "Admin
                  Password" field when creating the organization.
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => dispatch(clearLastCreated())}
          >
            Dismiss
          </button>
        </div>
      )}

      {formErrors.submit && (
        <div className="error-banner">{formErrors.submit}</div>
      )}

      {showForm && (
        <section className="card organization-form-card">
          <header>
            <h2>{editingOrg ? "Edit Organization" : "Create Organization"}</h2>
            <p>
              {editingOrg
                ? "Update organization details. Location changes require map selection."
                : "Configure the primary location and administrator. Drag the marker or search to pick an exact location—no manual coordinates needed."}
            </p>
          </header>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-field wide">
              <label htmlFor="org-name">
                Organization name *
                {formErrors.name && (
                  <span className="field-error"> - {formErrors.name}</span>
                )}
              </label>
              <input
                id="org-name"
                value={formState.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Example Pharmacy Group"
                required
                className={formErrors.name ? "input-error" : ""}
              />
            </div>
            <div className="form-field">
              <label htmlFor="org-type">Type</label>
              <select
                id="org-type"
                value={formState.type}
                onChange={(event) => handleChange("type", event.target.value)}
              >
                <option value="pharmacy">Pharmacy</option>
                <option value="hospital">Hospital</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="org-timezone">
                Timezone *
                {formErrors.timezone && (
                  <span className="field-error"> - {formErrors.timezone}</span>
                )}
              </label>
              <input
                id="org-timezone"
                value={formState.timezone}
                onChange={(event) =>
                  handleChange("timezone", event.target.value)
                }
                placeholder="Africa/Accra"
                required
                className={formErrors.timezone ? "input-error" : ""}
              />
            </div>
            <div className="form-field">
              <label htmlFor="org-color">
                Brand color *
                {formErrors.brandColor && (
                  <span className="field-error">
                    {" "}
                    - {formErrors.brandColor}
                  </span>
                )}
              </label>
              <input
                id="org-color"
                type="color"
                value={formState.brandColor}
                onChange={(event) =>
                  handleChange("brandColor", event.target.value)
                }
                required
              />
            </div>

            <div className="form-field wide">
              <label htmlFor="org-logo">
                Logo (optional)
                {formErrors.logoUrl && (
                  <span className="field-error"> - {formErrors.logoUrl}</span>
                )}
              </label>
              <LogoDropzone
                value={formState.logoUrl}
                onChange={handleLogoChange}
                onError={handleLogoError}
              />
            </div>

            <div className="form-field wide">
              <label htmlFor="loc-name">Primary location name (optional)</label>
              <input
                id="loc-name"
                value={formState.primaryLocationName}
                onChange={(event) =>
                  handleChange("primaryLocationName", event.target.value)
                }
                placeholder="Main Branch"
              />
            </div>
            <div className="form-field wide">
              <LocationPicker
                label="Locate branch on map *"
                value={locationSelection}
                onLocationChange={setLocationSelection}
              />
              {(locationError || formErrors.location) && (
                <small className="input-error">
                  {locationError || formErrors.location}
                </small>
              )}
              {editingOrg &&
                !locationSelection &&
                editingOrg.primaryLocation?.latitude && (
                  <small className="muted">
                    Current location:{" "}
                    {editingOrg.primaryLocation.latitude.toFixed(4)}°,{" "}
                    {editingOrg.primaryLocation.longitude.toFixed(4)}°
                  </small>
                )}
            </div>

            {locationSummary && (
              <div className="location-summary">
                <div>
                  <span>Address</span>
                  <strong>{locationSummary.displayName}</strong>
                </div>
                <div>
                  <span>Latitude / Longitude</span>
                  <strong>
                    {locationSummary.latitude.toFixed(6)}° ,{" "}
                    {locationSummary.longitude.toFixed(6)}°
                  </strong>
                </div>
                <div>
                  <span>Region</span>
                  <strong>{locationSummary.region || "—"}</strong>
                </div>
                <div>
                  <span>District / City</span>
                  <strong>{locationSummary.city || "—"}</strong>
                </div>
                <div>
                  <span>Country</span>
                  <strong>{locationSummary.country || "—"}</strong>
                </div>
              </div>
            )}
            <div className="form-field">
              <label htmlFor="loc-phone">
                Contact phone *
                {formErrors.primaryLocationPhone && (
                  <span className="field-error">
                    {" "}
                    - {formErrors.primaryLocationPhone}
                  </span>
                )}
              </label>
              <input
                id="loc-phone"
                value={formState.primaryLocationPhone}
                onChange={(event) =>
                  handleChange("primaryLocationPhone", event.target.value)
                }
                placeholder="+233..."
                required
                className={formErrors.primaryLocationPhone ? "input-error" : ""}
              />
            </div>

            <div className="form-field">
              <label htmlFor="admin-email">
                Admin email *
                {formErrors.adminEmail && (
                  <span className="field-error">
                    {" "}
                    - {formErrors.adminEmail}
                  </span>
                )}
              </label>
              <input
                id="admin-email"
                type="email"
                value={formState.adminEmail}
                onChange={(event) =>
                  handleChange("adminEmail", event.target.value)
                }
                placeholder="admin@example.com"
                required
                className={formErrors.adminEmail ? "input-error" : ""}
              />
            </div>
            <div className="form-field">
              <label htmlFor="admin-first">
                Admin first name *
                {formErrors.adminFirstName && (
                  <span className="field-error">
                    {" "}
                    - {formErrors.adminFirstName}
                  </span>
                )}
              </label>
              <input
                id="admin-first"
                value={formState.adminFirstName}
                onChange={(event) =>
                  handleChange("adminFirstName", event.target.value)
                }
                required
                className={formErrors.adminFirstName ? "input-error" : ""}
              />
            </div>
            <div className="form-field">
              <label htmlFor="admin-last">Admin last name (optional)</label>
              <input
                id="admin-last"
                value={formState.adminLastName}
                onChange={(event) =>
                  handleChange("adminLastName", event.target.value)
                }
              />
            </div>
            {!editingOrg && (
              <div className="form-field">
                <label htmlFor="admin-password">
                  Admin password (optional)
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={formState.adminPassword}
                  onChange={(event) =>
                    handleChange("adminPassword", event.target.value)
                  }
                  placeholder="Leave empty to auto-generate a temporary password"
                  title="Optional: If not provided, a temporary password will be generated automatically"
                />
                <small className="muted">
                  If left blank, a temporary password will be generated. Admin
                  must change it on first login.
                </small>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={resetForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={creating || updating}
              >
                {updating
                  ? "Updating…"
                  : creating
                  ? "Creating…"
                  : editingOrg
                  ? "Update Organization"
                  : "Create Organization"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="organizations-grid">
        {loading && (
          <div className="empty-state">
            <p>Loading organizations…</p>
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="empty-state">
            <p>No organizations yet. Create your first one above.</p>
          </div>
        )}
        {!loading &&
          items.map((org) => (
            <div key={org.id} className="organization-card">
              <div
                className="organization-card-header"
                style={{
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "rgba(148, 163, 184, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid rgba(148,163,184,0.25)",
                    }}
                  >
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={`${org.name} logo`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 700 }}>
                        {org.name?.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{org.name}</h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "6px",
                      }}
                    >
                      <span className="organization-type">{org.type}</span>
                      {org.brandColor && (
                        <span
                          title={`Brand color: ${org.brandColor}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.8rem",
                            color: "var(--slate-600)",
                          }}
                        >
                          <span
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "3px",
                              background: org.brandColor,
                              border: "1px solid rgba(0,0,0,0.1)",
                            }}
                          />
                          {org.brandColor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="organization-actions"
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: "8px",
                    flexShrink: 0,
                    marginTop: "6px",
                  }}
                >
                  <button
                    className="ghost-button small"
                    onClick={() => setEditingOrg(org)}
                    disabled={deleting === org.id}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="ghost-button small danger"
                    onClick={() => handleDelete(org.id, org.name)}
                    disabled={deleting === org.id}
                  >
                    {deleting === org.id ? "Deleting…" : "🗑️ Delete"}
                  </button>
                </div>
              </div>
              <div className="organization-card-body">
                <div className="organization-detail">
                  <span>📅 Created</span>
                  <small>{new Date(org.createdAt).toLocaleDateString()}</small>
                </div>
                {org.primaryLocation && (
                  <div className="organization-detail">
                    <span>📍 Location</span>
                    <strong>{org.primaryLocation.name}</strong>
                    <small>{org.primaryLocation.address}</small>
                    <small>
                      {org.primaryLocation.region}
                      {org.primaryLocation.country &&
                        `, ${org.primaryLocation.country}`}
                    </small>
                    {org.primaryLocation.contactPhone && (
                      <small>☎ {org.primaryLocation.contactPhone}</small>
                    )}
                  </div>
                )}
                {org.contactEmail && (
                  <div className="organization-detail">
                    <span>✉️ Contact</span>
                    <small>{org.contactEmail}</small>
                  </div>
                )}
                <div className="organization-detail">
                  <span>👤 Admin</span>
                  <strong>
                    {org.admin?.firstName} {org.admin?.lastName}
                  </strong>
                  <small>{org.admin?.email}</small>
                </div>
                {org.timezone && (
                  <div className="organization-detail">
                    <span>🕐 Timezone</span>
                    <small>{org.timezone}</small>
                  </div>
                )}
              </div>
            </div>
          ))}
      </section>
    </div>
  );
};

export default AdminOrganizationsPage;
