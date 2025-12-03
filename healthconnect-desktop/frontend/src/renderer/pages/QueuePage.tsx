import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  enqueueQueueEntry,
  fetchQueue,
  QueueEntry,
  QueueStatus,
  updateQueueStatus,
  setQueueEntries,
} from "../store/slices/queue.slice";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";

const statusLabels: Record<QueueStatus, string> = {
  pending: "Waiting",
  active: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  skipped: "Skipped",
};

const QueuePage = () => {
  const dispatch = useAppDispatch();
  const { entries, loading, updating, error } = useAppSelector(
    (state) => state.queue
  );
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);

  const [patientEmail, setPatientEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!activePharmacyId) {
      return;
    }
    dispatch(fetchQueue(activePharmacyId));
  }, [dispatch, activePharmacyId]);

  useEffect(() => {
    if (!activePharmacyId || !accessToken) {
      return;
    }

    const apiBase =
      (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
      "http://localhost:4000/api";
    const socketUrl = apiBase.replace(/\/api\/?$/, "");

    const socket = io(`${socketUrl}/queue`, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    socket.on("connect", () => {
      socket.emit("queue.subscribe", { pharmacyId: activePharmacyId });
    });

    socket.on("queue.updated", (payload: QueueEntry[]) => {
      dispatch(setQueueEntries(payload));
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activePharmacyId, accessToken, dispatch]);

  const pending = useMemo(
    () => entries.filter((entry) => entry.status === "pending"),
    [entries]
  );
  const active = useMemo(
    () => entries.filter((entry) => entry.status === "active"),
    [entries]
  );

  const handleEnqueue = async (event: FormEvent) => {
    event.preventDefault();
    if (!activePharmacyId || (!patientEmail.trim() && !patientName.trim())) {
      return;
    }
    await dispatch(
      enqueueQueueEntry({
        pharmacyId: activePharmacyId,
        payload: {
          patientEmail: patientEmail.trim() || undefined,
          patientName: patientName.trim() || undefined,
        },
      })
    ).unwrap();
    setPatientEmail("");
    setPatientName("");
  };

  const handleUpdateStatus = async (entry: QueueEntry, status: QueueStatus) => {
    if (!activePharmacyId) {
      return;
    }
    await dispatch(
      updateQueueStatus({
        pharmacyId: activePharmacyId,
        entryId: entry.id,
        status,
      })
    ).unwrap();
  };

  const recentActivity = useMemo(
    () =>
      [...entries]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 6),
    [entries]
  );

  if (!activePharmacyId && user?.role !== "super_admin") {
    return (
      <div className="page">
        <h1>Patient Queue</h1>
        <p className="muted">
          Select a service location to view or manage its patient queue.
        </p>
      </div>
    );
  }

  if (!activePharmacyId && user?.role === "super_admin") {
    return (
      <div className="page">
        <h1>Patient Queue</h1>
        <p className="muted">
          Super admins do not have a default service location. Switch into an
          organization to manage its queue.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Patient Queue</h1>
          <p className="subtitle">
            Monitor live wait times, acknowledge patients, and keep your
            dispensary flowing smoothly.
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            activePharmacyId && dispatch(fetchQueue(activePharmacyId))
          }
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 8, margin: "8px" }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="queue-stats">
        <div className="overview-card warning">
          <span>Waiting</span>
          <strong>{pending.length}</strong>
        </div>
        <div className="overview-card accent">
          <span>In progress</span>
          <strong>{active.length}</strong>
        </div>
        <div className="overview-card">
          <span>Average wait (mins)</span>
          <strong>
            {entries.length
              ? Math.round(
                  entries.reduce(
                    (sum, entry) => sum + entry.waitTimeMinutes,
                    0
                  ) / entries.length
                )
              : 0}
          </strong>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="queue-board">
        <section className="queue-form">
          <header>
            <h2>Add patient to queue</h2>
            <p>
              Capture walk-ins by name or use their MedLink email to recognise
              returning patients.
            </p>
          </header>
          <form className="form-grid" onSubmit={handleEnqueue}>
            <div className="form-field">
              <label htmlFor="queue-name">Patient name</label>
              <input
                id="queue-name"
                placeholder="Ama Mensah"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="queue-email">Patient email</label>
              <input
                id="queue-email"
                placeholder="patient@email.com"
                type="email"
                value={patientEmail}
                onChange={(event) => setPatientEmail(event.target.value)}
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={updating || !activePharmacyId}
              >
                {updating ? "Adding…" : "Add to queue"}
              </button>
            </div>
          </form>

          <h2>Current queue</h2>
          {loading && <p className="muted">Loading queue…</p>}
          {!loading && !entries.length && (
            <div className="queue-empty">
              <span role="img" aria-label="Empty queue">
                ✅
              </span>
              <p>No patients waiting. Add a walk-in to start the queue.</p>
            </div>
          )}

          <ol className="queue">
            {entries.map((entry) => (
              <li key={entry.id} className="queue-item">
                <span className="badge">#{entry.priority}</span>
                <div className="queue-meta">
                  <strong>{entry.patient.name}</strong>
                  <small>{entry.patient.email}</small>
                  <small>Waiting {entry.waitTimeMinutes} min</small>
                  <span className={`queue-status ${entry.status}`}>
                    {statusLabels[entry.status]}
                  </span>
                </div>
                <div
                  className="queue-actions"
                  style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                >
                  {entry.status === "pending" && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleUpdateStatus(entry, "active")}
                      disabled={updating}
                      style={{ padding: "8px 12px", borderRadius: 8 }}
                    >
                      Start
                    </button>
                  )}
                  {entry.status === "active" && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => handleUpdateStatus(entry, "completed")}
                      disabled={updating}
                      style={{ padding: "8px 12px", borderRadius: 8 }}
                    >
                      <span className="button-icon">✓</span>
                      Complete
                    </button>
                  )}
                  {entry.status !== "cancelled" &&
                    entry.status !== "completed" && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleUpdateStatus(entry, "cancelled")}
                        disabled={updating}
                        style={{ padding: "8px 12px", borderRadius: 8 }}
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="queue-log">
          <h2>Recent activity</h2>
          <ul>
            {recentActivity.map((entry) => (
              <li key={entry.id}>
                <div>
                  <span>{entry.patient.name}</span>
                  <small>{statusLabels[entry.status]}</small>
                </div>
                <span>
                  {new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default QueuePage;
