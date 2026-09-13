import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { Avatar, Button, FormError, Input, PasswordInput } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const DEMO_ACCOUNTS = [
  { name: "Aarav Mehta", email: "admin@crm360.app", role: "Admin" },
  { name: "Priya Raman", email: "manager@crm360.app", role: "Sales Manager" },
  { name: "Rohan Kapoor", email: "executive@crm360.app", role: "Sales Executive" },
];

const DEMO_PASSWORD = "Demo@1234";

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(sessionMessage);
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname && location.state.from.pathname !== "/login" ? `${location.state.from.pathname}${location.state.from.search || ""}` : "/dashboard";

  const validate = (values) => {
    const next = {};
    if (!values.email.trim()) next.email = "Enter your email address";
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = "Enter a valid email address";
    if (!values.password) next.password = "Enter your password";
    return next;
  };

  const submit = async (values) => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  const signInWithDemo = (account) => {
    const values = { email: account.email, password: DEMO_PASSWORD };
    setForm(values);
    toast.info(`Signing in as ${account.role}`);
    submit(values);
  };

  const update = (field) => (event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const demo = (
    <div className="auth__demo">
      <div className="auth__demo-title">Explore with a demo account</div>
      <div className="auth__demo-list">
        {DEMO_ACCOUNTS.map((account) => (
          <button key={account.email} type="button" className="auth__demo-item" onClick={() => signInWithDemo(account)} disabled={submitting}>
            <Avatar name={account.name} size="sm" />
            <span>{account.role}</span>
            <span className="mono">{account.email}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AuthLayout aside={demo}>
      <h1 className="auth__title">Sign in to CRM360</h1>
      <p className="auth__subtitle">Welcome back. Enter your details to continue.</p>

      <form
        className="auth__fields"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(form);
        }}
      >
        <FormError error={formError} />
        <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@company.com" value={form.email} onChange={update("email")} error={errors.email} autoFocus />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
          aside={
            <Link to="/forgot-password" className="link" style={{ fontSize: 12.5 }}>
              Forgot password?
            </Link>
          }
        />
        <Button type="submit" variant="primary" size="lg" block loading={submitting} iconRight={ArrowRight} style={{ marginTop: 6 }}>
          Sign in
        </Button>
      </form>

      <div className="demo-mobile">{demo}</div>

      <p className="auth__footer-text">
        New to CRM360?{" "}
        <Link to="/register" className="link">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
