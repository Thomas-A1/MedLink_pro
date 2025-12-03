import { useEffect, useState, useCallback } from "react";
import {
  activityService,
  ActivityLog,
  ActivityLogResponse,
} from "../services/activity.service";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { fetchOrganizations } from "../store/slices/organizations.slice";
import { fetchMyPharmacies } from "../store/slices/pharmacies.slice";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";

const resourceLabels: Record<string, string> = {
  inventory_item: "Inventory item",
  stock_movement: "Stock movement",
  prescription: "Prescription",
  queue_entry: "Queue entry",
  organization: "Organization",
  pharmacy: "Pharmacy",
  auth: "Authentication",
  sale: "Sale",
  report: "Report",
  backup: "Backup",
  integration: "Integration",
};

const actionOptions = [
  { value: "", label: "All actions" },
  { value: "auth", label: "Authentication" },
  { value: "inventory", label: "Inventory" },
  { value: "sale", label: "Sales" },
  { value: "prescription", label: "Prescriptions" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "organization", label: "Organization" },
];

const ActivityPage = () => {
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const { items: organizations } = useAppSelector(
    (state) => state.organizations
  );
  const { items: pharmacies } = useAppSelector((state) => state.pharmacies);
  const [response, setResponse] = useState<ActivityLogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const isSuperAdmin = user?.role === "super_admin";

  // Filters
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resourceType, setResourceType] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [pharmacyId, setPharmacyId] = useState<string>("");
  const [q, setQ] = useState("");

  // Load organizations and pharmacies for super admin
  useEffect(() => {
    if (isSuperAdmin && organizations.length === 0) {
      dispatch(fetchOrganizations());
    }
    dispatch(fetchMyPharmacies());
  }, [isSuperAdmin, organizations.length, dispatch]);

  // Set default organization for super admin
  useEffect(() => {
    if (isSuperAdmin && !selectedOrgId && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    } else if (!isSuperAdmin && user?.organization?.id && !selectedOrgId) {
      setSelectedOrgId(user.organization.id);
    }
  }, [isSuperAdmin, selectedOrgId, organizations, user]);

  // Load activity logs
  const loadLogs = useCallback(async () => {
      const currentToken = accessToken || localStorage.getItem("accessToken");
      if (!currentToken) {
        setError(
          "Your session has expired. Please refresh the page and log in again."
        );
        return;
      }

      if (isSuperAdmin && !selectedOrgId) {
        return;
      }

      if (!isSuperAdmin && !user?.organization?.id) {
        setError("No organization found. Please contact support.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const organizationId = selectedOrgId || user?.organization?.id || null;
        if (!organizationId) {
          setError("No organization selected.");
          setLoading(false);
          return;
        }

        const data = await activityService.list({
          organizationId,
          limit: 50,
        page,
        actorEmail: actorEmail.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        resourceType: resourceType || undefined,
        action: action || undefined,
        pharmacyId: pharmacyId || undefined,
        q: q.trim() || undefined,
      });
      setResponse(data);
      } catch (err: any) {
        setError(parseApiError(err));
      } finally {
        setLoading(false);
      }
  }, [
    selectedOrgId,
    user,
    isSuperAdmin,
    accessToken,
    page,
    actorEmail,
    from,
    to,
    resourceType,
    action,
    pharmacyId,
    q,
  ]);

  useEffect(() => {
    if (selectedOrgId || (!isSuperAdmin && user?.organization?.id)) {
      loadLogs();
    }
  }, [loadLogs, selectedOrgId, isSuperAdmin, user?.organization?.id]);

  const handleApplyFilters = () => {
    setPage(1);
    loadLogs();
  };

  const handleClearFilters = () => {
    setActorEmail("");
    setFrom("");
    setTo("");
    setResourceType("");
    setAction("");
    setPharmacyId("");
    setQ("");
    setPage(1);
  };

  const logs = response?.items ?? [];
  const totalPages = response?.totalPages ?? 0;
  const currentPage = response?.page ?? 1;
  const total = response?.total ?? 0;

  return (
    <div
      className="page activity-page"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <h1>Activity log</h1>
          <p className="subtitle">
            Track who performed key actions across your MedLink workspace.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {isSuperAdmin && organizations.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                htmlFor="org-select"
                style={{
                  fontSize: "0.9rem",
                  color: "var(--slate-600)",
                  fontWeight: 600,
                }}
              >
                Organization:
              </label>
              <select
                id="org-select"
                value={selectedOrgId || ""}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value || null);
                  setPage(1);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(148, 163, 184, 0.35)",
                  fontSize: "0.9rem",
                  background: "rgba(255, 255, 255, 0.95)",
                  cursor: "pointer",
                  minWidth: "200px",
                }}
              >
                <option value="">Select organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="muted">
            Viewing as <strong>{user?.email}</strong>
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          gap: "16px",
        }}
      >
        <div
          className="activity-filters"
          style={{
            flexShrink: 0,
            padding: "16px",
            background: "#fff",
            borderRadius: "12px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--slate-600)",
                fontWeight: 600,
              }}
            >
              Employee email
            </label>
            <input
              type="email"
              placeholder="Filter by email"
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1.5px solid rgba(148,163,184,0.35)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--slate-600)",
                fontWeight: 600,
              }}
            >
              From date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1.5px solid rgba(148,163,184,0.35)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--slate-600)",
                fontWeight: 600,
              }}
            >
              To date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1.5px solid rgba(148,163,184,0.35)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--slate-600)",
                fontWeight: 600,
              }}
            >
              Resource type
            </label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1.5px solid rgba(148,163,184,0.35)",
                fontSize: "0.9rem",
                minWidth: "150px",
              }}
            >
              <option value="">All resources</option>
              {Object.keys(resourceLabels).map((key) => (
                <option key={key} value={key}>
                  {resourceLabels[key]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--slate-600)",
                fontWeight: 600,
              }}
            >
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1.5px solid rgba(148,163,184,0.35)",
                fontSize: "0.9rem",
                minWidth: "150px",
              }}
            >
              {actionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {pharmacies.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <label
                style={{
                  fontSize: "0.85rem",
                  color: "var(--slate-600)",
                  fontWeight: 600,
                }}
              >
                Pharmacy
              </label>
              <select
                value={pharmacyId}
                onChange={(e) => setPharmacyId(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1.5px solid rgba(148,163,184,0.35)",
                  fontSize: "0.9rem",
                  minWidth: "180px",
                }}
              >
                <option value="">All pharmacies</option>
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--slate-600)",
                fontWeight: 600,
              }}
            >
              Search
            </label>
            <input
              type="search"
              placeholder="Search action or details"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1.5px solid rgba(148,163,184,0.35)",
                fontSize: "0.9rem",
                minWidth: 220,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="primary-button"
              onClick={handleApplyFilters}
            >
              Apply
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleClearFilters}
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table
                className="table activity-table"
                style={{ minWidth: "1000px" }}
              >
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Resource</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", padding: "40px" }}
                      >
                        Loading recent activity…
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", padding: "40px" }}
                      >
                        {isSuperAdmin && !selectedOrgId
                          ? "Select an organization to view activity logs."
                          : "No activity recorded for the selected filters."}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>
                  <strong>{log.action}</strong>
                </td>
                <td>
                  {log.actor ? (
                    <>
                      <strong>
                                {[
                                  log.actor.firstName ?? "",
                                  log.actor.lastName ?? "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                      </strong>
                      <div className="prescription-meta">
                        <small>{log.actor.email}</small>
                      </div>
                    </>
                  ) : (
                    <span className="muted">System</span>
                  )}
                </td>
                <td>
                  <div className="prescription-meta">
                    <strong>
                              {resourceLabels[log.resourceType] ??
                                log.resourceType}
                    </strong>
                            {log.resourceId && (
                              <small>ID: {log.resourceId}</small>
                            )}
                  </div>
                </td>
                <td>
                  <pre className="activity-metadata">
                    {JSON.stringify(log.metadata ?? {}, null, 2)}
                  </pre>
                </td>
              </tr>
                    ))
                  )}
          </tbody>
        </table>
            </div>
          </div>

          {!loading && total > 0 && (
            <div
              style={{
                flexShrink: 0,
                padding: "16px",
                borderTop: "1px solid rgba(148,163,184,0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: "0.9rem", color: "var(--slate-600)" }}>
                Showing {(currentPage - 1) * 50 + 1} to{" "}
                {Math.min(currentPage * 50, total)} of {total} entries
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span style={{ fontSize: "0.9rem", color: "var(--slate-600)" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
