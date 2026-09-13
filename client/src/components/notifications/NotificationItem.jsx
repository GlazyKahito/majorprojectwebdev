import { AlarmClock, Bell, CheckSquare, Target, TrendingUp } from "lucide-react";
import { timeAgo } from "../../utils/format";

const ICONS = {
  task_assigned: CheckSquare,
  lead_assigned: Target,
  lead_updated: TrendingUp,
  deadline: AlarmClock,
  system: Bell,
};

export const NOTIFICATION_TYPE_LABELS = {
  task_assigned: "Tasks",
  lead_assigned: "Assignments",
  lead_updated: "Lead updates",
  deadline: "Deadlines",
  system: "System",
};

export default function NotificationItem({ notification, onOpen, children }) {
  const Icon = ICONS[notification.type] || Bell;
  return (
    <div
      role="button"
      tabIndex={0}
      className={`notification ${notification.read ? "" : "notification--unread"}`}
      onClick={(event) => {
        if (event.target.closest("[data-stop]")) return;
        onOpen(notification);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(notification);
      }}
      style={{ cursor: "pointer" }}
    >
      <span className={`notification__icon notification__icon--${notification.type}`}>
        <Icon />
      </span>
      <span className="notification__content">
        <span className="notification__title" style={{ display: "block" }}>
          {notification.title}
        </span>
        {notification.message && <span className="notification__message">{notification.message}</span>}
        <span className="notification__time" style={{ display: "block" }}>
          {timeAgo(notification.createdAt)}
          {notification.actor?.name ? ` · ${notification.actor.name}` : ""}
        </span>
      </span>
      {children}
      {!notification.read && <span className="notification__dot" aria-label="Unread" />}
    </div>
  );
}
