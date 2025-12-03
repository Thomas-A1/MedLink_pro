import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setCode(digitsOnly);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(code, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="logo-wrap">
          <img src="/medlink-logo.svg" alt="MedLink logo" />
        </div>
        <h1>Set a new password</h1>
        <p className="subtitle">
          Enter the 6-digit code sent to your registered phone number via SMS,
          then choose a strong password to secure your MedLink account.
        </p>

        <label>
          <span>6-digit reset code</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => handleCodeChange(event.target.value)}
            placeholder="000000"
            required
            autoComplete="one-time-code"
            style={{
              fontSize: "1.5rem",
              letterSpacing: "0.5rem",
              textAlign: "center",
              fontFamily: "monospace",
              fontWeight: "600",
            }}
          />
          <small
            className="field-hint"
            style={{
              textAlign: "center",
              display: "block",
              marginTop: "0.5rem",
            }}
          >
            Enter the code from your SMS message
          </small>
        </label>

        <label>
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </label>

        <label>
          <span>Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Re-enter password"
            required
            autoComplete="new-password"
          />
        </label>

        {error && <p className="error">{error}</p>}
        {success && (
          <p className="success-banner">Password updated! Redirecting…</p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </button>

        <p className="auth-helper">
          Need help? <Link to="/forgot-password">Request a new token</Link>
        </p>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
