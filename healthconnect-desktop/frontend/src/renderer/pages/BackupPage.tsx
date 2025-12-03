import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../store/hooks";
import Alert from "../components/Alert";
import { backupsService, BackupRecord } from "../services/backups.service";
import { parseApiError } from "../utils/errors";

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const BackupPage = () => {
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!activePharmacyId) return;
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await backupsService.list(activePharmacyId);
        if (isMounted) {
          setBackups(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(parseApiError(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [activePharmacyId]);

  const lastBackup = useMemo(() => backups.at(0)?.createdAt ?? null, [backups]);

  const handleCreateBackup = async () => {
    if (!activePharmacyId) return;
    setCreating(true);
    setBanner(null);
    try {
      await backupsService.create(activePharmacyId);
      setBanner("Backup completed successfully.");
      const data = await backupsService.list(activePharmacyId);
      setBackups(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backupId: string) => {
    if (!activePharmacyId) return;
    try {
      const response = await backupsService.download(
        activePharmacyId,
        backupId
      );
      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers["content-disposition"];
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      link.href = url;
      link.download = filenameMatch?.[1] ?? `backup-${backupId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!activePharmacyId) return;
    try {
      const res = await backupsService.restore(activePharmacyId, backupId);
      setBanner(res.message);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!activePharmacyId) return;
    if (
      !confirm(
        "Are you sure you want to delete this backup? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await backupsService.delete(activePharmacyId, backupId);
      setBanner("Backup deleted successfully.");
      const data = await backupsService.list(activePharmacyId);
      setBackups(data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="page backup-page">
      <div className="page-header">
        <div>
          <h1>Backup & Restore</h1>
          <p className="subtitle">
            Keep your pharmacy data safe with on-demand backups and simple
            restore workflows.
          </p>
        </div>
        <div className="backup-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleCreateBackup}
            disabled={!activePharmacyId || creating}
          >
            {creating ? "Creating…" : "Run manual backup"}
          </button>
        </div>
      </div>

      {banner && (
        <Alert type="success" onClose={() => setBanner(null)}>
          {banner}
        </Alert>
      )}
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="backup-summary">
        <div className="summary-card">
          <span>Last backup</span>
          <strong>
            {lastBackup
              ? new Date(lastBackup).toLocaleString()
              : "No backups yet"}
          </strong>
        </div>
        <div className="summary-card">
          <span>Total stored backups</span>
          <strong>{backups.length}</strong>
        </div>
        <div className="summary-card">
          <span>Storage location</span>
          <strong>Secure local vault</strong>
          <small>Encrypted JSON snapshots</small>
        </div>
      </div>

      <div className="backup-table-wrapper">
        {loading && <p>Loading backups…</p>}
        {!loading && !backups.length && (
          <div className="backup-empty">
            <span role="img" aria-label="Safe">
              🔐
            </span>
            <p>No backups yet.</p>
            <small>Run your first backup to start the archive.</small>
          </div>
        )}
        {!loading && backups.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Type</th>
                <th>Size</th>
                <th>Checksum</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td>{new Date(backup.createdAt).toLocaleString()}</td>
                  <td>{backup.type}</td>
                  <td>{formatBytes(backup.size)}</td>
                  <td>
                    <code>{backup.checksum?.slice(0, 12) ?? "—"}</code>
                  </td>
                  <td>
                    <div className="backup-row-actions">
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => handleDownload(backup.id)}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => handleRestore(backup.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="action-button danger"
                        onClick={() => handleDelete(backup.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BackupPage;
