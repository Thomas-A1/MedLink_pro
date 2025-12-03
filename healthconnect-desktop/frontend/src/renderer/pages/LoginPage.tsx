import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { login } from "../store/slices/auth.slice";

type FormErrors = {
  identifier?: string;
  password?: string;
};

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    const newErrors: FormErrors = {};

    if (!trimmedIdentifier) {
      newErrors.identifier = "Please enter an email address or phone number.";
    } else if (trimmedIdentifier.includes("@")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedIdentifier)) {
        newErrors.identifier = "Enter a valid email address.";
      }
    } else {
      const digitsOnly = trimmedIdentifier.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        newErrors.identifier =
          "Enter a valid phone number with at least 10 digits.";
      }
    }

    if (!trimmedPassword) {
      newErrors.password = "Please enter your password.";
    } else if (trimmedPassword.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    return newErrors;
  };

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    if (formErrors.identifier) {
      setFormErrors((prev) => ({ ...prev, identifier: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (formErrors.password) {
      setFormErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const validationResults = validate();
    if (Object.keys(validationResults).length > 0) {
      setFormErrors(validationResults);
      return;
    }

    dispatch(login({ identifier, password }));
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="logo-wrap">
          <img src="/medlink-logo.svg" alt="MedLink logo" />
        </div>
        <h1>MedLink Desktop</h1>
        <p className="subtitle">
          Seamless care coordination for pharmacies and hospitals.
        </p>

        <label>
          <span>Email or Phone</span>
          <input
            value={identifier}
            onChange={(e) => handleIdentifierChange(e.target.value)}
            autoComplete="username"
            placeholder="Enter your MedLink email"
            aria-required="true"
          />
          {formErrors.identifier && (
            <small className="input-error">{formErrors.identifier}</small>
          )}
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-required="true"
          />
          {formErrors.password && (
            <small className="input-error">{formErrors.password}</small>
          )}
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
        <p className="auth-helper">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
