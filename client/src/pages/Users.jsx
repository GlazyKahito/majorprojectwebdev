import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserX, Users as UsersIcon, X } from "lucide-react";
import { userService } from "../services";
import useAsync from "../hooks/useAsync";
import useQueryState from "../hooks/useQueryState";
import { invalidateTeam } from "../hooks/useTeam";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Badge, Button, ConfirmDialog, DataTable, Dropdown, EmptyState, FormError, Input, MenuItem, MenuSeparator, Modal, PageHeader, PasswordInput, RoleBadge, Select } from "../components/ui";
import SearchInput from "../components/crm/SearchInput";
import { ROLES, ROLE_DESCRIPTIONS } from "../utils/constants";
import { formatCurrency, timeAgo } from "../utils/format";
import { validatePassword } from "../utils/password";

const DEFAULTS = { q: "", role: "", status: "" };
const ROLE_OPTIONS = Object.entries(ROLES).map(([value, label]) => ({ value, label }));

function UserModal({ open, onClose, member, onSaved }) {
  const toast = useToast();
  const editing = Boolean(member);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(member ? { name: member.name, email: member.email, role: member.role, title: member.title || "", phone: member.phone || "" } : { name: "", email: "", role: "executive", title: "", phone: "", password: "" });
      setErrors({});
      setFormError("");
    }
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if ((form.name || "").trim().length < 2) next.name = "Enter a name";
    if (!/^\S+@\S+\.\S+$/.test(form.email || "")) next.email = "Enter a valid email";
    if (!editing) {
      const passwordError = validatePassword(form.password);
      if (passwordError) next.password = passwordError;
    }
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = editing ? await userService.update(member._id, form) : await userService.create(form);
      toast.success(editing ? "User updated" : "User invited", editing ? undefined : `${res.user.name} can now sign in.`);
      invalidateTeam();
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      as="form"
      onSubmit={submit}
      open={open}
      onClose={saving ? undefined : onClose}
      dismissible={!saving}
      title={editing ? `Edit ${member?.name}` : "Add team member"}
      description={editing ? "Update profile details and access level." : "Create an account and share the temporary password with them."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            {editing ? "Save changes" : "Add member"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {formError && (
          <div className="span-full">
            <FormError error={formError} />
          </div>
        )}
        <Input label="Full name" value={form.name || ""} onChange={set("name")} error={errors.name} data-autofocus />
        <Input label="Email" type="email" value={form.email || ""} onChange={set("email")} error={errors.email} />
        <Input label="Job title" optional value={form.title || ""} onChange={set("title")} placeholder="Account Executive" />
        <Input label="Phone" optional value={form.phone || ""} onChange={set("phone")} />
        {!editing && <PasswordInput fieldClassName="span-full" label="Temporary password" autoComplete="new-password" value={form.password || ""} onChange={set("password")} error={errors.password} hint="At least 8 characters with letters and numbers." />}
        <div className="span-full field">
          <span className="field__label">Role</span>
          <div className="role-options" role="radiogroup" aria-label="Role">
            {ROLE_OPTIONS.map((role) => (
              <label key={role.value} className={`role-option ${form.role === role.value ? "is-selected" : ""}`}>
                <input type="radio" name="role" value={role.value} checked={form.role === role.value} onChange={set("role")} />
                <span>
                  <span className="role-option__title">{role.label}</span>
                  <span className="role-option__text">{ROLE_DESCRIPTIONS[role.value]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useQueryState(DEFAULTS);
  const [modal, setModal] = useState({ open: false, member: null });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [reassignTo, setReassignTo] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload } = useAsync(() => userService.list({ ...filters, limit: 100 }), [filters.q, filters.role, filters.status]);
  const all = useAsync(() => userService.list({ limit: 200 }), []);

  const members = data?.items || [];
  const everyone = all.data?.items || [];
  const counts = everyone.reduce(
    (acc, m) => {
      acc[m.role] += 1;
      if (m.isActive) acc.active += 1;
      return acc;
    },
    { admin: 0, manager: 0, executive: 0, active: 0 }
  );

  const refresh = () => {
    reload({ silent: true });
    all.reload({ silent: true });
  };

  const toggleActive = async (member) => {
    try {
      await userService.update(member._id, { isActive: !member.isActive });
      toast.success(member.isActive ? "User deactivated" : "User reactivated", member.isActive ? `${member.name} can no longer sign in.` : `${member.name} can sign in again.`);
      invalidateTeam();
      refresh();
    } catch (err) {
      toast.error("Couldn't update user", err.message);
    }
  };

  const changeRole = async (member, role) => {
    try {
      await userService.update(member._id, { role });
      toast.success("Role updated", `${member.name} is now ${ROLES[role]}.`);
      invalidateTeam();
      refresh();
    } catch (err) {
      toast.error("Couldn't change role", err.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await userService.remove(pendingDelete._id, reassignTo || undefined);
      toast.success("User removed", `Their records were reassigned.`);
      invalidateTeam();
      setPendingDelete(null);
      refresh();
    } catch (err) {
      toast.error("Couldn't remove user", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Member",
      minWidth: 240,
      render: (m) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: m.isActive ? 1 : 0.55 }}>
          <Avatar name={m.name} size="md" />
          <div className="table__primary">
            <strong className="truncate">
              {m.name}
              {m._id === user._id && <span className="subtle" style={{ fontWeight: 400 }}> (you)</span>}
            </strong>
            <span className="truncate">{m.email}</span>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (m) => <RoleBadge role={m.role} /> },
    { key: "title", header: "Title", render: (m) => <span className="muted">{m.title || "—"}</span> },
    {
      key: "status",
      header: "Status",
      render: (m) =>
        m.isActive ? (
          <Badge tone="success" dot>
            Active
          </Badge>
        ) : (
          <Badge dot>Deactivated</Badge>
        ),
    },
    { key: "openLeads", header: "Open leads", align: "right", render: (m) => <span className="num">{m.stats.openLeads}</span> },
    { key: "openTasks", header: "Open tasks", align: "right", render: (m) => <span className="num">{m.stats.openTasks}</span> },
    { key: "wonValue", header: "Won", align: "right", render: (m) => <span className="num">{m.stats.wonValue ? formatCurrency(m.stats.wonValue, { compact: true }) : "—"}</span> },
    { key: "lastLoginAt", header: "Last active", render: (m) => <span className="muted">{m.lastLoginAt ? timeAgo(m.lastLoginAt) : "Never"}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: 48,
      render: (m) => (
        <div className="table__actions" data-stop>
          <Dropdown
            width={200}
            trigger={({ toggle, open }) => (
              <button type="button" className="icon-button" onClick={toggle} aria-expanded={open} aria-label={`Actions for ${m.name}`}>
                <MoreHorizontal />
              </button>
            )}
          >
            <MenuItem icon={Pencil} onClick={() => setModal({ open: true, member: m })}>
              Edit details
            </MenuItem>
            {m._id !== user._id && (
              <>
                <MenuSeparator />
                <div className="menu__label">Change role</div>
                {ROLE_OPTIONS.filter((r) => r.value !== m.role).map((role) => (
                  <MenuItem key={role.value} icon={ShieldCheck} onClick={() => changeRole(m, role.value)}>
                    {role.label}
                  </MenuItem>
                ))}
                <MenuSeparator />
                <MenuItem icon={m.isActive ? UserX : UserCheck} onClick={() => toggleActive(m)}>
                  {m.isActive ? "Deactivate" : "Reactivate"}
                </MenuItem>
                <MenuItem
                  icon={Trash2}
                  danger
                  onClick={() => {
                    setReassignTo("");
                    setPendingDelete(m);
                  }}
                >
                  Remove user
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      ),
    },
  ];

  const hasFilters = filters.q || filters.role || filters.status;

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage who has access to the workspace and what they can do."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setModal({ open: true, member: null })}>
            Add member
          </Button>
        }
      />

      <div className="pipeline-summary" style={{ marginBottom: 20 }}>
        <div>
          <span>Active members</span>
          <strong className="num">{all.data ? counts.active : "—"}</strong>
        </div>
        <div>
          <span>Admins</span>
          <strong className="num">{all.data ? counts.admin : "—"}</strong>
        </div>
        <div>
          <span>Sales managers</span>
          <strong className="num">{all.data ? counts.manager : "—"}</strong>
        </div>
        <div>
          <span>Sales executives</span>
          <strong className="num">{all.data ? counts.executive : "—"}</strong>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <SearchInput className="toolbar__search" value={filters.q} onChange={(q) => setFilters({ q }, { resetPage: false })} placeholder="Search people…" />
          <Select size="sm" value={filters.role} onChange={(e) => setFilters({ role: e.target.value }, { resetPage: false })} options={ROLE_OPTIONS} placeholder="All roles" aria-label="Role" />
          <Select
            size="sm"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value }, { resetPage: false })}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Deactivated" },
            ]}
            placeholder="Any status"
            aria-label="Status"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={() => setFilters({ q: "", role: "", status: "" }, { resetPage: false })}>
              Clear
            </Button>
          )}
        </div>
        {error && !data ? (
          <EmptyState icon={UsersIcon} title="Couldn't load users" description={error.message} action={<Button onClick={() => reload()}>Try again</Button>} />
        ) : (
          <DataTable
            columns={columns}
            rows={members}
            loading={loading && !data}
            onRowClick={(m) => setModal({ open: true, member: m })}
            mobileRender={(m) => (
              <>
                <div className="mobile-list__top">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <Avatar name={m.name} size="md" />
                    <div className="table__primary">
                      <strong className="truncate">{m.name}</strong>
                      <span className="truncate">{m.email}</span>
                    </div>
                  </div>
                  {columns[columns.length - 1].render(m)}
                </div>
                <div className="mobile-list__meta">
                  <RoleBadge role={m.role} />
                  {!m.isActive && <Badge dot>Deactivated</Badge>}
                  <span className="subtle">{m.stats.openLeads} open leads</span>
                </div>
              </>
            )}
            empty={<EmptyState icon={UsersIcon} title="No users match" description="Try a different search or filter." />}
          />
        )}
      </div>

      <UserModal open={modal.open} member={modal.member} onClose={() => setModal({ open: false, member: null })} onSaved={refresh} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Remove ${pendingDelete?.name}?`}
        description="Their account is deleted. Customers, leads and tasks they own are handed over so nothing falls through the cracks."
        confirmLabel="Remove user"
      >
        <div style={{ marginTop: 16 }}>
          <Select label="Reassign their records to" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} placeholder={`Me (${user.name})`}>
            {everyone
              .filter((m) => m.isActive && m._id !== pendingDelete?._id && m._id !== user._id)
              .map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} · {ROLES[m.role]}
                </option>
              ))}
          </Select>
        </div>
      </ConfirmDialog>
    </>
  );
}
