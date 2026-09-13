import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import { Button, FormError, PasswordInput } from "../../components/ui";
import PasswordMeter from "../../components/forms/PasswordMeter";
import { authService } from "../../services";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { validatePassword } from "../../utils/password";

export default function ResetPassword() {
  const { token } = useParams();
  const { startSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    const passwordError = validatePassword(form.password);
    if (passwordError) next.password = passwordError;
    if (form.password !== form.confirm) next.confirm = "Passwords don't match";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await authService.resetPassword(token, form.password);
      startSession(res);
      toast.success("Password updated", "You're now signed in with your new password.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth__title">Choose a new password</h1>
      <p className="auth__subtitle">Pick something you haven't used before. You'll be signed in right after.</p>

      <form className="auth__fields" onSubmit={submit} noValidate>
        {formError && (
          <div style={{ display: "grid", gap: 8 }}>
            <FormError error={formError} />
            <Link to="/forgot-password" className="link" style={{ fontSize: 13 }}>
              Request a new reset link
            </Link>
          </div>
        )}
        <div className="field">
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password}
            autoFocus
          />
          {!errors.password && <PasswordMeter password={form.password} />}
        </div>
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={errors.confirm} />
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          Update password
        </Button>
      </form>

      <p className="auth__footer-text">
        Remembered it?{" "}
        <Link to="/login" className="link">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
