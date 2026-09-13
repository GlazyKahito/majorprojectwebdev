import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Dropdown({ trigger, children, align = "end", placement = "bottom", width, className = "" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  const measure = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const rect = anchor.getBoundingClientRect();
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const gap = 6;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top = placement === "top" ? rect.top - menuHeight - gap : rect.bottom + gap;
    if (placement !== "top" && top + menuHeight > viewportH - 8 && rect.top - menuHeight - gap > 8) top = rect.top - menuHeight - gap;
    if (placement === "top" && top < 8) top = rect.bottom + gap;

    let left = align === "end" ? rect.right - menuWidth : rect.left;
    left = Math.min(Math.max(left, 8), viewportW - menuWidth - 8);

    setPosition({ top, left });
  }, [align, placement]);

  useLayoutEffect(() => {
    if (open) measure();
    else setPosition(null);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (anchorRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      close();
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    const onScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close]);

  return (
    <div className={`dropdown ${className}`} ref={anchorRef}>
      {trigger({ open, toggle: () => setOpen((v) => !v), close })}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="menu"
            role="menu"
            style={{ position: "fixed", top: position?.top ?? -9999, left: position?.left ?? -9999, minWidth: width, visibility: position ? "visible" : "hidden" }}
            onClick={(event) => {
              if (event.target.closest("[data-close-menu]")) close();
            }}
          >
            {typeof children === "function" ? children({ close }) : children}
          </div>,
          document.body
        )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, danger, active, onClick, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`menu__item ${danger ? "menu__item--danger" : ""} ${active ? "menu__item--active" : ""}`}
      onClick={onClick}
      data-close-menu
      {...props}
    >
      {Icon && <Icon />}
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  );
}

export const MenuSeparator = () => <div className="menu__separator" role="separator" />;

export const MenuLabel = ({ children }) => <div className="menu__label">{children}</div>;
