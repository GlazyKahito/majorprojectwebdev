import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { Button, FormError, Input } from "../../components/ui";
import { authService } from "../../services";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setResult(res);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Link to="/login" className="btn btn--ghost btn--sm" style={{ marginLeft: -10, marginBottom: 20 }}>
        <ArrowLeft style={{ width: 15, height: 15 }} />
        Back to sign in
      </Link>
      <h1 className="auth__title">Reset your password</h1>
      <p className="auth__subtitle">Enter the email you use for CRM360 and we'll send you a link to set a new password.</p>

      {result ? (
        <>
          <div className="auth__notice" role="status">
            <CheckCircle2 />
            <div>
              <div style={{ fontWeight: 500 }}>Check your inbox</div>
              <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>{result.message} The link expires in 30 minutes.</div>
            </div>
          </div>
          {result.resetUrl && (
            <div style={{ marginTop: 16, padding: 12, border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
              <div className="muted" style={{ marginBottom: 8 }}>
                Email delivery isn't configured on this server, so here's your reset link:
              </div>
              <Link to={result.resetUrl} className="link">
                Open reset link
              </Link>
            </div>
          )}
          <Button variant="secondary" block style={{ marginTop: 20 }} onClick={() => setResult(null)}>
            Use a different email
          </Button>
        </>
      ) : (
        <form className="auth__fields" onSubmit={submit} noValidate>
          <FormError error={formError} />
          <Input
            label="Email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            error={error}
            autoFocus
          />
          <Button type="submit" variant="primary" size="lg" block loading={submitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
