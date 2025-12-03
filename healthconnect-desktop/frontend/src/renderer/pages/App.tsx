import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { bootstrapSession, logout } from "../store/slices/auth.slice";
import { registerStore } from "../services/apiClient";
import { store } from "../store/store";
import DashboardPage from "./DashboardPage";
import InventoryPage from "./InventoryPage";
import PrescriptionsPage from "./PrescriptionsPage";
import QueuePage from "./QueuePage";
import ServicesPage from "./ServicesPage";
import SalesPage from "./SalesPage";
import ReportsPage from "./ReportsPage";
import BackupPage from "./BackupPage";
import LoginPage from "./LoginPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import Layout from "../components/Layout";
import AdminOrganizationsPage from "./AdminOrganizationsPage";
import ActivityPage from "./ActivityPage";
import OrganizationSettingsPage from "./OrganizationSettingsPage";
import StaffPage from "./StaffPage";
import SplashScreen from "../components/SplashScreen";
import SessionTimeoutModal from "../components/SessionTimeoutModal";

// Auto-logout after 7 minutes of inactivity
const INACTIVITY_LIMIT_MS = 7 * 60 * 1000; // 7 minutes
const WARNING_DURATION_MS = 30 * 1000; // 30 seconds warning before logout

const App = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "super_admin";
  const isOrgAdmin = user?.role === "hospital_admin";
  const [showSplash, setShowSplash] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    WARNING_DURATION_MS / 1000
  );
  const warningTimeoutRef = useRef<number>();
  const logoutTimeoutRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();
  const lastResetRef = useRef<number>(0);

  useEffect(() => {
    // Register store with apiClient to avoid circular dependency
    registerStore(store);

    // In development, always start from a logged-out state
    // so restarting `npm run electron:dev` requires logging in again.
    const mode = (import.meta as any).env?.MODE ?? "production";
    if (mode === "development") {
      dispatch(logout());
    } else {
      dispatch(bootstrapSession());
    }
  }, [dispatch]);

  useEffect(() => {
    const root = document.documentElement;
    const settings = (user?.organization?.settings ?? {}) as Record<
      string,
      any
    >;
    const theme = (settings?.theme ?? {}) as Record<string, string>;
    const primary = (theme.primary as string) ?? "#3949ff";
    const accent = (theme.accent as string) ?? "#10b981";
    const brandBase = user?.organization?.brandColor ?? primary;

    const lighten = (hex: string, amount: number) => {
      const clamp = (value: number) => Math.max(0, Math.min(255, value));
      const parsed = hex.replace("#", "");
      const num = parseInt(parsed, 16);
      const r = clamp(((num >> 16) & 0xff) + amount);
      const g = clamp(((num >> 8) & 0xff) + amount);
      const b = clamp((num & 0xff) + amount);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    root.style.setProperty("--brand-500", primary);
    root.style.setProperty("--brand-600", lighten(primary, -20));
    root.style.setProperty("--brand-700", lighten(primary, -35));
    root.style.setProperty("--success-500", accent);
    root.style.setProperty("--brand-100", lighten(primary, 90));
    root.style.setProperty("--brand-900", lighten(brandBase, -60));
  }, [user?.organization]);

  const clearTimers = useCallback(() => {
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = undefined;
    }
    if (logoutTimeoutRef.current) {
      window.clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = undefined;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = undefined;
    }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    if (!isAuthenticated) {
      return;
    }

    const warningDelay = Math.max(INACTIVITY_LIMIT_MS - WARNING_DURATION_MS, 0);
    lastResetRef.current = Date.now();

    warningTimeoutRef.current = window.setTimeout(() => {
      setShowTimeoutWarning(true);
      setSecondsRemaining(WARNING_DURATION_MS / 1000);
      countdownIntervalRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              window.clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = undefined;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningDelay);

    logoutTimeoutRef.current = window.setTimeout(() => {
      clearTimers();
      setShowTimeoutWarning(false);
      dispatch(logout());
    }, INACTIVITY_LIMIT_MS);
  }, [clearTimers, dispatch, isAuthenticated]);

  const resetInactivityTimers = useCallback(() => {
    setShowTimeoutWarning(false);
    startTimers();
    lastResetRef.current = Date.now();
  }, [startTimers]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      setShowTimeoutWarning(false);
      return;
    }

    const handleActivity = () => {
      const now = Date.now();
      const throttleWindow = showTimeoutWarning ? 0 : 5000;
      if (now - lastResetRef.current < throttleWindow) {
        return;
      }
      resetInactivityTimers();
    };

    startTimers();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keypress", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      clearTimers();
    };
  }, [
    clearTimers,
    isAuthenticated,
    resetInactivityTimers,
    showTimeoutWarning,
    startTimers,
  ]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          {!isSuperAdmin && (
            <>
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/prescriptions" element={<PrescriptionsPage />} />
              <Route path="/queue" element={<QueuePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/backups" element={<BackupPage />} />
              <Route path="/staff" element={<StaffPage />} />
            </>
          )}
          {isSuperAdmin && (
            <Route
              path="/admin/organizations"
              element={<AdminOrganizationsPage />}
            />
          )}
          {isOrgAdmin && (
            <Route
              path="/settings/organization"
              element={<OrganizationSettingsPage />}
            />
          )}
          {(isOrgAdmin || isSuperAdmin) && (
            <Route path="/activity" element={<ActivityPage />} />
          )}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
      <SessionTimeoutModal
        isOpen={showTimeoutWarning}
        secondsRemaining={secondsRemaining}
        onStaySignedIn={resetInactivityTimers}
        onSignOut={() => {
          clearTimers();
          dispatch(logout());
        }}
      />
    </>
  );
};

export default App;
