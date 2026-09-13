import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Laptop, Moon, Sun } from "lucide-react";
import { authService } from "../services";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Badge, Button, PageHeader, RoleBadge, Select, Switch } from "../components/ui";
import { CURRENCIES, ROLES } from "../utils/constants";
import { formatCurrency } from "../utils/format";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

const NOTIFICATION_PREFS = [
  { key: "notifyTaskAssigned", title: "Task assignments", text: "When someone assigns you a task or completes one you created." },
  { key: "notifyLeadUpdates", title: "Lead updates", text: "When a lead you own is assigned, changes stage, or gets a new note." },
  { key: "notifyDeadlines", title: "Upcoming deadlines", text: "Reminders for tasks due and follow-ups scheduled within 24 hours." },
  { key: "weeklyDigest", title: "Weekly summary", text: "A Monday recap of pipeline movement and overdue work." },
];

const PERMISSIONS = [
  { label: "View and edit customers", admin: "All", manager: "All", executive: "Own" },
  { label: "Delete customers and leads", admin: true, manager: true, executive: false },
  { label: "Create and update leads", admin: "All", manager: "All", executive: "Own" },
  { label: "Assign leads and customers", admin: true, manager: true, executive: false },
  { label: "Convert leads to customers", admin: true, manager: true, executive: true },
  { label: "Assign tasks to teammates", admin: true, manager: true, executive: false },
  { label: "Team analytics", admin: true, manager: true, executive: false },
  { label: "Manage users and roles", admin: true, manager: false, executive: false },
];

function Section({ id, title, description, children }) {
  return (
    <section className="settings-section" id={id}>
      <div className="settings-section__intro">
        <h2 className="form-section__title">{title}</h2>
        {description && <p className="form-section__description">{description}</p>}
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { user, setUser, previewTheme } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [saving, setSaving] = useState(null);
  const prefs = user.preferences || {};

  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const save = async (changes, key, message) => {
    setSaving(key);
    const previous = user;
    setUser({ ...user, preferences: { ...prefs, ...changes } });
    try {
      const res = await authService.updatePreferences(changes);
      setUser(res.user);
      if (message) toast.success(message);
    } catch (err) {
      setUser(previous);
      toast.error("Couldn't save preference", err.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Personalize CRM360 and control what you're notified about."
        actions={
          <Button variant="secondary" to="/profile">
            Edit profile
          </Button>
        }
      />

      <div className="panel settings-panel">
        <Section title="Appearance" description="Choose how the interface looks on this account.">
          <div className="theme-options" role="radiogroup" aria-label="Theme">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              const selected = (prefs.theme || "system") === theme.value;
              return (
                <button
                  key={theme.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`theme-option ${selected ? "is-selected" : ""}`}
                  onClick={() => {
                    previewTheme(theme.value);
                    save({ theme: theme.value }, "theme");
                  }}
                >
                  <span className={`theme-option__preview theme-option__preview--${theme.value}`}>
                    <span />
                    <span />
                  </span>
                  <span className="theme-option__label">
                    <Icon />
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Regional" description="How amounts are displayed across dashboards, leads and customers.">
          <div className="form-grid">
            <Select label="Currency" value={prefs.currency || "USD"} onChange={(e) => save({ currency: e.target.value }, "currency", "Currency updated")} options={CURRENCIES.map((c) => ({ value: c.value, label: `${c.value} — ${c.label}` }))} disabled={saving === "currency"} />
            <div className="field">
              <span className="field__label">Preview</span>
              <div className="input" style={{ display: "flex", alignItems: "center", background: "var(--bg-subtle)" }}>
                <span className="num">{formatCurrency(128450)}</span>
              </div>
            </div>
          </div>
        </Section>

        <Section id="notifications" title="Notifications" description="In-app notifications appear in the bell menu and on the Notifications page.">
          <div className="setting-rows">
            {NOTIFICATION_PREFS.map((pref) => (
              <label key={pref.key} className="setting-row">
                <span>
                  <span className="setting-row__title">{pref.title}</span>
                  <span className="setting-row__text">{pref.text}</span>
                </span>
                <Switch checked={prefs[pref.key] !== false && (pref.key !== "weeklyDigest" || Boolean(prefs.weeklyDigest))} onChange={(value) => save({ [pref.key]: value }, pref.key, `${pref.title} ${value ? "on" : "off"}`)} disabled={saving === pref.key} label={pref.title} />
              </label>
            ))}
          </div>
        </Section>

        <Section title="Access" description="Your role determines what you can see and change. Only admins can change roles.">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span className="muted">Your role</span>
            <RoleBadge role={user.role} />
          </div>
          <div className="table-wrap permission-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Permission</th>
                  {Object.keys(ROLES).map((role) => (
                    <th key={role} className={role === user.role ? "is-current" : ""}>
                      {ROLES[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {Object.keys(ROLES).map((role) => (
                      <td key={role} className={role === user.role ? "is-current" : ""}>
                        {typeof row[role] === "string" ? <Badge>{row[role]}</Badge> : row[role] ? <span className="perm perm--yes">Yes</span> : <span className="perm perm--no">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {user.role === "admin" && (
            <p className="subtle" style={{ fontSize: 13, marginTop: 12 }}>
              Manage team roles from the{" "}
              <Link to="/users" className="link">
                Users
              </Link>{" "}
              page.
            </p>
          )}
        </Section>
      </div>
    </>
  );
}
