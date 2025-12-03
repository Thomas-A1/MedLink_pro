import React from "react";

interface AlertProps {
  type?: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({
  type = "info",
  children,
  className,
  onClose,
}) => {
  const baseStyle: React.CSSProperties = {
    padding: "14px 18px",
    borderRadius: 12,
    fontWeight: 500,
    margin: "12px 0",
    display: "grid",
    gridTemplateColumns: onClose ? "auto 1fr auto" : "auto 1fr",
    alignItems: "flex-start",
    gap: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(0,0,0,0.02)",
  };
  const palette: Record<
    string,
    { bg: string; fg: string; border: string; icon: string }
  > = {
    error: {
      bg: "rgba(239,68,68,0.10)",
      fg: "#7f1d1d",
      border: "rgba(239,68,68,0.30)",
      icon: "⛔",
    },
    success: {
      bg: "rgba(16,185,129,0.10)",
      fg: "#065f46",
      border: "rgba(16,185,129,0.30)",
      icon: "✅",
    },
    info: {
      bg: "rgba(59,130,246,0.10)",
      fg: "#1e3a8a",
      border: "rgba(59,130,246,0.30)",
      icon: "ℹ️",
    },
    warning: {
      bg: "rgba(245,158,11,0.10)",
      fg: "#7c2d12",
      border: "rgba(245,158,11,0.30)",
      icon: "⚠️",
    },
  };
  const theme = palette[type] ?? palette.info;

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        background: theme.bg,
        color: theme.fg,
        border: `1px solid ${theme.border}`,
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 18,
          lineHeight: "18px",
          marginTop: 2,
        }}
      >
        {theme.icon}
      </span>
      <div style={{ lineHeight: 1.4 }}>{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="alert-close-button"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Alert;
