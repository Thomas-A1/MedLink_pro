import { FormEvent, useEffect, useState } from "react";
import { useAppSelector } from "../store/hooks";
import {
  servicesService,
  PharmacyService,
  CreateServiceDto,
} from "../services/services.service";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";
import { paymentsService } from "../services/payments.service";

const SERVICE_TYPES = [
  { value: "lab_test", label: "Lab Test" },
  { value: "blood_transfusion", label: "Blood Transfusion" },
  { value: "blood_test", label: "Blood Test" },
  { value: "x_ray", label: "X-Ray" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "ecg", label: "ECG" },
  { value: "consultation", label: "Consultation" },
  { value: "vaccination", label: "Vaccination" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "emergency", label: "Emergency" },
  { value: "maternity", label: "Maternity" },
  { value: "pediatrics", label: "Pediatrics" },
  { value: "surgery", label: "Surgery" },
  { value: "dental", label: "Dental" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "other", label: "Other" },
];

const ServicesPage = () => {
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const [services, setServices] = useState<PharmacyService[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<CreateServiceDto>({
    name: "",
    type: "other",
    description: "",
    price: undefined,
    currency: "GHS",
    isActive: true,
  });
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (activePharmacyId) {
      loadServices();
    }
  }, [activePharmacyId]);

  const loadServices = async () => {
    if (!activePharmacyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await servicesService.list(activePharmacyId);
      setServices(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activePharmacyId) return;
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      await servicesService.create(activePharmacyId, formState);
      setShowForm(false);
      setFormState({
        name: "",
        type: "other",
        description: "",
        price: undefined,
        currency: "GHS",
        isActive: true,
      });
      await loadServices();
      setSuccess("Service created successfully.");
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

  const handleToggleActive = async (
    serviceId: string,
    currentState: boolean
  ) => {
    if (!activePharmacyId) return;
    try {
      await servicesService.update(activePharmacyId, serviceId, {
        isActive: !currentState,
      });
      await loadServices();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!activePharmacyId) return;
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      await servicesService.delete(activePharmacyId, serviceId);
      await loadServices();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  if (!activePharmacyId) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Please select a pharmacy location to manage services.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Services</h1>
          <p className="subtitle">
            Manage the services offered by this pharmacy or hospital location.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          {showForm ? "✕ Cancel" : "+ Add Service"}
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {showForm && (
        <section className="card" style={{ marginBottom: "24px" }}>
          <h2>Add New Service</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-field wide">
              <label htmlFor="service-name">Service Name *</label>
              <input
                id="service-name"
                value={formState.name}
                onChange={(e) =>
                  setFormState({ ...formState, name: e.target.value })
                }
                placeholder="e.g., Complete Blood Count"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="service-type">Service Type *</label>
              <select
                id="service-type"
                value={formState.type}
                onChange={(e) =>
                  setFormState({ ...formState, type: e.target.value })
                }
                required
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="service-price">Price</label>
              <input
                id="service-price"
                type="number"
                step="0.01"
                value={formState.price ?? ""}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    price: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="0.00"
              />
            </div>
            <div className="form-field">
              <label htmlFor="service-currency">Currency</label>
              <select
                id="service-currency"
                value={formState.currency}
                onChange={(e) =>
                  setFormState({ ...formState, currency: e.target.value })
                }
              >
                <option value="GHS">GHS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="form-field wide">
              <label htmlFor="service-description">Description</label>
              <textarea
                id="service-description"
                value={formState.description}
                onChange={(e) =>
                  setFormState({ ...formState, description: e.target.value })
                }
                placeholder="Optional description of the service"
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Service"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="table-wrapper">
        {loading && (
          <p className="muted" style={{ padding: "16px" }}>
            Loading services...
          </p>
        )}
        {!loading && services.length === 0 && (
          <div className="empty-state">
            <p>No services added yet. Add your first service above.</p>
          </div>
        )}
        {!loading && services.length > 0 && (
          <table className="table prescriptions-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Type</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <strong>{service.name}</strong>
                    {service.description && (
                      <div className="prescription-meta">
                        <small>{service.description}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    {SERVICE_TYPES.find((t) => t.value === service.type)
                      ?.label ?? service.type}
                  </td>
                  <td>
                    {service.price !== undefined
                      ? (() => {
                          const numericPrice =
                            typeof service.price === "number"
                              ? service.price
                              : parseFloat(String(service.price));
                          return Number.isFinite(numericPrice)
                            ? `${
                                service.currency ?? "GHS"
                              } ${numericPrice.toFixed(2)}`
                            : "—";
                        })()
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        service.isActive ? "status-active" : "status-inactive"
                      }`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div
                      className="action-buttons"
                      style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                    >
                      <button
                        className="ghost-button small"
                        onClick={() =>
                          handleToggleActive(service.id, service.isActive)
                        }
                        style={{ padding: "8px 12px", borderRadius: 8 }}
                      >
                        {service.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="ghost-button small"
                        onClick={async () => {
                          if (!activePharmacyId) return;
                          setPayingId(service.id);
                          try {
                            const res = await paymentsService.initiate(
                              activePharmacyId,
                              { purpose: "service", serviceId: service.id }
                            );
                            window.open(
                              res.authorizationUrl,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          } catch (err) {
                            setError(parseApiError(err));
                            try {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            } catch {
                              window.scrollTo(0, 0);
                            }
                          } finally {
                            setPayingId(null);
                          }
                        }}
                        disabled={payingId === service.id || !service.isActive}
                        style={{ padding: "8px 12px", borderRadius: 8 }}
                      >
                        {payingId === service.id
                          ? "Opening…"
                          : "Pay via Paystack"}
                      </button>
                      <button
                        className="ghost-button small danger"
                        onClick={() => handleDelete(service.id)}
                        style={{ padding: "8px 12px", borderRadius: 8 }}
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
      </section>
    </div>
  );
};

export default ServicesPage;
