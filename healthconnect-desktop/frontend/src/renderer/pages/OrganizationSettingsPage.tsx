import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { organizationsService } from "../services/organizations.service";
import { updateOrganizationSettings } from "../store/slices/auth.slice";
import { authService } from "../services/auth.service";
import LogoDropzone from "../components/LogoDropzone";

interface ThemeState {
  primary: string;
  accent: string;
}

interface FeaturesState {
  [key: string]: boolean;
}

const defaultTheme: ThemeState = {
  primary: "#2d3de3",
  accent: "#10b981",
};

const OrganizationSettingsPage = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const organization = user?.organization ?? null;
  const isOrgAdmin = user?.role === "hospital_admin";

  const [theme, setTheme] = useState<ThemeState>(defaultTheme);
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#3949ff");
  const [timezone, setTimezone] = useState("Africa/Accra");
  const [features, setFeatures] = useState<FeaturesState>({
    enableInventorySync: false,
    enableCustomBranding: true,
    enableTelepharmacy: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const resolvedSettings = useMemo(() => {
    return (organization?.settings ?? {}) as Record<string, unknown>;
  }, [organization]);

  useEffect(() => {
    if (!organization) {
      return;
    }
    const themeSettings = (resolvedSettings.theme ?? {}) as Record<
      string,
      string
    >;
    setTheme({
      primary: themeSettings.primary ?? defaultTheme.primary,
      accent: themeSettings.accent ?? defaultTheme.accent,
    });
    setLogoUrl((resolvedSettings.logoUrl as string) ?? "");
    setTagline((resolvedSettings.tagline as string) ?? "");
    setBrandColor(organization.brandColor ?? "#3949ff");
    setTimezone(organization.timezone ?? "Africa/Accra");
    setFeatures({
      enableInventorySync:
        (resolvedSettings.features as Record<string, boolean>)
          ?.enableInventorySync ?? false,
      enableCustomBranding:
        (resolvedSettings.features as Record<string, boolean>)
          ?.enableCustomBranding ?? true,
      enableTelepharmacy:
        (resolvedSettings.features as Record<string, boolean>)
          ?.enableTelepharmacy ?? false,
    });
  }, [organization, resolvedSettings]);

  const handleFeatureToggle = (key: string) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!organization) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    setLogoError(null);
    try {
      const payload = await organizationsService.updateSettings(
        organization.id,
        {
          themePrimaryColor: theme.primary,
          themeAccentColor: theme.accent,
          logoUrl: logoUrl || undefined,
          tagline: tagline || undefined,
          brandColor,
          timezone,
          features,
        }
      );
      dispatch(
        updateOrganizationSettings({
          brandColor: payload.brandColor ?? null,
          timezone: payload.timezone ?? null,
          settings: (payload.settings ?? null) as Record<
            string,
            unknown
          > | null,
        })
      );
      // Persist updated organization branding to localStorage user so it survives reloads
      try {
        const userRaw = localStorage.getItem("healthconnect-auth");
        if (userRaw) {
          const userObj = JSON.parse(userRaw);
          userObj.organization = {
            ...(userObj.organization ?? {}),
            brandColor: payload.brandColor ?? null,
            timezone: payload.timezone ?? null,
            settings: (payload.settings ?? null) as Record<
              string,
              unknown
            > | null,
          };
          localStorage.setItem("healthconnect-auth", JSON.stringify(userObj));
        }
      } catch {
        // no-op if storage is unavailable
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordChange(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isOrgAdmin || !organization) {
    return (
      <div className="page">
        <h1>Organization settings</h1>
        <p className="subtitle">
          Only organization administrators can manage branding and feature
          settings.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Organization settings</h1>
          <p className="subtitle">
            Tailor the MedLink experience for{" "}
            <strong>{organization.name}</strong>. Branding, integrations, and
            feature access are applied instantly across your pharmacy branches.
          </p>
        </div>
      </div>

      <section className="queue-form">
        <header>
          <h2>Branding & theme</h2>
          <p>
            Update the colors and messaging that appear across the desktop app
            and shared portals. Preview updates live before publishing.
          </p>
        </header>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="theme-primary">Primary brand color</label>
            <input
              id="theme-primary"
              type="color"
              value={theme.primary}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, primary: event.target.value }))
              }
            />
            <small className="field-hint">
              Used for buttons and key highlights.
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="theme-accent">Accent color</label>
            <input
              id="theme-accent"
              type="color"
              value={theme.accent}
              onChange={(event) =>
                setTheme((prev) => ({ ...prev, accent: event.target.value }))
              }
            />
            <small className="field-hint">
              Applied to success states and charts.
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="brand-color">Sidebar gradient base</label>
            <input
              id="brand-color"
              type="color"
              value={brandColor}
              onChange={(event) => setBrandColor(event.target.value)}
            />
          </div>
          <div className="form-field wide">
            <label htmlFor="logo-url">Organization Logo</label>
            <LogoDropzone
              value={logoUrl}
              onChange={(url) => {
                setLogoUrl(url);
                setLogoError(null);
              }}
              onError={(err) => setLogoError(err)}
            />
            {logoError && (
              <small
                className="error"
                style={{ display: "block", marginTop: "0.5rem" }}
              >
                {logoError}
              </small>
            )}
            <small
              className="field-hint"
              style={{ marginTop: "0.5rem", display: "block" }}
            >
              Upload your organization logo. Images are converted to base64 data
              URLs. Maximum 2MB.
            </small>
          </div>
          <div className="form-field wide">
            <label htmlFor="tagline">Tagline / hero message</label>
            <input
              id="tagline"
              value={tagline}
              maxLength={180}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="Modern care, powered by MedLink."
            />
          </div>
          <div className="form-field">
            <label htmlFor="timezone">Default timezone</label>
            <input
              id="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Africa/Accra"
            />
          </div>

          <div className="form-field wide">
            <h3 style={{ margin: "12px 0 6px" }}>Features</h3>
            <div className="features-grid">
              {Object.entries(features).map(([key, value]) => (
                <label key={key} className="feature-toggle">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleFeatureToggle(key)}
                  />
                  <div>
                    <strong>{key.replace(/([A-Z])/g, " $1")}</strong>
                    <span>
                      {key === "enableInventorySync" &&
                        "Sync with external inventory services."}
                      {key === "enableCustomBranding" &&
                        "Allow per-branch overrides and custom dashboards."}
                      {key === "enableTelepharmacy" &&
                        "Enable virtual consult workflows."}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="error-banner">{error}</p>}
          {success && (
            <p className="success-banner">Branding saved successfully.</p>
          )}

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving…" : "Save branding"}
            </button>
          </div>
        </form>
      </section>

      <section className="queue-form" style={{ marginTop: "28px" }}>
        <header>
          <h2>Account Security</h2>
          <p>
            Change your password to keep your account secure. Choose a strong,
            unique password.
          </p>
        </header>

        {!showPasswordChange ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowPasswordChange(true)}
            style={{ marginTop: "1rem" }}
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="form-grid">
            <div className="form-field wide">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-field wide">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <small className="field-hint">
                Must be at least 8 characters long
              </small>
            </div>
            <div className="form-field wide">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
                required
                autoComplete="new-password"
              />
            </div>

            {passwordError && (
              <p className="error-banner" style={{ gridColumn: "1 / -1" }}>
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="success-banner" style={{ gridColumn: "1 / -1" }}>
                Password changed successfully!
              </p>
            )}

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setShowPasswordChange(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={changingPassword}
              >
                {changingPassword ? "Changing…" : "Change Password"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="queue-form" style={{ marginTop: "28px" }}>
        <header>
          <h2>Branch experience</h2>
          <p>
            Customize how location data, logos, and hero messaging appear across
            your MedLink stations. Use the theme preview to test legibility
            before rollout.
          </p>
        </header>
        <div className="theme-preview">
          <div
            className="theme-preview-banner"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${brandColor})`,
            }}
          >
            <div className="theme-preview-logo">
              {logoUrl ? (
                <img src={logoUrl} alt="Org logo preview" />
              ) : (
                <span>MedLink</span>
              )}
            </div>
            <div className="theme-preview-message">
              <strong>{organization?.name ?? "Your pharmacy"}</strong>
              <span>{tagline || "Delivering trusted care with MedLink."}</span>
            </div>
          </div>
          <div className="theme-preview-cards">
            <div className="theme-preview-card">
              <span>Average wait</span>
              <strong style={{ color: theme.primary }}>07:42</strong>
              <small>Live metrics refresh with theme accents.</small>
            </div>
            <div className="theme-preview-card">
              <span>Inventory health</span>
              <strong style={{ color: theme.accent }}>98%</strong>
              <small>Key stats follow the accent color.</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrganizationSettingsPage;
