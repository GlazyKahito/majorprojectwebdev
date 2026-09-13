import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, User } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { Button, FormError, Input, PasswordInput } from "../../components/ui";
import PasswordMeter from "../../components/forms/PasswordMeter";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { validatePassword } from "../../utils/password";

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
    const passwordError = validatePassword(form.password);
    if (passwordError) next.password = passwordError;
    if (form.confirm !== form.password) next.confirm = "Passwords don't match";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      toast.success("Welcome to CRM360", "Your account is ready.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth__title">Create your account</h1>
      <p className="auth__subtitle">Join your team's workspace. Admins can adjust your role after you sign up.</p>

      <form className="auth__fields" onSubmit={submit} noValidate>
        <FormError error={formError} />
        <Input label="Full name" icon={User} autoComplete="name" placeholder="Jordan Rivera" value={form.name} onChange={update("name")} error={errors.name} autoFocus />
        <Input label="Work email" type="email" icon={Mail} autoComplete="email" placeholder="you@company.com" value={form.email} onChange={update("email")} error={errors.email} />
        <div className="field">
          <PasswordInput label="Password" autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={update("password")} error={errors.password} />
          {!errors.password && <PasswordMeter password={form.password} />}
        </div>
        <PasswordInput label="Confirm password" autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={update("confirm")} error={errors.confirm} />
        <Button type="submit" variant="primary" size="lg" block loading={submitting} iconRight={ArrowRight} style={{ marginTop: 6 }}>
          Create account
        </Button>
      </form>

      <p className="auth__footer-text">
        Already have an account?{" "}
        <Link to="/login" className="link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
