import { ArrowRightLeft, CheckCircle2, Mail, MessageSquare, Pencil, Phone, Plus, Repeat, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import { formatDateTime, timeAgo } from "../../utils/format";
import { EmptyState, Skeleton } from "../ui";

const ICONS = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: MessageSquare,
  created: Plus,
  updated: Pencil,
  status_changed: ArrowRightLeft,
  assigned: UserPlus,
  converted: Repeat,
  task_completed: CheckCircle2,
};

const INTERACTIONS = ["call", "email", "meeting", "note"];

export default function ActivityTimeline({ items, loading, onDelete, canDelete, emptyText = "Calls, emails, meetings and changes will appear here." }) {
  if (loading) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <Skeleton width={28} height={28} style={{ borderRadius: "50%" }} />
            <div style={{ flex: 1, display: "grid", gap: 6, paddingTop: 4 }}>
              <Skeleton width="60%" />
              <Skeleton width="30%" height={10} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return <EmptyState compact icon={Sparkles} title="No activity yet" description={emptyText} />;
  }

  return (
    <ol className="timeline">
      {items.map((item) => {
        const Icon = ICONS[item.type] || Pencil;
        const deletable = onDelete && INTERACTIONS.includes(item.type) && canDelete?.(item);
        return (
          <li key={item._id} className="timeline__item">
            <span className={`timeline__icon timeline__icon--${item.type}`}>
              <Icon />
            </span>
            <div className="timeline__content">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div className="timeline__summary">{item.summary}</div>
                {deletable && (
                  <button type="button" className="icon-button" style={{ width: 26, height: 26, marginTop: -3 }} onClick={() => onDelete(item)} aria-label="Delete interaction">
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              <div className="timeline__meta">
                {INTERACTIONS.includes(item.type) && <span style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{item.type}</span>}
                {INTERACTIONS.includes(item.type) && <span>·</span>}
                {item.actor?.name && <span>{item.actor.name}</span>}
                {item.actor?.name && <span>·</span>}
                <time dateTime={item.occurredAt} title={formatDateTime(item.occurredAt)}>
                  {timeAgo(item.occurredAt)}
                </time>
              </div>
              {item.body && <div className="timeline__body">{item.body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
