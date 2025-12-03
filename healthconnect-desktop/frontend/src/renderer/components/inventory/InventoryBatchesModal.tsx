import { useEffect, useState } from "react";
import Modal from "../Modal";
import Alert from "../Alert";
import {
  inventoryService,
  InventoryBatch,
  InventoryListItem,
} from "../../services/inventory.service";

interface InventoryBatchesModalProps {
  pharmacyId: string;
  item: InventoryListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const InventoryBatchesModal = ({
  pharmacyId,
  item,
  isOpen,
  onClose,
}: InventoryBatchesModalProps) => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lotNumber, setLotNumber] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) {
      setBatches([]);
      setError(null);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await inventoryService.listBatches(pharmacyId, item.id);
        if (mounted) setBatches(data);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load batches."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, item, pharmacyId]);

  const handleAddBatch = async () => {
    if (!item) return;
    if (!lotNumber.trim() || quantity <= 0) {
      setError("Lot number and quantity are required.");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryService.addBatch(pharmacyId, item.id, {
        lotNumber: lotNumber.trim(),
        quantity,
        expiryDate: expiryDate || undefined,
      });
      const data = await inventoryService.listBatches(pharmacyId, item.id);
      setBatches(data);
      setLotNumber("");
      setQuantity(0);
      setExpiryDate("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add batch.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Batches · ${item.name}`}>
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <div className="batch-form">
        <input
          placeholder="Lot number"
          value={lotNumber}
          onChange={(e) => setLotNumber(e.target.value)}
        />
        <input
          type="number"
          min={1}
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
        <button
          type="button"
          className="primary-button"
          onClick={handleAddBatch}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add batch"}
        </button>
      </div>

      <div className="batch-list">
        {loading && <p>Loading batches…</p>}
        {!loading && !batches.length && (
          <p className="muted">No batches recorded yet.</p>
        )}
        {!loading &&
          batches.map((batch) => (
            <div key={batch.id} className="batch-card">
              <div>
                <strong>{batch.lotNumber}</strong>
                <small>
                  Qty {batch.quantity}{" "}
                  {batch.expiryDate && (
                    <>
                      · Expires{" "}
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </>
                  )}
                </small>
              </div>
              <span>
                Added {new Date(batch.createdAt).toLocaleDateString()}{" "}
                {new Date(batch.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
      </div>
    </Modal>
  );
};

export default InventoryBatchesModal;
