import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import Button from "./Button";

export function Modal({ open, onClose, title, description, children, footer, size, dismissible = true, as: Tag = "div", onSubmit }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    previousFocus.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      const target = dialogRef.current?.querySelector("[data-autofocus], input:not([type=hidden]), select, textarea, button:not(.modal__close)");
      target?.focus();
    }, 30);

    const onKey = (event) => {
      if (event.key === "Escape" && dismissible) onCloseRef.current?.();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose?.();
      }}
    >
      <Tag
        ref={dialogRef}
        className={`modal ${size ? `modal--${size}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={onSubmit}
        noValidate={Tag === "form" ? true : undefined}
      >
        {(title || description) && (
          <div className="modal__header">
            <div>
              {title && <h2 className="modal__title">{title}</h2>}
              {description && <p className="modal__description">{description}</p>}
            </div>
            {dismissible && (
              <button type="button" className="icon-button modal__close" onClick={onClose} aria-label="Close" style={{ margin: "-6px -8px 0 0" }}>
                <X />
              </button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </Tag>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Delete", loading, tone = "danger", children }) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {tone === "danger" && (
        <div className="confirm__icon">
          <AlertTriangle />
        </div>
      )}
      <h2 className="modal__title">{title}</h2>
      {description && <p className="modal__description">{description}</p>}
      {children}
    </Modal>
  );
}
