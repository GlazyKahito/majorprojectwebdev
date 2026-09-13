import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { notificationService } from "../../services";
import { useNotifications } from "../../context/NotificationContext";
import { useToast } from "../../context/ToastContext";
import useClickOutside from "../../hooks/useClickOutside";
import NotificationItem from "./NotificationItem";
import { Button, EmptyState, Segmented, Skeleton } from "../ui";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { unreadCount, setUnreadCount, version, notifyChanged } = useNotifications();
  const toast = useToast();
  const navigate = useNavigate();
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.list({ filter: filter === "unread" ? "unread" : undefined, limit: 12 });
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch (error) {
      toast.error("Couldn't load notifications", error.message);
    } finally {
      setLoading(false);
    }
  }, [filter, setUnreadCount, toast]);

  useEffect(() => {
    if (open) load();
  }, [open, load, version]);

  const openNotification = async (notification) => {
    setOpen(false);
    if (!notification.read) {
      setItems((list) => list.map((n) => (n._id === notification._id ? { ...n, read: true } : n)));
      setUnreadCount((count) => Math.max(count - 1, 0));
      notificationService.markRead(notification._id).catch(() => null);
    }
    if (notification.link) navigate(notification.link);
  };

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      notifyChanged();
    } catch (error) {
      toast.error("Couldn't mark notifications as read", error.message);
    }
  };

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="icon-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Bell />
        {unreadCount > 0 && <span className="icon-button__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="popover" role="dialog" aria-label="Notifications">
          <div className="popover__header">
            <span className="popover__title">Notifications</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Segmented
                ariaLabel="Filter notifications"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "unread", label: "Unread", count: unreadCount || undefined },
                ]}
              />
              <Button variant="ghost" size="sm" icon={CheckCheck} onClick={markAll} disabled={!unreadCount} title="Mark all as read" aria-label="Mark all as read" />
            </div>
          </div>
          <div className="popover__body">
            {loading && items.length === 0 ? (
              <div style={{ padding: 14, display: "grid", gap: 16 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: "flex", gap: 12 }}>
                    <Skeleton width={30} height={30} />
                    <div style={{ flex: 1, display: "grid", gap: 6 }}>
                      <Skeleton width="80%" />
                      <Skeleton width="50%" height={10} />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState compact icon={BellOff} title={filter === "unread" ? "You're all caught up" : "No notifications yet"} description="Assignments, lead updates and upcoming deadlines will show up here." />
            ) : (
              items.map((notification) => <NotificationItem key={notification._id} notification={notification} onOpen={openNotification} />)
            )}
          </div>
          <div className="popover__footer">
            <Button
              variant="ghost"
              size="sm"
              block
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
