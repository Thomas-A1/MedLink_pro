import {
  InventoryListItem,
  StockMovementEntry,
} from "../../services/inventory.service";

interface StockMovementsPanelProps {
  item: InventoryListItem | null;
  movements: StockMovementEntry[] | undefined;
  loading: boolean;
  onRefresh: () => void;
  isOffline: boolean;
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const movementLabel = (type: StockMovementEntry["movementType"]) => {
  switch (type) {
    case "restock":
      return "Restock";
    case "sale":
      return "Sale / Dispensed";
    case "return":
      return "Return";
    case "adjustment":
      return "Adjustment";
    case "expired":
      return "Expired";
    case "damaged":
      return "Damaged";
    case "transfer_in":
      return "Transfer in";
    case "transfer_out":
      return "Transfer out";
    default:
      return type;
  }
};

const StockMovementsPanel = ({
  item,
  movements,
  loading,
  onRefresh,
  isOffline,
}: StockMovementsPanelProps) => {
  if (!item) {
    return (
      <aside className="movements-panel empty">
        <p>Select an item to review recent stock movements.</p>
      </aside>
    );
  }

  const hasMovements = (movements?.length ?? 0) > 0;

  return (
    <aside className="movements-panel">
      <div className="movements-header">
        <div>
          <h2>{item.name}</h2>
          <p>
            Balance: <strong>{item.quantityInStock}</strong> • Reorder level:{" "}
            {item.reorderLevel}
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={onRefresh}
          disabled={loading || isOffline}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {!isOffline && !hasMovements && !loading && (
        <div className="movements-empty">
          <p>No recorded movements yet.</p>
          <p className="muted">
            Adjust stock or restock to begin the audit trail.
          </p>
        </div>
      )}

      {isOffline && !hasMovements && (
        <div className="movements-empty">
          <p>Stock movements unavailable offline.</p>
          <p className="muted">Reconnect to sync the latest audit trail.</p>
        </div>
      )}

      <ul className="movements-list">
        {movements?.map((movement) => (
          <li key={movement.id} className="movement-item">
            <div className="movement-meta">
              <span
                className={`movement-tag movement-${movement.movementType}`}
              >
                {movementLabel(movement.movementType)}
              </span>
              <span className="movement-date">
                {formatDateTime(movement.createdAt)}
              </span>
            </div>
            <div className="movement-body">
              <p className="movement-quantity">
                {movement.quantity > 0 ? "+" : ""}
                {movement.quantity} units
              </p>
              <p className="movement-balance">
                Balance after: {movement.balanceAfter}
              </p>
              {movement.notes && (
                <p className="movement-notes">{movement.notes}</p>
              )}
            </div>
            {movement.createdBy && (
              <p className="movement-user">
                by {movement.createdBy.firstName ?? ""}{" "}
                {movement.createdBy.lastName ?? ""} ({movement.createdBy.email})
              </p>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default StockMovementsPanel;
