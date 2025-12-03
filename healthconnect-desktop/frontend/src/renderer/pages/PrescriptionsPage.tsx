import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  assignPrescriptionByCode,
  fetchOpenPrescriptions,
  fulfilPrescription,
  PrescriptionSummary,
  PrescriptionStatus,
  updatePrescriptionStatus,
} from "../store/slices/prescriptions.slice";
import { fetchInventory } from "../store/slices/inventory.slice";
import FulfilPrescriptionModal from "../components/prescriptions/FulfilPrescriptionModal";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";
import { paymentsService } from "../services/payments.service";

const PrescriptionsPage = () => {
  const dispatch = useAppDispatch();
  const { open, loading, assignLoading, fulfilLoading, error } = useAppSelector(
    (state) => state.prescriptions
  );
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const currentUser = useAppSelector((state) => state.auth.user);

  const [verificationCode, setVerificationCode] = useState("");
  const [fulfilTarget, setFulfilTarget] = useState<PrescriptionSummary | null>(
    null
  );
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (activePharmacyId) {
      dispatch(fetchOpenPrescriptions({ pharmacyId: activePharmacyId }));
    }
  }, [dispatch, activePharmacyId]);

  const pendingCount = useMemo(
    () =>
      open.filter(
        (prescription) =>
          prescription.status !== "completed" &&
          prescription.status !== "cancelled"
      ).length,
    [open]
  );

  const handleAssign = async (event: FormEvent) => {
    event.preventDefault();
    if (!activePharmacyId || !verificationCode.trim()) {
      return;
    }
    await dispatch(
      assignPrescriptionByCode({
        pharmacyId: activePharmacyId,
        verificationCode: verificationCode.trim(),
      })
    )
      .unwrap()
      .catch(() => {});
    setVerificationCode("");
  };

  const handleStatusChange = async (
    prescription: PrescriptionSummary,
    status: PrescriptionStatus
  ) => {
    if (!activePharmacyId) return;
    const note =
      status === "ready"
        ? window.prompt("Optional: add pickup instructions", "") ?? undefined
        : undefined;
    await dispatch(
      updatePrescriptionStatus({
        pharmacyId: activePharmacyId,
        prescriptionId: prescription.id,
        status,
        notes: note,
      })
    ).unwrap();
  };

  const handleFulfil = async (payload: {
    medicationIds: string[];
    notes?: string;
  }) => {
    if (!activePharmacyId || !fulfilTarget || !currentUser) {
      return;
    }

    await dispatch(
      fulfilPrescription({
        pharmacyId: activePharmacyId,
        prescriptionId: fulfilTarget.id,
        payload: {
          dispensedMedications: payload.medicationIds,
          notes: payload.notes,
          pharmacistId: currentUser.id,
        },
      })
    ).unwrap();

    setFulfilTarget(null);
    dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
  };

  const handleRefresh = () => {
    if (activePharmacyId) {
      dispatch(fetchOpenPrescriptions({ pharmacyId: activePharmacyId }));
    }
  };

  const handlePayForPrescription = async (prescriptionId: string) => {
    if (!activePharmacyId) return;
    setPaying(prescriptionId);
    try {
      const res = await paymentsService.initiate(activePharmacyId, {
        purpose: "prescription",
        prescriptionId,
      });
      window.open(res.authorizationUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setPaying(null);
    }
  };

  if (!activePharmacyId && currentUser?.role !== "super_admin") {
    return (
      <div className="page prescriptions-page">
        <h1>Prescriptions</h1>
        <p className="muted">
          Select a service location to view and fulfil prescriptions.
        </p>
      </div>
    );
  }

  if (!activePharmacyId && currentUser?.role === "super_admin") {
    return (
      <div className="page prescriptions-page">
        <h1>Prescriptions</h1>
        <p className="muted">
          Super admins need to switch into a tenant to manage prescriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="page prescriptions-page">
      <div className="page-header">
        <div>
          <h1>Prescriptions</h1>
          <p className="subtitle">
            Claim incoming prescriptions, review directions, and fulfil them
            with a clear audit trail.
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={handleRefresh}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 8, margin: "8px" }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="prescription-overview">
        <div className="overview-card">
          <span>Awaiting fulfilment</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="overview-card accent">
          <span>Active pharmacy</span>
          <strong>{activePharmacyId ? "Ready" : "Select location"}</strong>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <section className="prescription-assign-card">
        <header>
          <h2>Assign prescription by code</h2>
          <p>
            Scan or type the verification code to pull the latest digital
            prescription into MedLink.
          </p>
        </header>
        <form onSubmit={handleAssign}>
          <input
            type="text"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
            placeholder="Enter verification code (e.g. RX-1001)"
            disabled={!activePharmacyId || assignLoading}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={
              !verificationCode.trim() || assignLoading || !activePharmacyId
            }
          >
            {assignLoading ? "Assigning…" : "Assign prescription"}
          </button>
        </form>
      </section>

      <div className="table-wrapper">
        <table className="table prescriptions-table">
          <thead>
            <tr>
              <th>Verification</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Medications</th>
              <th>Status</th>
              <th style={{ width: "220px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {open.map((prescription) => (
              <tr key={prescription.id}>
                <td>
                  <div className="prescription-code">
                    <strong>{prescription.verificationCode}</strong>
                    <span className="status-chip status-open">Open</span>
                  </div>
                </td>
                <td>
                  <div className="prescription-meta">
                    <strong>
                      {prescription.patient?.name ?? "Unknown patient"}
                    </strong>
                    <small>{prescription.patient?.email ?? "—"}</small>
                  </div>
                </td>
                <td>
                  <div className="prescription-meta">
                    <strong>
                      {prescription.doctor?.name ?? "Unknown prescriber"}
                    </strong>
                    <small>{prescription.doctor?.email ?? "—"}</small>
                  </div>
                </td>
                <td>
                  <ul className="prescription-medications">
                    {prescription.medications.map((medication) => (
                      <li key={medication.id}>
                        <strong>{medication.drugName}</strong>
                        <small>
                          {medication.dosage} • {medication.frequency} •{" "}
                          {medication.duration}
                        </small>
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <div className="status-block">
                    <span
                      className={`status-chip status-${prescription.status}`}
                    >
                      {statusLabel(prescription.status)}
                    </span>
                    <small>
                      Created{" "}
                      {new Date(prescription.createdAt).toLocaleString()}
                    </small>
                    {prescription.readyAt && (
                      <small>
                        Ready since{" "}
                        {new Date(prescription.readyAt).toLocaleString()}
                      </small>
                    )}
                    {prescription.statusNotes && (
                      <p className="muted">{prescription.statusNotes}</p>
                    )}
                    {!!prescription.substitutions?.length && (
                      <p className="muted">
                        {prescription.substitutions.length} substitution
                        {prescription.substitutions.length === 1
                          ? ""
                          : "s"}{" "}
                        recorded
                      </p>
                    )}
                  </div>
                </td>
                <td>
                  <div className="table-actions">
                    {prescription.status === "received" && (
                      <button
                        type="button"
                        className="action-button"
                        onClick={() =>
                          handleStatusChange(prescription, "preparing")
                        }
                      >
                        Start preparing
                      </button>
                    )}
                    {prescription.status === "preparing" && (
                      <button
                        type="button"
                        className="action-button"
                        onClick={() =>
                          handleStatusChange(prescription, "ready")
                        }
                      >
                        Mark ready
                      </button>
                    )}
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setFulfilTarget(prescription)}
                      style={{ padding: "8px 12px", borderRadius: 8 }}
                      disabled={prescription.status !== "ready"}
                    >
                      <span className="button-icon">✓</span>
                      Fulfil
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handlePayForPrescription(prescription.id)}
                      disabled={!!paying}
                      style={{ padding: "8px 12px", borderRadius: 8 }}
                    >
                      {paying === prescription.id
                        ? "Opening…"
                        : "Pay via Paystack"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!open.length && !loading && (
          <div className="inventory-empty">
            <span role="img" aria-label="Inbox">
              📭
            </span>
            <p>No prescriptions waiting right now.</p>
            <small>Assign a new verification code to begin fulfilment.</small>
          </div>
        )}
        {loading && (
          <p className="muted" style={{ padding: "16px" }}>
            Loading prescriptions…
          </p>
        )}
      </div>

      <FulfilPrescriptionModal
        isOpen={!!fulfilTarget}
        prescription={fulfilTarget}
        submitting={fulfilLoading}
        onClose={() => setFulfilTarget(null)}
        onSubmit={handleFulfil}
      />
    </div>
  );
};

export default PrescriptionsPage;

function statusLabel(status: PrescriptionStatus) {
  switch (status) {
    case "received":
      return "Received";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready for pickup";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
