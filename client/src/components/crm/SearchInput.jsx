import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import useDebounce from "../../hooks/useDebounce";

export default function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  const [draft, setDraft] = useState(value || "");
  const debounced = useDebounce(draft, 300);

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  useEffect(() => {
    if ((debounced || "") !== (value || "")) onChange(debounced);
  }, [debounced]);

  return (
    <div className={`input-group input-group--trailing ${className}`}>
      <Search className="input-group__icon" />
      <input className="input input--sm" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {draft && (
        <button type="button" className="btn btn--ghost btn--sm btn--icon input-group__action" style={{ "--btn-h": "24px" }} onClick={() => setDraft("")} aria-label="Clear search">
          <X />
        </button>
      )}
    </div>
  );
}
