import { useState } from "react";
import { Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Button, Input, Segmented, Textarea } from "../ui";
import { useToast } from "../../context/ToastContext";
import { fromInputDate, toInputDate } from "../../utils/format";

const TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "note", label: "Note", icon: MessageSquare },
];

const PLACEHOLDERS = {
  call: "Discovery call with the operations team",
  email: "Sent pricing proposal",
  meeting: "Quarterly business review",
  note: "Decision expected after budget review",
};

export default function InteractionComposer({ onSubmit }) {
  const toast = useToast();
  const [type, setType] = useState("call");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const reset = () => {
    setSummary("");
    setBody("");
    setDate(toInputDate(new Date()));
    setError("");
    setExpanded(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (summary.trim().length < 2) {
      setError("Add a short summary");
      return;
    }
    setSaving(true);
    try {
      const isToday = date === toInputDate(new Date());
      await onSubmit({ type, summary: summary.trim(), body: body.trim(), occurredAt: isToday ? new Date().toISOString() : fromInputDate(date, 12) });
      toast.success(`${TYPES.find((t) => t.value === type).label} logged`);
      reset();
    } catch (err) {
      toast.error("Couldn't log interaction", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="composer">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <Segmented ariaLabel="Interaction type" value={type} onChange={setType} options={TYPES} />
      </div>
      <Input
        placeholder={PLACEHOLDERS[type]}
        value={summary}
        onFocus={() => setExpanded(true)}
        onChange={(e) => {
          setSummary(e.target.value);
          setError("");
        }}
        error={error}
        aria-label="Summary"
        maxLength={240}
      />
      {expanded && (
        <>
          <Textarea placeholder="Details, next steps, who was involved…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} aria-label="Details" maxLength={4000} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" className="input input--sm" style={{ width: 160 }} value={date} max={toInputDate(new Date())} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="ghost" onClick={reset} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" loading={saving}>
              Log {type}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
