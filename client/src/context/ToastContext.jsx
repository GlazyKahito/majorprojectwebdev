import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, title, message, duration = 4200) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, type, title, message }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (title, message) => push("success", title, message),
      error: (title, message) => push("error", title, message, 6000),
      info: (title, message) => push("info", title, message),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div key={toast.id} className={`toast toast--${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
              <Icon className="toast__icon" />
              <div className="toast__content">
                <div className="toast__title">{toast.title}</div>
                {toast.message && <div className="toast__message">{toast.message}</div>}
              </div>
              <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                <X />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
