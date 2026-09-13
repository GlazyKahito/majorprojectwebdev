import { useState } from "react";
import { authService } from "../services";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Button, FormError, Input, PageHeader, PasswordInput, RoleBadge, Select } from "../components/ui";
import PasswordMeter from "../components/forms/PasswordMeter";
import { ROLE_DESCRIPTIONS } from "../utils/constants";
import { formatDate, timeAgo } from "../utils/format";
import { validatePassword } from "../utils/password";

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "Europe/Paris", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney", "UTC"];

function SettingsSection({ title, description, children }) {
  return (
    <section className="settings-section">
      <div className="settings-section__intro">
        <h2 className="form-section__title">{title}</h2>
        {description && <p className="form-section__description">{description}</p>}
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

export default function Profile() {
  const { user, setUser, startSession } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user.name, email: user.email, title: user.title || "", phone: user.phone || "", timezone: user.timezone || "Asia/Kolkata" });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const dirty = profile.name !== user.name || profile.email !== user.email || profile.title !== (user.title || "") || profile.phone !== (user.phone || "") || profile.timezone !== (user.timezone || "Asia/Kolkata");

  const setField = (field) => (e) => {
    setProfile((p) => ({ ...p, [field]: e.target.value }));
    if (profileErrors[field]) setProfileErrors((x) => ({ ...x, [field]: undefined }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const next = {};
    if (profile.name.trim().length < 2) next.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) next.email = "Enter a valid email";
    setProfileErrors(next);
    setProfileError("");
    if (Object.keys(next).length) return;
    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({ ...profile, name: profile.name.trim(), email: profile.email.trim() });
      setUser(res.user);
      toast.success("Profile saved");
    } catch (err) {
      setProfileErrors(err.fieldErrors || {});
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const next = {};
    if (!passwords.currentPassword) next.currentPassword = "Enter your current password";
    const err = validatePassword(passwords.newPassword);
    if (err) next.newPassword = err;
    if (passwords.newPassword !== passwords.confirm) next.confirm = "Passwords don't match";
    setPasswordErrors(next);
    setPasswordError("");
    if (Object.keys(next).length) return;
    setSavingPassword(true);
    try {
      const res = await authService.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      startSession(res);
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed", "Other sessions have been signed out.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" description="How you appear to your team, and how you sign in." />

      <div className="profile-hero panel">
        <Avatar name={user.name} size="xl" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 18 }}>{user.name}</h2>
            <RoleBadge role={user.role} />
          </div>
          <p className="muted" style={{ marginTop: 2 }}>
            {[user.title, user.email].filter(Boolean).join(" · ")}
          </p>
          <p className="subtle" style={{ marginTop: 6, fontSize: 12.5 }}>
            {ROLE_DESCRIPTIONS[user.role]}
          </p>
        </div>
        <dl className="profile-hero__facts">
          <div>
            <dt>Member since</dt>
            <dd>{formatDate(user.createdAt, { year: true })}</dd>
          </div>
          <div>
            <dt>Last sign-in</dt>
            <dd>{user.lastLoginAt ? timeAgo(user.lastLoginAt) : "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="panel settings-panel">
        <SettingsSection title="Personal details" description="Your name and title are visible on records you own.">
          <form onSubmit={saveProfile} noValidate className="form-grid">
            {profileError && (
              <div className="span-full">
                <FormError error={profileError} />
              </div>
            )}
            <Input label="Full name" value={profile.name} onChange={setField("name")} error={profileErrors.name} autoComplete="name" />
            <Input label="Email" type="email" value={profile.email} onChange={setField("email")} error={profileErrors.email} autoComplete="email" />
            <Input label="Job title" optional value={profile.title} onChange={setField("title")} placeholder="Account Executive" />
            <Input label="Phone" optional type="tel" value={profile.phone} onChange={setField("phone")} autoComplete="tel" />
            <Select label="Timezone" value={profile.timezone} onChange={setField("timezone")} options={TIMEZONES} />
            <div className="span-full form-actions">
              <Button variant="secondary" disabled={!dirty || savingProfile} onClick={() => setProfile({ name: user.name, email: user.email, title: user.title || "", phone: user.phone || "", timezone: user.timezone || "Asia/Kolkata" })}>
                Reset
              </Button>
              <Button type="submit" variant="primary" loading={savingProfile} disabled={!dirty}>
                Save profile
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection title="Password" description="Changing your password signs you out everywhere else.">
          <form onSubmit={savePassword} noValidate className="form-grid">
            {passwordError && (
              <div className="span-full">
                <FormError error={passwordError} />
              </div>
            )}
            <PasswordInput fieldClassName="span-full" label="Current password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} error={passwordErrors.currentPassword} />
            <div className="field">
              <PasswordInput label="New password" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} error={passwordErrors.newPassword} />
              {!passwordErrors.newPassword && <PasswordMeter password={passwords.newPassword} />}
            </div>
            <PasswordInput label="Confirm new password" autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} error={passwordErrors.confirm} />
            <div className="span-full form-actions">
              <Button type="submit" variant="primary" loading={savingPassword} disabled={!passwords.currentPassword || !passwords.newPassword}>
                Update password
              </Button>
            </div>
          </form>
        </SettingsSection>
      </div>
    </>
  );
}
