import { FormEvent, useEffect, useState } from "react";
import { useAppSelector } from "../store/hooks";
import {
  salesService,
  Sale,
  CreateSaleDto,
  SaleItemDto,
  LowStockItem,
} from "../services/sales.service";
import {
  inventoryService,
  InventoryListItem,
} from "../services/inventory.service";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";
import { paymentsService } from "../services/payments.service";
import { servicesService, PharmacyService } from "../services/services.service";

const SalesPage = () => {
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryListItem[]>([]);
  const [services, setServices] = useState<PharmacyService[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<CreateSaleDto>({
    items: [],
    customerName: "",
    customerPhone: "",
    currency: "GHS",
    paymentMethod: "cash",
    notes: "",
  });
  const [selectedItem, setSelectedItem] = useState<
    | {
        kind: "inventory";
        inventoryItemId: string;
        quantity: number;
        unitPrice?: number;
      }
    | {
        kind: "service";
        serviceId: string;
        quantity: number;
        unitPrice?: number;
      }
    | null
  >(null);

  useEffect(() => {
    if (activePharmacyId) {
      loadData();
    }
  }, [activePharmacyId]);

  const loadData = async () => {
    if (!activePharmacyId) return;
    setLoading(true);
    setError(null);
    try {
      const [salesData, inventoryData, lowStockData, servicesData] =
        await Promise.all([
          salesService.list(activePharmacyId),
          inventoryService.fetchInventory(activePharmacyId),
          salesService.getLowStockItems(activePharmacyId),
          servicesService.list(activePharmacyId),
        ]);
      setSales(salesData);
      setInventory(
        inventoryData.filter(
          (item) => item.isAvailable && item.quantityInStock > 0
        )
      );
      setLowStockItems(lowStockData);
      setServices(
        servicesData.filter((s) => s.isActive && s.price !== undefined)
      );
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedItem || selectedItem.quantity <= 0) {
      return;
    }

    let newItem: SaleItemDto | null = null;
    if (selectedItem.kind === "inventory") {
      const inventoryItem = inventory.find(
        (item) => item.id === selectedItem.inventoryItemId
      );
      if (!inventoryItem) return;
      if (selectedItem.quantity > inventoryItem.quantityInStock) {
        setError(
          `Insufficient stock. Available: ${inventoryItem.quantityInStock}`
        );
        return;
      }
      const unitPrice = selectedItem.unitPrice ?? inventoryItem.sellingPrice;
      newItem = {
        inventoryItemId: selectedItem.inventoryItemId,
        quantity: selectedItem.quantity,
        unitPrice,
      };
    } else {
      const service = services.find((s) => s.id === selectedItem.serviceId);
      if (!service) return;
      const unitPrice =
        selectedItem.unitPrice ??
        (typeof service.price === "number"
          ? service.price
          : parseFloat(String(service.price)));
      if (!Number.isFinite(unitPrice)) {
        setError("Invalid service price");
        return;
      }
      newItem = {
        serviceId: selectedItem.serviceId,
        quantity: selectedItem.quantity,
        unitPrice,
      };
    }

    setFormState({
      ...formState,
      items: [...formState.items, newItem],
    });
    setSelectedItem(null);
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setFormState({
      ...formState,
      items: formState.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activePharmacyId || formState.items.length === 0) return;

    setCreating(true);
    setError(null);
    try {
      await salesService.create(activePharmacyId, formState);
      setShowForm(false);
      setFormState({
        items: [],
        customerName: "",
        customerPhone: "",
        currency: "GHS",
        paymentMethod: "cash",
        notes: "",
      });
      await loadData();
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const handlePayWithPaystack = async () => {
    if (!activePharmacyId || formState.items.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      const inventoryItems = formState.items.filter((i) => i.inventoryItemId);
      const serviceItems = formState.items.filter((i) => i.serviceId);
      const res = await paymentsService.initiate(activePharmacyId, {
        purpose: "sale",
        items: inventoryItems.map((i) => ({
          inventoryItemId: i.inventoryItemId!,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        serviceItems: serviceItems.map((s) => ({
          serviceId: s.serviceId!,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
        })),
        customerEmail: formState.customerName
          ? `${formState.customerName
              .replace(/\s+/g, ".")
              .toLowerCase()}@example.com`
          : "customer@medlink.com",
        customerPhone: formState.customerPhone || undefined,
      });
      // Open Paystack checkout in external browser
      window.open(res.authorizationUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const calculateTotal = () => {
    return formState.items.reduce((sum, item) => {
      if (item.inventoryItemId) {
        const inventoryItem = inventory.find(
          (i) => i.id === item.inventoryItemId
        );
        const unitPrice = item.unitPrice ?? inventoryItem?.sellingPrice ?? 0;
        return sum + unitPrice * item.quantity;
      } else if (item.serviceId) {
        const service = services.find((s) => s.id === item.serviceId);
        const unitPrice =
          item.unitPrice ??
          (service
            ? typeof service.price === "number"
              ? service.price
              : parseFloat(String(service.price))
            : 0);
        return (
          sum + (Number.isFinite(unitPrice) ? unitPrice : 0) * item.quantity
        );
      }
      return sum;
    }, 0);
  };

  if (!activePharmacyId) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Please select a pharmacy location to manage sales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sales</h1>
          <p className="subtitle">
            Record drug sales and track inventory updates automatically.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          {showForm ? "✕ Cancel" : "+ New Sale"}
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="warning-banner" style={{ marginBottom: "24px" }}>
          <strong>⚠️ Low Stock Alert:</strong> {lowStockItems.length} item(s)
          need restocking.{" "}
          {lowStockItems.map((item) => (
            <span key={item.id}>
              {item.name} ({item.quantityInStock} remaining, reorder at{" "}
              {item.reorderLevel}),
            </span>
          ))}
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {showForm && (
        <section className="card" style={{ marginBottom: "24px" }}>
          <h2>Record New Sale</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-field wide">
              <label htmlFor="sale-customer-name">
                Customer Name (Optional)
              </label>
              <input
                id="sale-customer-name"
                value={formState.customerName}
                onChange={(e) =>
                  setFormState({ ...formState, customerName: e.target.value })
                }
                placeholder="Customer name"
              />
            </div>
            <div className="form-field">
              <label htmlFor="sale-customer-phone">
                Customer Phone (Optional)
              </label>
              <input
                id="sale-customer-phone"
                value={formState.customerPhone}
                onChange={(e) =>
                  setFormState({ ...formState, customerPhone: e.target.value })
                }
                placeholder="+233..."
              />
            </div>
            <div className="form-field">
              <label htmlFor="sale-payment-method">Payment Method</label>
              <select
                id="sale-payment-method"
                value={formState.paymentMethod}
                onChange={(e) =>
                  setFormState({ ...formState, paymentMethod: e.target.value })
                }
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="card">Card</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>

            <div className="form-field wide">
              <label>Add Items</label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={selectedItem?.kind ?? ""}
                  onChange={(e) => {
                    const kind = e.target.value as "inventory" | "service";
                    if (!kind) {
                      setSelectedItem(null);
                      return;
                    }
                    setSelectedItem(
                      kind === "inventory"
                        ? { kind, inventoryItemId: "", quantity: 1 }
                        : { kind, serviceId: "", quantity: 1 }
                    );
                  }}
                  style={{ width: "160px" }}
                >
                  <option value="">Select type…</option>
                  <option value="inventory">Product</option>
                  <option value="service">Service</option>
                </select>
                {selectedItem?.kind === "inventory" && (
                  <select
                    value={selectedItem.inventoryItemId ?? ""}
                    onChange={(e) =>
                      setSelectedItem({
                        kind: "inventory",
                        inventoryItemId: e.target.value,
                        quantity: selectedItem?.quantity ?? 1,
                        unitPrice: selectedItem?.unitPrice,
                      })
                    }
                    style={{ flex: 1, minWidth: "260px" }}
                  >
                    <option value="">Select product…</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantityInStock} in stock) - GHS{" "}
                        {item.sellingPrice.toFixed(2)}
                      </option>
                    ))}
                  </select>
                )}
                {selectedItem?.kind === "service" && (
                  <select
                    value={selectedItem.serviceId ?? ""}
                    onChange={(e) =>
                      setSelectedItem({
                        kind: "service",
                        serviceId: e.target.value,
                        quantity: selectedItem?.quantity ?? 1,
                        unitPrice: selectedItem?.unitPrice,
                      })
                    }
                    style={{ flex: 1, minWidth: "260px" }}
                  >
                    <option value="">Select service…</option>
                    {services.map((svc) => {
                      const price =
                        typeof svc.price === "number"
                          ? svc.price
                          : parseFloat(String(svc.price));
                      return (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} - {svc.currency ?? "GHS"}{" "}
                          {Number.isFinite(price) ? price.toFixed(2) : "N/A"}
                        </option>
                      );
                    })}
                  </select>
                )}
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={selectedItem?.quantity ?? ""}
                  onChange={(e) =>
                    setSelectedItem(
                      selectedItem
                        ? {
                            ...selectedItem,
                            quantity: parseInt(e.target.value) || 1,
                          }
                        : null
                    )
                  }
                  style={{ width: "80px" }}
                  disabled={!selectedItem}
                />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleAddItem}
                  disabled={
                    !selectedItem ||
                    (selectedItem.kind === "inventory"
                      ? !selectedItem.inventoryItemId
                      : !selectedItem.serviceId)
                  }
                >
                  Add
                </button>
              </div>
            </div>

            {formState.items.length > 0 && (
              <div className="form-field wide">
                <label>Items in Sale</label>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formState.items.map((item, index) => {
                      const invItem = item.inventoryItemId
                        ? inventory.find((i) => i.id === item.inventoryItemId)
                        : undefined;
                      const svcItem = item.serviceId
                        ? services.find((s) => s.id === item.serviceId)
                        : undefined;
                      const unitPrice =
                        item.unitPrice ??
                        invItem?.sellingPrice ??
                        (svcItem
                          ? typeof svcItem.price === "number"
                            ? svcItem.price
                            : parseFloat(String(svcItem.price))
                          : 0);
                      return (
                        <tr key={index}>
                          <td>{invItem?.name ?? svcItem?.name ?? "Unknown"}</td>
                          <td>{item.quantity}</td>
                          <td>GHS {unitPrice.toFixed(2)}</td>
                          <td>GHS {(unitPrice * item.quantity).toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="ghost-button small danger"
                              onClick={() => handleRemoveItem(index)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={3}
                        style={{ textAlign: "right", fontWeight: "bold" }}
                      >
                        Total:
                      </td>
                      <td style={{ fontWeight: "bold" }}>
                        {formState.currency} {calculateTotal().toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="form-field wide">
              <label htmlFor="sale-notes">Notes (Optional)</label>
              <textarea
                id="sale-notes"
                value={formState.notes}
                onChange={(e) =>
                  setFormState({ ...formState, notes: e.target.value })
                }
                placeholder="Additional notes about this sale"
                rows={2}
              />
            </div>

            <div
              className="form-actions"
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              <button
                type="submit"
                className="primary-button"
                disabled={creating || formState.items.length === 0}
                style={{ padding: "10px 14px", borderRadius: 8 }}
              >
                {creating
                  ? "Processing..."
                  : `Complete Sale - ${
                      formState.currency
                    } ${calculateTotal().toFixed(2)}`}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handlePayWithPaystack}
                disabled={creating || formState.items.length === 0}
                style={{ padding: "10px 14px", borderRadius: 8 }}
              >
                Pay with Paystack
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="table-wrapper">
        {loading && (
          <p className="muted" style={{ padding: "16px" }}>
            Loading sales...
          </p>
        )}
        {!loading && sales.length === 0 && (
          <div className="empty-state">
            <p>No sales recorded yet. Create your first sale above.</p>
          </div>
        )}
        {!loading && sales.length > 0 && (
          <table className="table prescriptions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Sold By</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td>
                    {sale.customerName || "Walk-in"}
                    {sale.customerPhone && (
                      <div className="prescription-meta">
                        <small>{sale.customerPhone}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="prescription-meta">
                      {sale.items.map((item, idx) => (
                        <small key={idx}>
                          {item.inventoryItem.name} × {item.quantity}
                        </small>
                      ))}
                    </div>
                  </td>
                  <td>
                    <strong>
                      {sale.currency} {sale.totalAmount.toFixed(2)}
                    </strong>
                  </td>
                  <td>{sale.paymentMethod}</td>
                  <td>
                    {sale.soldBy
                      ? `${sale.soldBy.firstName} ${sale.soldBy.lastName}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SalesPage;
