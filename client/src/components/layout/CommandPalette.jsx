import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, Building2, CheckSquare, CornerDownLeft, KanbanSquare, LayoutDashboard, Plus, Search, Settings, Target, Users } from "lucide-react";
import { searchService } from "../../services";
import useDebounce from "../../hooks/useDebounce";
import { Spinner } from "../ui";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../utils/permissions";
import { LEAD_STAGES, labelFor } from "../../utils/constants";
import { formatCurrency } from "../../utils/format";

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ customers: [], leads: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query, 200);
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults({ customers: [], leads: [], tasks: [] });
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open || debounced.trim().length < 2) {
      setResults({ customers: [], leads: [], tasks: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchService
      .search(debounced.trim())
      .then((res) => !cancelled && setResults(res))
      .catch(() => !cancelled && setResults({ customers: [], leads: [], tasks: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      const actions = [
        { group: "Create", icon: Plus, label: "New customer", to: "/customers/new" },
        { group: "Create", icon: Plus, label: "New lead", to: "/leads/new" },
        { group: "Create", icon: Plus, label: "New task", to: "/tasks?new=1" },
        { group: "Go to", icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
        { group: "Go to", icon: Building2, label: "Customers", to: "/customers" },
        { group: "Go to", icon: Target, label: "Leads", to: "/leads" },
        { group: "Go to", icon: KanbanSquare, label: "Sales pipeline", to: "/pipeline" },
        { group: "Go to", icon: CheckSquare, label: "Tasks", to: "/tasks" },
        { group: "Go to", icon: Bell, label: "Notifications", to: "/notifications" },
        ...(isAdmin(user) ? [{ group: "Go to", icon: Users, label: "Users", to: "/users" }] : []),
        { group: "Go to", icon: Settings, label: "Settings", to: "/settings" },
      ];
      return q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;
    }
    return [
      ...results.customers.map((c) => ({ group: "Customers", icon: Building2, label: c.name, meta: c.company, to: `/customers/${c._id}` })),
      ...results.leads.map((l) => ({ group: "Leads", icon: Target, label: l.name, meta: `${labelFor(LEAD_STAGES, l.status)} · ${formatCurrency(l.value, { compact: true })}`, to: `/leads/${l._id}` })),
      ...results.tasks.map((t) => ({ group: "Tasks", icon: CheckSquare, label: t.title, meta: t.status === "completed" ? "Completed" : "", to: `/tasks?task=${t._id}` })),
    ];
  }, [query, results, user]);

  useEffect(() => {
    setActive(0);
  }, [items.length]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    if (!open) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;

  const select = (item) => {
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && items[active]) {
      event.preventDefault();
      select(items[active]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  let lastGroup = null;
  const searching = query.trim().length >= 2;

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search">
        <div className="palette__input">
          <Search />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search customers, leads and tasks…"
            aria-label="Search"
            autoComplete="off"
            spellCheck="false"
          />
          {loading ? <Spinner /> : <button type="button" className="kbd" onClick={onClose} style={{ cursor: "pointer" }}>Esc</button>}
        </div>
        <div className="palette__results" ref={listRef}>
          {items.length === 0 ? (
            <div className="empty empty--compact">
              <div className="empty__title">{searching && loading ? "Searching…" : "No matches"}</div>
              {searching && !loading && <p className="empty__text">Nothing matched “{query.trim()}”. Try a name, company or email.</p>}
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon;
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={`${item.group}-${item.to}-${index}`}>
                  {showGroup && <div className="palette__group">{item.group}</div>}
                  <button
                    type="button"
                    className="palette__item"
                    data-index={index}
                    data-active={index === active}
                    onMouseMove={() => setActive(index)}
                    onClick={() => select(item)}
                  >
                    <Icon />
                    <span className="truncate">{item.label}</span>
                    {item.meta ? <span className="palette__item-meta truncate">{item.meta}</span> : index === active && <ArrowRight className="palette__item-meta" style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="palette__footer">
          <span>
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> Navigate
          </span>
          <span>
            <span className="kbd">
              <CornerDownLeft style={{ width: 11, height: 11 }} />
            </span>
            Open
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
