import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { CreateInventoryPayload } from "../../services/inventory.service";
import Alert from "../Alert";
import { parseApiError } from "../../utils/errors";

interface CreateInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateInventoryPayload) => Promise<void> | void;
}

const defaultForm: CreateInventoryPayload = {
  name: "",
  genericName: "",
  category: "",
  form: "",
  strength: "",
  manufacturer: "",
  batchNumber: "",
  expiryDate: null,
  quantityInStock: 0,
  reorderLevel: 0,
  unitPrice: 0,
  sellingPrice: 0,
  barcode: "",
  requiresPrescription: false,
};

type FormErrors = Partial<Record<keyof CreateInventoryPayload, string>>;

const CreateInventoryItemModal = ({
  isOpen,
  onClose,
  onSubmit,
}: CreateInventoryItemModalProps) => {
  const [form, setForm] = useState<CreateInventoryPayload>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(defaultForm);
      setErrors({});
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const priceMargin = useMemo(() => {
    if (!form.unitPrice || !form.sellingPrice) {
      return null;
    }
    if (form.unitPrice === 0) {
      return null;
    }
    return ((form.sellingPrice - form.unitPrice) / form.unitPrice) * 100;
  }, [form.sellingPrice, form.unitPrice]);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Enter a product name.";
    }
    if (!form.category.trim()) {
      nextErrors.category = "Specify a therapeutic category.";
    }
    if (!form.form.trim()) {
      nextErrors.form = "Select a dosage form.";
    }
    if (!form.strength.trim()) {
      nextErrors.strength = "Provide strength or concentration.";
    }
    if (form.quantityInStock < 0) {
      nextErrors.quantityInStock = "Quantity cannot be negative.";
    }
    if (form.reorderLevel < 0) {
      nextErrors.reorderLevel = "Reorder level cannot be negative.";
    }
    if (form.sellingPrice < 0) {
      nextErrors.sellingPrice = "Selling price must be zero or greater.";
    }
    if (form.unitPrice < 0) {
      nextErrors.unitPrice = "Unit price must be zero or greater.";
    }
    if (form.expiryDate) {
      const expiry = new Date(form.expiryDate);
      if (Number.isNaN(expiry.getTime())) {
        nextErrors.expiryDate = "Select a valid expiry date.";
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    try {
      setIsSubmitting(true);
      // Normalize date to ISO-8601 with midnight time component to satisfy backend @IsDateString
      let normalizedExpiry: string | undefined = undefined;
      if (form.expiryDate && String(form.expiryDate).trim()) {
        const dateStr = String(form.expiryDate).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          setErrors((prev) => ({
            ...prev,
            expiryDate: "Please choose a valid date.",
          }));
          setIsSubmitting(false);
          return;
        }
        const [year, month, day] = dateStr
          .split("-")
          .map((v) => parseInt(v, 10));
        normalizedExpiry = new Date(
          Date.UTC(year, month - 1, day, 0, 0, 0, 0)
        ).toISOString();
      }
      await onSubmit({
        ...form,
        genericName: form.genericName?.trim() || undefined,
        manufacturer: form.manufacturer?.trim() || undefined,
        batchNumber: form.batchNumber?.trim() || undefined,
        barcode: form.barcode?.trim() || undefined,
        expiryDate: normalizedExpiry,
      });
      onClose();
    } catch (err: any) {
      const message = parseApiError(err);
      // If backend complains about expiry format, surface on the field and keep modal open
      if (/expirydate/i.test(message) || /iso 8601/i.test(message)) {
        setErrors((prev) => ({
          ...prev,
          expiryDate: "Please choose a valid date.",
        }));
      }
      setSubmitError(message || "Failed to save item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextChange = (
    key: keyof CreateInventoryPayload,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleNumberChange = (
    key: keyof CreateInventoryPayload,
    value: string
  ) => {
    const numeric = Number(value);
    setForm((prev) => ({
      ...prev,
      [key]: Number.isNaN(numeric) ? 0 : numeric,
    }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add inventory item"
      width="640px"
    >
      {submitError && <Alert type="error">{submitError}</Alert>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field wide">
          <label htmlFor="item-name">Product name *</label>
          <input
            id="item-name"
            value={form.name}
            onChange={(event) => handleTextChange("name", event.target.value)}
            placeholder="e.g. Amoxicillin 500mg Capsules"
          />
          {errors.name && <small className="input-error">{errors.name}</small>}
        </div>

        <div className="form-field">
          <label htmlFor="item-generic">Generic name</label>
          <input
            id="item-generic"
            value={form.genericName ?? ""}
            onChange={(event) =>
              handleTextChange("genericName", event.target.value)
            }
            placeholder="Amoxicillin"
          />
        </div>

        <div className="form-field">
          <label htmlFor="item-category">Category *</label>
          <input
            id="item-category"
            value={form.category}
            onChange={(event) =>
              handleTextChange("category", event.target.value)
            }
            placeholder="Antibiotics"
          />
          {errors.category && (
            <small className="input-error">{errors.category}</small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="item-form">Dosage form *</label>
          <input
            id="item-form"
            value={form.form}
            onChange={(event) => handleTextChange("form", event.target.value)}
            placeholder="Capsule"
          />
          {errors.form && <small className="input-error">{errors.form}</small>}
        </div>

        <div className="form-field">
          <label htmlFor="item-strength">Strength *</label>
          <input
            id="item-strength"
            value={form.strength}
            onChange={(event) =>
              handleTextChange("strength", event.target.value)
            }
            placeholder="500mg"
          />
          {errors.strength && (
            <small className="input-error">{errors.strength}</small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="item-manufacturer">Manufacturer</label>
          <input
            id="item-manufacturer"
            value={form.manufacturer ?? ""}
            onChange={(event) =>
              handleTextChange("manufacturer", event.target.value)
            }
            placeholder="Sandoz"
          />
        </div>

        <div className="form-field">
          <label htmlFor="item-batch">Batch number</label>
          <input
            id="item-batch"
            value={form.batchNumber ?? ""}
            onChange={(event) =>
              handleTextChange("batchNumber", event.target.value)
            }
            placeholder="AMX-2309"
          />
        </div>

        <div className="form-field">
          <label htmlFor="item-expiry">Expiry date</label>
          <input
            id="item-expiry"
            type="date"
            value={(form.expiryDate as string | null) ?? ""}
            onChange={(event) =>
              handleTextChange("expiryDate", event.target.value)
            }
          />
          {errors.expiryDate && (
            <small className="input-error">{errors.expiryDate}</small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="item-quantity">Opening stock *</label>
          <input
            id="item-quantity"
            type="number"
            min="0"
            value={form.quantityInStock}
            onChange={(event) =>
              handleNumberChange("quantityInStock", event.target.value)
            }
          />
          {errors.quantityInStock && (
            <small className="input-error">{errors.quantityInStock}</small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="item-reorder">Reorder level *</label>
          <input
            id="item-reorder"
            type="number"
            min="0"
            value={form.reorderLevel}
            onChange={(event) =>
              handleNumberChange("reorderLevel", event.target.value)
            }
          />
          {errors.reorderLevel && (
            <small className="input-error">{errors.reorderLevel}</small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="item-unit-price">Unit cost (GHS) *</label>
          <input
            id="item-unit-price"
            type="number"
            min="0"
            step="0.01"
            value={form.unitPrice}
            onChange={(event) =>
              handleNumberChange("unitPrice", event.target.value)
            }
          />
          {errors.unitPrice && (
            <small className="input-error">{errors.unitPrice}</small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="item-selling-price">Selling price (GHS) *</label>
          <input
            id="item-selling-price"
            type="number"
            min="0"
            step="0.01"
            value={form.sellingPrice}
            onChange={(event) =>
              handleNumberChange("sellingPrice", event.target.value)
            }
          />
          {errors.sellingPrice && (
            <small className="input-error">{errors.sellingPrice}</small>
          )}
          {priceMargin !== null && (
            <small className="field-hint">
              Mark-up: {priceMargin >= 0 ? "+" : ""}
              {priceMargin.toFixed(1)}%
            </small>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="item-barcode">Barcode</label>
          <input
            id="item-barcode"
            value={form.barcode ?? ""}
            onChange={(event) =>
              handleTextChange("barcode", event.target.value)
            }
            placeholder="EAN / UPC code"
          />
        </div>

        <div className="form-field checkbox-field">
          <label htmlFor="item-prescription">
            <input
              id="item-prescription"
              type="checkbox"
              checked={form.requiresPrescription}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  requiresPrescription: event.target.checked,
                }))
              }
            />
            Requires prescription
          </label>
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
            {isSubmitting ? "Saving…" : "Save item"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateInventoryItemModal;
