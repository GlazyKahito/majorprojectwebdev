import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck, Mail, MailOpen, Settings, Trash2 } from "lucide-react";
import { notificationService } from "../services";
import { useNotifications } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";
import { Button, EmptyState, PageHeader, Pagination, Segmented, Select, Skeleton } from "../components/ui";
import NotificationItem, { NOTIFICATION_TYPE_LABELS } from "../components/notifications/NotificationItem";

const dayLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diff = (today - date) / 86400000;
  if (diff < 7) return "Earlier this week";
  return date.toLocaleDateString("en-US", { month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { unreadCount, setUnreadCount, version } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationService.list({ filter: filter === "unread" ? "unread" : undefined, type, page, limit: 20 });
      setData(res);
      setUnreadCount(res.unreadCount);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter, type, page, version]);

  const patch = (id, changes) => setData((d) => ({ ...d, items: d.items.map((n) => (n._id === id ? { ...n, ...changes } : n)) }));

  const toggleRead = async (notification) => {
    const read = !notification.read;
    patch(notification._id, { read });
    setUnreadCount((c) => Math.max(c + (read ? -1 : 1), 0));
    try {
      await (read ? notificationService.markRead(notification._id) : notificationService.markUnread(notification._id));
    } catch (err) {
      patch(notification._id, { read: !read });
      setUnreadCount((c) => Math.max(c + (read ? 1 : -1), 0));
      toast.error("Couldn't update notification", err.message);
    }
  };

  const remove = async (notification) => {
    setData((d) => ({ ...d, items: d.items.filter((n) => n._id !== notification._id) }));
    if (!notification.read) setUnreadCount((c) => Math.max(c - 1, 0));
    try {
      await notificationService.remove(notification._id);
    } catch (err) {
      toast.error("Couldn't remove notification", err.message);
      load();
    }
  };

  const markAll = async () => {
    try {
      const res = await notificationService.markAllRead();
      setData((d) => ({ ...d, items: d.items.map((n) => ({ ...n, read: true })) }));
      setUnreadCount(0);
      toast.success("All caught up", `${res.updated} notification${res.updated === 1 ? "" : "s"} marked as read.`);
      if (filter === "unread") load();
    } catch (err) {
      toast.error("Couldn't mark all as read", err.message);
    }
  };

  const open = (notification) => {
    if (!notification.read) {
      notificationService.markRead(notification._id).catch(() => null);
      setUnreadCount((c) => Math.max(c - 1, 0));
    }
    if (notification.link) navigate(notification.link);
  };

  let lastGroup = null;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unreadCount ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.` : "You're all caught up."}
        actions={
          <>
            <Button variant="secondary" icon={Settings} to="/settings#notifications">
              Preferences
            </Button>
            <Button variant="primary" icon={CheckCheck} onClick={markAll} disabled={!unreadCount}>
              Mark all as read
            </Button>
          </>
        }
      />

      <div className="panel notifications-panel">
        <div className="toolbar">
          <Segmented
            ariaLabel="Read state"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: "Unread", count: unreadCount || undefined },
            ]}
          />
          <div className="toolbar__spacer" />
          <Select
            size="sm"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            placeholder="All types"
            options={Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            aria-label="Notification type"
          />
        </div>

        {error && !data ? (
          <EmptyState icon={BellOff} title="Couldn't load notifications" description={error.message} action={<Button onClick={load}>Try again</Button>} />
        ) : loading && !data ? (
          <div style={{ padding: 16, display: "grid", gap: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <Skeleton width={30} height={30} />
                <div style={{ flex: 1, display: "grid", gap: 6 }}>
                  <Skeleton width="50%" />
                  <Skeleton width="30%" height={10} />
                </div>
              </div>
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === "unread" ? "No unread notifications" : "Nothing here yet"}
            description="You'll be notified when tasks are assigned to you, your leads change, or a deadline is coming up."
          />
        ) : (
          <div style={{ opacity: loading ? 0.6 : 1 }}>
            {data.items.map((notification) => {
              const group = dayLabel(notification.createdAt);
              const showGroup = group !== lastGroup;
              lastGroup = group;
              return (
                <div key={notification._id}>
                  {showGroup && <div className="list-group-label">{group}</div>}
                  <NotificationItem notification={notification} onOpen={open}>
                    <span className="notification__actions" data-stop>
                      <button type="button" className="icon-button" onClick={() => toggleRead(notification)} aria-label={notification.read ? "Mark as unread" : "Mark as read"} title={notification.read ? "Mark as unread" : "Mark as read"}>
                        {notification.read ? <Mail /> : <MailOpen />}
                      </button>
                      <button type="button" className="icon-button" onClick={() => remove(notification)} aria-label="Remove notification" title="Remove">
                        <Trash2 />
                      </button>
                    </span>
                  </NotificationItem>
                </div>
              );
            })}
          </div>
        )}

        {data?.items?.length > 0 && data.pagination.pages > 1 && (
          <div className="panel__footer">
            <Pagination pagination={data.pagination} onPageChange={setPage} label="notifications" />
          </div>
        )}
      </div>
    </>
  );
}
