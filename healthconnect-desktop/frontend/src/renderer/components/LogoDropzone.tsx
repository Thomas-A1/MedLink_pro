import { useCallback, useEffect, useState } from "react";

interface LogoDropzoneProps {
  value?: string;
  onChange: (logoUrl: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

const LogoDropzone: React.FC<LogoDropzoneProps> = ({
  value,
  onChange,
  onError,
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setIsProcessing(true);

      // Check file type
      if (!file.type.startsWith("image/")) {
        onError?.("Please select an image file");
        setIsProcessing(false);
        return;
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        onError?.("Image size must be less than 2MB");
        setIsProcessing(false);
        return;
      }

      // Create a local object URL for reliable preview
      try {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl((prev) => {
          if (prev && prev !== objectUrl) {
            URL.revokeObjectURL(prev);
          }
          return objectUrl;
        });
      } catch {
        // ignore preview failures; we'll still try to load base64
      }

      // Convert to base64 for persistence
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        onError?.("");
        setIsProcessing(false);
      };
      reader.onerror = () => {
        onError?.("Failed to read image file");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    },
    [onChange, onError]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleRemove = useCallback(() => {
    onChange("");
    onError?.("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [onChange, onError]);

  // Keep preview in sync if initial value is an http(s) URL
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    if (value.startsWith("http")) {
      setPreviewUrl(value);
    }
  }, [value]);

  return (
    <div className={`logo-dropzone-wrapper ${className}`}>
      {value ? (
        <div className="logo-dropzone-preview">
          <img
            src={previewUrl ?? value}
            alt="Logo preview"
            className="logo-preview-image"
          />
          <div className="logo-preview-overlay">
            <button
              type="button"
              onClick={handleRemove}
              className="logo-remove-button"
              title="Remove logo"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`logo-dropzone ${isDragging ? "dragging" : ""} ${
            isProcessing ? "processing" : ""
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="logo-dropzone-input"
            id="logo-dropzone-input"
            disabled={isProcessing}
          />
          <label htmlFor="logo-dropzone-input" className="logo-dropzone-label">
            {isProcessing ? (
              <>
                <span className="logo-dropzone-icon processing">⏳</span>
                <span className="logo-dropzone-text">Processing...</span>
              </>
            ) : (
              <>
                <span className="logo-dropzone-icon">📁</span>
                <span className="logo-dropzone-text">
                  {isDragging
                    ? "Drop logo here"
                    : "Drag & drop logo or click to browse"}
                </span>
                <small className="logo-dropzone-hint">
                  PNG, JPG, SVG up to 2MB
                </small>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
};

export default LogoDropzone;
