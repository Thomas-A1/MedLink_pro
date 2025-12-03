import { FormEvent, useEffect, useState } from "react";
import Modal from "../Modal";
import {
  AdjustInventoryPayload,
  InventoryListItem,
  StockMovementType,
} from "../../services/inventory.service";

interface AdjustStockModalProps {
  isOpen: boolean;
  item: InventoryListItem | null;
  onClose: () => void;
  onSubmit: (payload: AdjustInventoryPayload) => Promise<void> | void;
}

const movementOptions: { label: string; value: StockMovementType }[] = [
  { label: "Restock", value: "restock" },
  { label: "Sale / Dispensed", value: "sale" },
  { label: "Return to stock", value: "return" },
  { label: "Adjustment", value: "adjustment" },
  { label: "Expired", value: "expired" },
  { label: "Damaged", value: "damaged" },
  { label: "Transfer out", value: "transfer_out" },
  { label: "Transfer in", value: "transfer_in" },
];

const AdjustStockModal = ({
  isOpen,
  item,
  onClose,
  onSubmit,
}: AdjustStockModalProps) => {
  const [quantityDelta, setQuantityDelta] = useState<number>(0);
  const [movementType, setMovementType] =
    useState<StockMovementType>("adjustment");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuantityDelta(0);
      setMovementType("adjustment");
      setNotes("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!item) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!quantityDelta || quantityDelta === 0) {
      setError("Enter a positive or negative quantity to adjust stock.");
      return;
    }
    try {
      setIsSubmitting(true);
      await onSubmit({
        quantityDelta,
        movementType,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust stock: ${item.name}`}
      width="520px"
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-summary">
          <p>
            Current balance: <strong>{item.quantityInStock}</strong> units
          </p>
          <p>Reorder level: {item.reorderLevel}</p>
        </div>

        <div className="form-field">
          <label htmlFor="adjust-quantity">Quantity delta *</label>
          <input
            id="adjust-quantity"
            type="number"
            value={quantityDelta}
            onChange={(event) => {
              setQuantityDelta(Number(event.target.value));
              setError(null);
            }}
            placeholder="e.g. -5 for dispensed, +20 for restock"
          />
          {error && <small className="input-error">{error}</small>}
        </div>

        <div className="form-field">
          <label htmlFor="adjust-type">Movement type *</label>
          <select
            id="adjust-type"
            value={movementType}
            onChange={(event) =>
              setMovementType(event.target.value as StockMovementType)
            }
          >
            {movementOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field wide">
          <label htmlFor="adjust-notes">Notes</label>
          <textarea
            id="adjust-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Optional: add context for this movement"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Recording…" : "Record movement"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AdjustStockModal;
