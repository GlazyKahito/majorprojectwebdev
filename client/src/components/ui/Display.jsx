import { CUSTOMER_STATUSES, LEAD_STAGES, ROLES, TASK_PRIORITIES, TASK_STATUSES, findOption } from "../../utils/constants";
import { avatarColor, formatDueDate, initials } from "../../utils/format";

export function Badge({ tone, dot, outline, children, className = "", ...props }) {
  return (
    <span className={`badge ${tone ? `badge--${tone}` : ""} ${outline ? "badge--outline" : ""} ${className}`} {...props}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

export function StatusDot({ color, label }) {
  return (
    <span className="status">
      <span className="status__dot" style={{ background: color }} />
      {label}
    </span>
  );
}

export const LeadStage = ({ status }) => {
  const stage = findOption(LEAD_STAGES, status) || LEAD_STAGES[0];
  return <StatusDot color={stage.color} label={stage.label} />;
};

export const CustomerStatus = ({ status }) => {
  const option = findOption(CUSTOMER_STATUSES, status) || CUSTOMER_STATUSES[0];
  return <StatusDot color={option.color} label={option.label} />;
};

export const TaskStatus = ({ status }) => {
  const option = findOption(TASK_STATUSES, status) || TASK_STATUSES[0];
  return <StatusDot color={option.color} label={option.label} />;
};

export function Priority({ value, showLabel = true }) {
  const option = findOption(TASK_PRIORITIES, value) || TASK_PRIORITIES[1];
  return (
    <span className={`priority priority--${option.value}`} title={`${option.label} priority`}>
      <span className="priority__bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {showLabel && option.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const tone = { admin: "violet", manager: "accent", executive: "success" }[role];
  return <Badge tone={tone}>{ROLES[role] || role}</Badge>;
}

export function DueDate({ value, completed }) {
  const { label, tone } = formatDueDate(value);
  const color = completed
    ? "var(--text-tertiary)"
    : { overdue: "var(--danger-text)", today: "var(--warning-text)", none: "var(--text-tertiary)" }[tone] || "var(--text-secondary)";
  return (
    <span className="num" style={{ color, fontSize: 13, whiteSpace: "nowrap", textDecoration: completed ? "line-through" : undefined }}>
      {label}
    </span>
  );
}

export function Avatar({ name = "", size = "sm", className = "" }) {
  if (!name) {
    return <span className={`avatar avatar--${size} avatar--empty ${className}`} aria-hidden="true" />;
  }
  return (
    <span className={`avatar avatar--${size} ${className}`} style={{ background: avatarColor(name) }} title={name} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Person({ user, size = "xs", fallback = "Unassigned", subtitle }) {
  if (!user) {
    return (
      <span className="person subtle">
        <Avatar size={size} />
        {fallback}
      </span>
    );
  }
  return (
    <span className="person">
      <Avatar name={user.name} size={size} />
      <span className="truncate" style={{ lineHeight: 1.3 }}>
        {user.name}
        {subtitle && <span className="subtle" style={{ display: "block", fontSize: 12 }}>{subtitle}</span>}
      </span>
    </span>
  );
}

export function Spinner({ size }) {
  return <span className={`spinner ${size === "lg" ? "spinner--lg" : ""}`} role="status" aria-label="Loading" />;
}

export function Skeleton({ width = "100%", height = 12, style, className = "" }) {
  return <span className={`skeleton ${className}`} style={{ display: "block", width, height, ...style }} />;
}

export function EmptyState({ icon: Icon, title, description, action, compact }) {
  return (
    <div className={`empty ${compact ? "empty--compact" : ""}`}>
      {Icon && (
        <div className="empty__icon">
          <Icon />
        </div>
      )}
      <div className="empty__title">{title}</div>
      {description && <p className="empty__text">{description}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "var(--text-tertiary)" }}>
      <Spinner size="lg" />
    </div>
  );
}
