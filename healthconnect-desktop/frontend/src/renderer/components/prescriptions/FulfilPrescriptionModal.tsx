import { FormEvent, useEffect, useState } from "react";
import Modal from "../Modal";
import { PrescriptionSummary } from "../../store/slices/prescriptions.slice";

interface FulfilPrescriptionModalProps {
  isOpen: boolean;
  prescription: PrescriptionSummary | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    medicationIds: string[];
    notes?: string;
    pickupNotes?: string;
    pickupContact?: string;
    substitutions?: Array<{
      medicationId: string;
      substituteDrugName: string;
      reason?: string;
    }>;
  }) => Promise<void> | void;
}

const FulfilPrescriptionModal = ({
  isOpen,
  prescription,
  submitting,
  onClose,
  onSubmit,
}: FulfilPrescriptionModalProps) => {
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<string[]>(
    []
  );
  const [notes, setNotes] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [pickupContact, setPickupContact] = useState("");
  const [substitutions, setSubstitutions] = useState<
    Record<string, { substituteDrugName: string; reason?: string }>
  >({});

  useEffect(() => {
    if (!isOpen || !prescription) {
      return;
    }
    setSelectedMedicationIds(prescription.medications.map((med) => med.id));
    setNotes("");
    setPickupNotes("");
    setPickupContact("");
    setSubstitutions({});
  }, [isOpen, prescription]);

  if (!prescription) {
    return null;
  }

  const handleToggleMedication = (medicationId: string) => {
    setSelectedMedicationIds((current) =>
      current.includes(medicationId)
        ? current.filter((id) => id !== medicationId)
        : [...current, medicationId]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      medicationIds: selectedMedicationIds,
      notes: notes.trim() || undefined,
      pickupNotes: pickupNotes.trim() || undefined,
      pickupContact: pickupContact.trim() || undefined,
      substitutions: Object.entries(substitutions)
        .filter(([, value]) => value.substituteDrugName.trim().length > 0)
        .map(([medicationId, value]) => ({
          medicationId,
          substituteDrugName: value.substituteDrugName.trim(),
          reason: value.reason?.trim() || undefined,
        })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Fulfil prescription ${prescription.verificationCode}`}
      width="720px"
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-summary">
          <div>
            <strong>Patient:</strong>{" "}
            {prescription.patient?.name ?? "Unknown patient"}
          </div>
          <div>
            <strong>Doctor:</strong>{" "}
            {prescription.doctor?.name ?? "Unknown doctor"}
          </div>
          <div>
            <strong>Created:</strong>{" "}
            {new Date(prescription.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="form-field wide">
          <span className="field-label">Select medications to dispense</span>
          <div className="medication-checklist">
            {prescription.medications.map((medication) => {
              const checked = selectedMedicationIds.includes(medication.id);
              return (
                <label key={medication.id} className="medication-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleMedication(medication.id)}
                  />
                  <div>
                    <strong>{medication.drugName}</strong>
                    <small>
                      {medication.strength} • {medication.dosage} •{" "}
                      {medication.frequency} • {medication.duration}
                    </small>
                    {medication.instructions && (
                      <small>{medication.instructions}</small>
                    )}
                  </div>
                </label>
              );
            })}
            {!prescription.medications.length && (
              <p className="muted">
                This prescription does not contain any medications yet.
              </p>
            )}
          </div>
        </div>

        {prescription.medications.length > 0 && (
          <div className="form-field wide">
            <span className="field-label">Record substitutions (optional)</span>
            <div className="substitution-grid">
              {prescription.medications.map((medication) => (
                <div key={medication.id} className="substitution-row">
                  <div className="substitution-drug">
                    <strong>{medication.drugName}</strong>
                    <small>
                      {medication.strength} • {medication.dosage}
                    </small>
                  </div>
                  <input
                    type="text"
                    placeholder="Substitute drug name"
                    value={
                      substitutions[medication.id]?.substituteDrugName ?? ""
                    }
                    onChange={(event) =>
                      setSubstitutions((prev) => ({
                        ...prev,
                        [medication.id]: {
                          substituteDrugName: event.target.value,
                          reason: prev[medication.id]?.reason,
                        },
                      }))
                    }
                  />
                  <input
                    type="text"
                    placeholder="Reason / note"
                    value={substitutions[medication.id]?.reason ?? ""}
                    onChange={(event) =>
                      setSubstitutions((prev) => ({
                        ...prev,
                        [medication.id]: {
                          substituteDrugName:
                            prev[medication.id]?.substituteDrugName ?? "",
                          reason: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-field wide">
          <label htmlFor="fulfil-notes">Dispensing notes</label>
          <textarea
            id="fulfil-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional: capture counselling or substitution notes"
          />
        </div>

        <div className="form-field">
          <label htmlFor="pickup-contact">Pickup contact</label>
          <input
            id="pickup-contact"
            value={pickupContact}
            onChange={(event) => setPickupContact(event.target.value)}
            placeholder="Phone or reference contact"
          />
        </div>
        <div className="form-field">
          <label htmlFor="pickup-notes">Pickup notes</label>
          <input
            id="pickup-notes"
            value={pickupNotes}
            onChange={(event) => setPickupNotes(event.target.value)}
            placeholder="Optional: courier or pickup instructions"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Complete fulfilment"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FulfilPrescriptionModal;
