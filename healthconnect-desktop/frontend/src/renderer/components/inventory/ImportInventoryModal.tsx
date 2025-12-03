import { useState } from "react";
import Modal from "../Modal";
import Alert from "../Alert";
import { CreateInventoryPayload } from "../../services/inventory.service";

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: CreateInventoryPayload[]) => Promise<void>;
}

const headers = [
  "name",
  "genericName",
  "category",
  "form",
  "strength",
  "quantityInStock",
  "reorderLevel",
  "unitPrice",
  "sellingPrice",
  "barcode",
  "requiresPrescription",
  "expiryDate",
];

const ImportInventoryModal = ({
  isOpen,
  onClose,
  onImport,
}: ImportInventoryModalProps) => {
  const [rows, setRows] = useState<CreateInventoryPayload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const parseFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setRows(parsed);
      setError(null);
    } catch (err) {
      setRows([]);
      setError(
        err instanceof Error ? err.message : "Unable to parse CSV file."
      );
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await parseFile(event.target.files?.[0]);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    await parseFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (!rows.length) {
      setError("Please upload a CSV before importing.");
      return;
    }
    setIsUploading(true);
    try {
      await onImport(rows);
      setRows([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setRows([]);
        setError(null);
        onClose();
      }}
      title="Import inventory from CSV"
      width="640px"
    >
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <div
        className={`import-upload ${dragOver ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p>Drag & drop a CSV file here, or click to browse.</p>
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        <p className="muted">
          Required columns: {headers.join(", ")}. Boolean fields accept 1/0 or
          true/false.
        </p>
      </div>
      {rows.length > 0 && (
        <div className="import-preview">
          <p>
            Previewing {rows.length} row{rows.length === 1 ? "" : "s"}.
          </p>
          <div className="import-preview-list">
            {rows.slice(0, 3).map((row, index) => (
              <div key={index} className="import-preview-card">
                <strong>{row.name}</strong>
                <small>
                  {row.category} • {row.form} • {row.strength}
                </small>
                <p>
                  Qty {row.quantityInStock} @ GHS {row.sellingPrice.toFixed(2)}
                </p>
              </div>
            ))}
            {rows.length > 3 && (
              <small className="muted">
                +{rows.length - 3} more rows not shown
              </small>
            )}
          </div>
        </div>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            setRows([]);
            setError(null);
            onClose();
          }}
          disabled={isUploading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!rows.length || isUploading}
          onClick={handleSubmit}
        >
          {isUploading ? "Importing…" : "Import"}
        </button>
      </div>
      <div className="import-template-link">
        <button
          type="button"
          className="ghost-button"
          onClick={downloadTemplate}
        >
          Download sample template
        </button>
      </div>
    </Modal>
  );
};

export default ImportInventoryModal;

function parseCsv(text: string): CreateInventoryPayload[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!lines.length) {
    throw new Error("The CSV file is empty.");
  }
  const header = lines[0].split(",").map((h) => h.trim());
  const missingHeaders = headers.filter(
    (expected) => !header.includes(expected)
  );
  if (missingHeaders.length) {
    throw new Error(
      `Missing headers: ${missingHeaders.join(
        ", "
      )}. Required columns: ${headers.join(", ")}.`
    );
  }
  return lines.slice(1).map((line, rowIndex) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const record: Record<string, string> = {};
    header.forEach((key, idx) => {
      record[key] = cells[idx] ?? "";
    });
    if (!record.name) {
      throw new Error(`Row ${rowIndex + 2}: Name is required.`);
    }
    return {
      name: record.name,
      genericName: record.genericName || undefined,
      category: record.category || "Uncategorized",
      form: record.form || "Tablet",
      strength: record.strength || "",
      manufacturer: record.manufacturer || undefined,
      batchNumber: record.batchNumber || undefined,
      expiryDate: record.expiryDate || undefined,
      quantityInStock: Number(record.quantityInStock || 0),
      reorderLevel: Number(record.reorderLevel || 0),
      unitPrice: Number(record.unitPrice || 0),
      sellingPrice: Number(record.sellingPrice || 0),
      barcode: record.barcode || undefined,
      requiresPrescription:
        record.requiresPrescription?.toLowerCase() === "true" ||
        record.requiresPrescription === "1",
    };
  });
}

function downloadTemplate() {
  const sample = [
    headers.join(","),
    "Amoxicillin 500mg Capsules,Amoxicillin,Antibiotics,Capsule,500mg,120,40,4.50,6.75,8945632100456,true,2026-06-30",
    "Metformin 850mg Tablets,Metformin,Antidiabetics,Tablet,850mg,200,80,2.60,4.50,8945632100998,true,2025-12-31",
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventory-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
