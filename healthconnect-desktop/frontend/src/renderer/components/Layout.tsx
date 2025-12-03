import { ReactNode, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/slices/auth.slice";
import {
  fetchMyPharmacies,
  setActivePharmacy,
} from "../store/slices/pharmacies.slice";
import { fetchInventory } from "../store/slices/inventory.slice";
import SyncStatusBar from "./SyncStatusBar";
import { loadSyncJobs, processSyncQueue } from "../store/slices/sync.slice";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const {
    items: pharmacies,
    activePharmacyId,
    loading,
  } = useAppSelector((state) => state.pharmacies);

  const isSuperAdmin = user?.role === "super_admin";
  const isOrgAdmin = user?.role === "hospital_admin";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!pharmacies.length && !loading) {
      dispatch(fetchMyPharmacies());
    }
  }, [dispatch, pharmacies.length, loading]);

  useEffect(() => {
    dispatch(loadSyncJobs());
  }, [dispatch]);

  useEffect(() => {
    const handleOnline = () => {
      if (!activePharmacyId) return;
      dispatch(processSyncQueue())
        .unwrap()
        .then((result) => {
          if (result.processed > 0) {
            dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
          }
        })
        .catch(() => undefined);
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [dispatch, activePharmacyId]);

  const handlePharmacyChange = (value: string) => {
    dispatch(setActivePharmacy(value));
  };

  const activePharmacy = pharmacies.find(
    (pharmacy) => pharmacy.id === activePharmacyId
  );
  const myRole = activePharmacy?.staff?.[0]?.role ?? user?.role ?? "pharmacist";
  const orgType = user?.organization?.type ?? "pharmacy";

  const roleLabel = (() => {
    if (user?.role === "super_admin") {
      return "Super Admin";
    }
    if (user?.role === "hospital_admin") {
      return orgType === "hospital" ? "Hospital Admin" : "Pharmacy Admin";
    }
    const orgName = user?.organization?.name ?? "Organization";
    return `${orgName} employee`;
  })();

  const navItems = isSuperAdmin
    ? [
        { to: "/dashboard", label: "Dashboard", emoji: "📊" },
        { to: "/admin/organizations", label: "Organizations", emoji: "🏢" },
        { to: "/activity", label: "Activity", emoji: "📜" },
      ]
    : [
        { to: "/dashboard", label: "Dashboard", emoji: "📊" },
        { to: "/inventory", label: "Inventory", emoji: "💊" },
        { to: "/prescriptions", label: "Prescriptions", emoji: "📝" },
        { to: "/queue", label: "Queue", emoji: "⏱️" },
        { to: "/sales", label: "Sales", emoji: "💰" },
        { to: "/reports", label: "Reports", emoji: "📈" },
        { to: "/services", label: "Services", emoji: "🔬" },
        ...(isOrgAdmin ? [{ to: "/staff", label: "Staff", emoji: "👥" }] : []),
        ...(isOrgAdmin
          ? [{ to: "/backups", label: "Backups", emoji: "💾" }]
          : []),
        ...(isOrgAdmin
          ? [{ to: "/settings/organization", label: "Settings", emoji: "⚙️" }]
          : []),
        ...(isOrgAdmin
          ? [{ to: "/activity", label: "Activity", emoji: "📜" }]
          : []),
      ];

  return (
    <div className="layout">
      <aside className={`sidebar ${!isSidebarOpen ? "mobile-collapsed" : ""}`}>
        <div className="brand">
          <img src="/medlink-logo.svg" alt="MedLink" />
          MedLink
        </div>

        <div className="sidebar-block">
          {user?.organization && (
            <div className="organization-summary">
              <span>Organization</span>
              <strong>{user.organization.name}</strong>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="pharmacy-selector">
              <label htmlFor="pharmacy-select">
                <span>Service location</span>
                <select
                  id="pharmacy-select"
                  value={activePharmacyId ?? ""}
                  onChange={(event) => handlePharmacyChange(event.target.value)}
                  disabled={loading || pharmacies.length === 0}
                >
                  {pharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </option>
                  ))}
                </select>
              </label>
              {loading && <p className="pharmacy-hint">Loading locations…</p>}
              {!loading && pharmacies.length === 0 && (
                <p className="pharmacy-hint">
                  No locations yet. Create one from your admin console.
                </p>
              )}
            </div>
          )}
        </div>

        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span>{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <footer>
          <div>
            Signed in as
            <br />
            <strong>{user?.firstName ?? "MedLink User"}</strong>
            <p className="user-role">{roleLabel}</p>
          </div>
          <button onClick={() => dispatch(logout())}>Sign out</button>
        </footer>
      </aside>
      <main>
        <div className="mobile-nav-toggle-row">
          <button
            type="button"
            className="ghost-button mobile-nav-toggle"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            {isSidebarOpen ? "☰ Hide menu" : "☰ Show menu"}
          </button>
        </div>
        <SyncStatusBar />
        {children}
      </main>
    </div>
  );
};

export default Layout;
