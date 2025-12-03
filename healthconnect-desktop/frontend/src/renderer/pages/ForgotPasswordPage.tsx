import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services/auth.service";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [phoneLastFour, setPhoneLastFour] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await authService.requestPasswordReset(
        email.toLowerCase().trim()
      );
      setSubmitted(true);
      setPhoneLastFour(response?.phoneNumberLastFour ?? null);
      if (response?.error) {
        setError(response.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to request password reset."
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
        <h1>Forgot password</h1>
        <p className="subtitle">
          Enter the email associated with your MedLink account. We'll send a
          6-digit reset code via SMS to the phone number registered with your
          account.
        </p>

        <label>
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@medlink.com"
            required
            autoComplete="email"
          />
        </label>

        {error && <p className="error">{error}</p>}
        {submitted && (
          <div
            className="success-banner"
            style={{
              backgroundColor: "#e7f5ff",
              border: "2px solid #228be6",
              padding: "1.5rem",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: "0.75rem",
                color: "#1864ab",
              }}
            >
              ✅ Reset Code Sent via SMS
            </strong>
            <p style={{ margin: "0 0 0.75rem 0", color: "#495057" }}>
              A 6-digit password reset code has been sent via SMS to the phone
              number registered with your account
              {phoneLastFour && ` (ending in ••••${phoneLastFour})`}.
            </p>
            <p
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "0.9rem",
                color: "#495057",
              }}
            >
              <strong>Please check your messages.</strong> The code expires in
              10 minutes.
            </p>
            <p
              style={{
                margin: "0.75rem 0 0 0",
                fontSize: "0.85rem",
                color: "#868e96",
              }}
            >
              Go to{" "}
              <Link
                to="/reset-password"
                style={{
                  color: "#228be6",
                  textDecoration: "underline",
                  fontWeight: "500",
                }}
              >
                Reset Password
              </Link>{" "}
              to enter the code and set your new password.
            </p>
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset code via SMS"}
        </button>
        <p className="auth-helper">
          Remembered your password? <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
