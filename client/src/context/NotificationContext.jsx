import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { notificationService } from "../services";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);
const POLL_INTERVAL = 60000;

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await notificationService.unreadCount();
      setUnreadCount(res.unreadCount);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_INTERVAL);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refresh]);

  const notifyChanged = useCallback(() => {
    setVersion((v) => v + 1);
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ unreadCount, setUnreadCount, refresh, version, notifyChanged }), [unreadCount, refresh, version, notifyChanged]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => useContext(NotificationContext);
