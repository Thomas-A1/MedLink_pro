import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../store/hooks";
import {
  pharmacyService,
  PharmacyStaffMember,
} from "../services/pharmacy.service";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";

const StaffPage = () => {
  const { items: pharmacies, activePharmacyId } = useAppSelector(
    (state) => state.pharmacies
  );
  const { user } = useAppSelector((state) => state.auth);
  const activePharmacy = pharmacies.find((p) => p.id === activePharmacyId);

  const [form, setForm] = useState({
    email: "",
    phoneNumber: "",
    firstName: "",
    lastName: "",
    role: "pharmacist",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<PharmacyStaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [removalTarget, setRemovalTarget] =
    useState<PharmacyStaffMember | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [removalSaving, setRemovalSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!activePharmacy) {
      setStaff([]);
      return;
    }
    setStaffLoading(true);
    try {
      const members = await pharmacyService.listStaffMembers(activePharmacy.id);
      setStaff(members);
    } catch (err) {
      console.error(err);
    } finally {
      setStaffLoading(false);
    }
  }, [activePharmacy?.id]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!activePharmacy) {
      setError("Please select a service location first.");
      return;
    }
    if (!form.email || !form.phoneNumber || !form.firstName) {
      setError("Please complete all required fields.");
      return;
    }
    if (!/^\+?\d{10,}$/.test(form.phoneNumber.replace(/[\s-]/g, ""))) {
      setError("Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    try {
      const res = await pharmacyService.inviteStaff(activePharmacy.id, {
        email: form.email.toLowerCase().trim(),
        phoneNumber: form.phoneNumber,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role as any,
      });
      setSuccess("Invitation created successfully.");
      await loadStaff();
      if (res?.inviteToken) {
        // no display of token for security; rely on reset/invite flow via SMS/email configured
      }
      setForm({
        email: "",
        phoneNumber: "",
        firstName: "",
        lastName: "",
        role: "pharmacist",
      });
    } catch (err: any) {
      const message = parseApiError(err);
      if (/organization.*domain/i.test(message)) {
        setError("Email must use your organization's domain.");
      } else if (/phone number.*already/i.test(message)) {
        setError("Phone number already exists. Please use a different number.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartRemoval = (member: PharmacyStaffMember) => {
    setRemovalTarget(member);
    setRemovalReason("");
    setRemovalError(null);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const handleRemoveStaff = async () => {
    if (!activePharmacy || !removalTarget) return;
    const reason = removalReason.trim();
    if (!reason) {
      setRemovalError("Please provide a short note explaining why.");
      return;
    }
    setRemovalError(null);
    setRemovalSaving(true);
    try {
      await pharmacyService.removeStaffMember(
        activePharmacy.id,
        removalTarget.id,
        reason
      );
      setSuccess("Employee access revoked.");
      setRemovalTarget(null);
      setRemovalReason("");
      await loadStaff();
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      setRemovalError(parseApiError(err));
    } finally {
      setRemovalSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Staff</h1>
          <p className="subtitle">
            Invite employees to access your MedLink workstation at{" "}
            <strong>{activePharmacy?.name ?? "your location"}</strong>.
          </p>
        </div>
      </div>

      <section className="queue-form" style={{ marginBottom: "32px" }}>
        <header>
          <h2>Invite employee</h2>
          <p>Provide the employee's details. Email must match org domain.</p>
        </header>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="staff-email">Email</label>
            <input
              id="staff-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="employee@yourorg.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="staff-phone">Phone number</label>
            <input
              id="staff-phone"
              value={form.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              placeholder="+23320XXXXXXX"
              required
              autoComplete="tel"
            />
          </div>
          <div className="form-field">
            <label htmlFor="staff-first">First name</label>
            <input
              id="staff-first"
              value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder="First name"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="staff-last">Last name</label>
            <input
              id="staff-last"
              value={form.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="form-field">
            <label htmlFor="staff-role">Role</label>
            <select
              id="staff-role"
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              <option value="pharmacist">Pharmacist</option>
              <option value="clerk">Clerk</option>
              <option value="hospital_admin">Admin</option>
            </select>
          </div>

          {error && (
            <Alert type="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert type="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Inviting…" : "Invite staff"}
            </button>
          </div>
        </form>
      </section>

      <section className="queue-form">
        <header>
          <h2>Current employees</h2>
          <p>
            Manage who can access this workspace. Removing someone disables
            their login immediately. You cannot remove your own access.
          </p>
        </header>

        {staffLoading ? (
          <p className="muted">Loading staff…</p>
        ) : staff.length === 0 ? (
          <p className="muted">
            No employees added yet. Invite someone to get started.
          </p>
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Invited</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const fullName = [member.user.firstName, member.user.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  return (
                    <tr key={member.id}>
                      <td>{fullName || "—"}</td>
                      <td>{member.user.email}</td>
                      <td style={{ textTransform: "capitalize" }}>
                        {member.user.role.replace("_", " ")}
                      </td>
                      <td>{member.user.phoneNumber}</td>
                      <td>{new Date(member.invitedAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="action-button danger"
                          onClick={() => handleStartRemoval(member)}
                          disabled={member.user.id === user?.id}
                          title={
                            member.user.id === user?.id
                              ? "You cannot remove your own access"
                              : ""
                          }
                        >
                          Remove access
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {removalTarget && (
          <div className="removal-panel">
            <h3>
              Remove{" "}
              {[removalTarget.user.firstName, removalTarget.user.lastName]
                .filter(Boolean)
                .join(" ") || removalTarget.user.email}
            </h3>
            <p className="muted">
              Add a short note so your audit trail explains why this employee no
              longer has access.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Contract ended on 30 Nov 2025."
              value={removalReason}
              onChange={(e) => {
                setRemovalReason(e.target.value);
                setRemovalError(null);
              }}
            />
            {removalError && (
              <Alert type="error" onClose={() => setRemovalError(null)}>
                {removalError}
              </Alert>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setRemovalTarget(null);
                  setRemovalReason("");
                  setRemovalError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button danger"
                onClick={handleRemoveStaff}
                disabled={removalSaving}
              >
                {removalSaving ? "Removing…" : "Confirm removal"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default StaffPage;
