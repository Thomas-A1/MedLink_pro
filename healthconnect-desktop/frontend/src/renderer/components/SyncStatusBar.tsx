import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { processSyncQueue } from "../store/slices/sync.slice";
import { fetchInventory } from "../store/slices/inventory.slice";

const SyncStatusBar = () => {
  const dispatch = useAppDispatch();
  const { pendingJobs, processing, lastSyncedAt, error } = useAppSelector(
    (state) => state.sync
  );
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const isOffline =
    typeof navigator !== "undefined" ? !navigator.onLine : false;

  const showBar = useMemo(() => {
    if (isOffline) return true;
    if (pendingJobs > 0 || processing || error) return true;
    return false;
  }, [isOffline, pendingJobs, processing, error]);

  if (!showBar) {
    return null;
  }

  return (
    <div className={`sync-status-bar ${isOffline ? "offline" : "online"}`}>
      <div>
        <strong>
          {isOffline
            ? "Offline mode: changes will sync automatically"
            : processing
            ? "Syncing pending changes…"
            : pendingJobs > 0
            ? `${pendingJobs} pending change${pendingJobs === 1 ? "" : "s"}`
            : "All caught up"}
        </strong>
        <small>
          {lastSyncedAt
            ? `Last sync ${new Date(lastSyncedAt).toLocaleTimeString()}`
            : "No sync completed yet"}
        </small>
        {error && <p className="error">{error}</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          if (!activePharmacyId) return;
          dispatch(processSyncQueue())
            .unwrap()
            .then((result) => {
              if (result.processed > 0) {
                dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
              }
            })
            .catch(() => undefined);
        }}
        disabled={processing || !activePharmacyId || pendingJobs === 0}
      >
        {processing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
};

export default SyncStatusBar;
