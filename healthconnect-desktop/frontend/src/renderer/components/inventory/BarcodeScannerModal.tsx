import { useEffect, useRef, useState } from "react";
import Modal from "../Modal";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

const BarcodeScannerModal = ({
  isOpen,
  onClose,
  onScan,
}: BarcodeScannerModalProps) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else {
      setValue("");
    }
  }, [isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onScan(value.trim());
    setValue("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setValue("");
        onClose();
      }}
      title="Scan or enter barcode"
      width="420px"
    >
      <form onSubmit={handleSubmit} className="barcode-form">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Focus here and scan"
        />
        <p className="muted">
          Connect your USB barcode scanner and ensure this input is focused.
        </p>
        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Search
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BarcodeScannerModal;
