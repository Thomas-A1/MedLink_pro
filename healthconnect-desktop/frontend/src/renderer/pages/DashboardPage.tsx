import { useEffect, useState } from "react";
import { useAppSelector } from "../store/hooks";
import { salesService, LowStockItem } from "../services/sales.service";
import { prescriptionsService } from "../services/prescriptions.service";
import { queueService } from "../services/queue.service";
import { Link } from "react-router-dom";

const DashboardPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const isSuperAdmin = user?.role === "super_admin";
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin && activePharmacyId) {
      loadDashboardData();
    }
  }, [activePharmacyId, isSuperAdmin]);

  const loadDashboardData = async () => {
    if (!activePharmacyId) return;
    setLoading(true);
    try {
      const [lowStockData, prescriptionsData, queueData] = await Promise.all([
        salesService.getLowStockItems(activePharmacyId).catch(() => []),
        prescriptionsService.fetchOpen(activePharmacyId).catch(() => []),
        queueService.fetchQueue(activePharmacyId).catch(() => []),
      ]);
      setLowStockItems(lowStockData);
      setLowStockCount(lowStockData.length);
      setPrescriptionCount(prescriptionsData.length);
      setQueueCount(queueData.filter((q) => q.status === "pending").length);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (isSuperAdmin) {
    return (
      <div className="page">
        <h1>Super Admin Dashboard</h1>
        <p className="subtitle">
          Manage organizations and monitor system-wide activity.
        </p>
        <div className="card-grid">
          <Link to="/admin/organizations" className="card card-link">
            <h2>🏢 Organizations</h2>
            <p>Manage pharmacy and hospital organizations</p>
          </Link>
          <Link to="/activity" className="card card-link">
            <h2>📜 Activity Logs</h2>
            <p>View system-wide activity and audit trails</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Welcome back, {user?.firstName ?? "MedLink team"} 👋</h1>
      <p className="subtitle">
        Track patient fulfilment, inventory health, and operational performance
        from a single dashboard.
      </p>

      <div className="card-grid">
        <Link to="/prescriptions" className="card card-link">
          <p className="metric-label">Open Prescriptions</p>
          <p className="metric-value">{loading ? "—" : prescriptionCount}</p>
          <p className="meta">Awaiting fulfilment</p>
        </Link>
        <Link
          to="/inventory"
          className="card card-link"
          style={{
            borderColor: lowStockCount > 0 ? "var(--warning-500)" : undefined,
          }}
        >
          <p className="metric-label">Low Stock Alerts</p>
          <p
            className="metric-value"
            style={{
              color: lowStockCount > 0 ? "var(--warning-500)" : "inherit",
            }}
          >
            {loading ? "—" : lowStockCount}
          </p>
          <p className="meta">Items need restocking</p>
          {lowStockCount > 0 && lowStockItems.length > 0 && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              {lowStockItems.slice(0, 3).map((item) => (
                <div key={item.id}>
                  {item.name}: {item.quantityInStock} left
                </div>
              ))}
              {lowStockItems.length > 3 && (
                <div>+{lowStockItems.length - 3} more...</div>
              )}
            </div>
          )}
        </Link>
        <Link to="/queue" className="card card-link">
          <p className="metric-label">Patients in Queue</p>
          <p className="metric-value">{loading ? "—" : queueCount}</p>
          <p className="meta">Waiting for service</p>
        </Link>
      </div>

      <div
        style={{
          marginTop: "32px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link to="/prescriptions" className="primary-button">
          📝 View Prescriptions
        </Link>
        <Link
          to="/sales"
          className="primary-button"
          style={{ background: "var(--success-500)" }}
        >
          💰 Record Sale
        </Link>
        {lowStockCount > 0 && (
          <Link
            to="/inventory"
            className="primary-button"
            style={{ background: "var(--warning-500)" }}
          >
            ⚠️ Review Low Stock
          </Link>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
