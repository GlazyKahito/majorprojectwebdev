import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CalendarClock, List, MoreHorizontal, Plus, RefreshCw, Repeat } from "lucide-react";
import { leadService } from "../services";
import useAsync from "../hooks/useAsync";
import useQueryState from "../hooks/useQueryState";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Button, DueDate, Dropdown, EmptyState, Input, MenuItem, MenuSeparator, Modal, PageHeader, Select, Skeleton } from "../components/ui";
import SearchInput from "../components/crm/SearchInput";
import AssigneeSelect from "../components/crm/AssigneeSelect";
import ConvertLeadModal from "../components/crm/ConvertLeadModal";
import { LEAD_SOURCES, LEAD_STAGES, OPEN_STAGES, labelFor } from "../utils/constants";
import { formatCurrency, formatDate } from "../utils/format";
import { isPrivileged } from "../utils/permissions";

const DEFAULTS = { q: "", assignedTo: "", source: "" };

function LeadCard({ lead, onMove, onConvert, overlay }) {
  const navigate = useNavigate();
  const isOpen = OPEN_STAGES.includes(lead.status);
  return (
    <div className={`deal-card ${overlay ? "deal-card--overlay" : ""}`}>
      <div className="deal-card__top">
        <Link to={`/leads/${lead._id}`} className="deal-card__title" onPointerDown={(e) => e.stopPropagation()}>
          {lead.company || lead.name}
        </Link>
        {!overlay && (
          <div onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Dropdown
              width={196}
              trigger={({ toggle, open }) => (
                <button type="button" className="deal-card__menu" onClick={toggle} aria-expanded={open} aria-label={`Actions for ${lead.name}`}>
                  <MoreHorizontal />
                </button>
              )}
            >
              <MenuItem onClick={() => navigate(`/leads/${lead._id}`)}>Open lead</MenuItem>
              {!lead.convertedCustomer && (
                <MenuItem icon={Repeat} onClick={() => onConvert(lead)}>
                  Convert to customer
                </MenuItem>
              )}
              <MenuSeparator />
              <div className="menu__label">Move to</div>
              {LEAD_STAGES.filter((s) => s.value !== lead.status).map((stage) => (
                <MenuItem key={stage.value} onClick={() => onMove(lead, stage.value)}>
                  <span className="status">
                    <span className="status__dot" style={{ background: stage.color }} />
                    {stage.label}
                  </span>
                </MenuItem>
              ))}
            </Dropdown>
          </div>
        )}
      </div>
      <div className="deal-card__sub truncate">{lead.company ? lead.name : lead.title || lead.email || "—"}</div>
      <div className="deal-card__value num">{formatCurrency(lead.value)}</div>
      <div className="deal-card__footer">
        <span className="deal-card__date">
          {isOpen ? (
            lead.followUpDate ? (
              <>
                <CalendarClock />
                <DueDate value={lead.followUpDate} />
              </>
            ) : (
              <span className="subtle">No follow-up</span>
            )
          ) : lead.convertedCustomer ? (
            <span className="subtle">Converted</span>
          ) : (
            <span className="subtle">Closed {formatDate(lead.closedAt)}</span>
          )}
        </span>
        <span title={lead.assignedTo?.name || "Unassigned"}>
          <Avatar name={lead.assignedTo?.name} size="xs" />
        </span>
      </div>
    </div>
  );
}

function DraggableCard({ lead, onMove, onConvert, disabled }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead._id, data: { lead }, disabled });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`deal-card-wrap ${isDragging ? "is-dragging" : ""}`} aria-roledescription="Draggable lead">
      <LeadCard lead={lead} onMove={onMove} onConvert={onConvert} />
    </div>
  );
}

function Column({ stage, leads, loading, onMove, onConvert, busyId }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });
  const total = leads.reduce((sum, l) => sum + (l.value || 0), 0);

  return (
    <section className={`board-column ${isOver ? "is-over" : ""}`} aria-label={`${stage.label} stage`}>
      <header className="board-column__header">
        <span className="status" style={{ fontWeight: 500 }}>
          <span className="status__dot" style={{ background: stage.color }} />
          {stage.label}
          <span className="board-column__count num">{leads.length}</span>
        </span>
        <span className="board-column__total num">{formatCurrency(total, { compact: true })}</span>
      </header>
      <div ref={setNodeRef} className="board-column__body">
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={104} style={{ borderRadius: "var(--radius-md)" }} />)
        ) : leads.length === 0 ? (
          <div className="board-column__empty">{isOver ? "Drop to move here" : "No deals"}</div>
        ) : (
          leads.map((lead) => <DraggableCard key={lead._id} lead={lead} onMove={onMove} onConvert={onConvert} disabled={busyId === lead._id} />)
        )}
        {OPEN_STAGES.includes(stage.value) && !loading && (
          <Link to={`/leads/new?status=${stage.value}`} className="board-column__add">
            <Plus />
            Add lead
          </Link>
        )}
      </div>
    </section>
  );
}

export default function Pipeline() {
  const { user } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useQueryState(DEFAULTS);
  const [activeLead, setActiveLead] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [lostPrompt, setLostPrompt] = useState(null);
  const [lostReason, setLostReason] = useState("");
  const [converting, setConverting] = useState(null);

  const { data, loading, error, reload, setData } = useAsync(() => leadService.pipeline(filters), [filters.q, filters.assignedTo, filters.source]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const grouped = useMemo(() => {
    const map = Object.fromEntries(LEAD_STAGES.map((s) => [s.value, []]));
    for (const lead of data?.items || []) map[lead.status]?.push(lead);
    for (const key of Object.keys(map)) map[key].sort((a, b) => (b.value || 0) - (a.value || 0));
    return map;
  }, [data]);

  const openValue = OPEN_STAGES.reduce((sum, s) => sum + grouped[s].reduce((acc, l) => acc + (l.value || 0), 0), 0);
  const openCount = OPEN_STAGES.reduce((sum, s) => sum + grouped[s].length, 0);
  const wonValue = grouped.won.reduce((acc, l) => acc + (l.value || 0), 0);
  const weighted = Math.round(
    OPEN_STAGES.reduce((sum, s, i) => sum + grouped[s].reduce((acc, l) => acc + (l.value || 0), 0) * [0.1, 0.25, 0.5, 0.75][i], 0)
  );

  const move = async (lead, status, reason) => {
    if (lead.status === status) return;
    if (status === "lost" && reason === undefined) {
      setLostReason("");
      setLostPrompt(lead);
      return;
    }

    const previous = lead.status;
    setBusyId(lead._id);
    setData((d) => ({ ...d, items: d.items.map((l) => (l._id === lead._id ? { ...l, status, closedAt: ["won", "lost"].includes(status) ? new Date().toISOString() : null } : l)) }));

    try {
      await leadService.updateStatus(lead._id, { status, ...(reason !== undefined ? { lostReason: reason } : {}) });
      toast.success(
        status === "won" ? "Deal won" : "Stage updated",
        status === "won" ? `${formatCurrency(lead.value)} with ${lead.company || lead.name}. Convert it to a customer from the card menu.` : `${lead.name} moved to ${labelFor(LEAD_STAGES, status)}.`
      );
    } catch (err) {
      setData((d) => ({ ...d, items: d.items.map((l) => (l._id === lead._id ? { ...l, status: previous } : l)) }));
      toast.error("Couldn't move lead", err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onDragEnd = ({ active, over }) => {
    setActiveLead(null);
    if (!over) return;
    const lead = active.data.current?.lead;
    if (lead && over.id !== lead.status) move(lead, over.id);
  };

  const hasFilters = filters.q || filters.assignedTo || filters.source;

  return (
    <>
      <PageHeader
        title="Sales pipeline"
        description="Drag deals between stages to keep the forecast honest."
        actions={
          <>
            <Button variant="secondary" icon={List} to="/leads">
              List view
            </Button>
            <Button variant="primary" icon={Plus} to="/leads/new">
              New lead
            </Button>
          </>
        }
      />

      <div className="pipeline-summary">
        <div>
          <span>Open pipeline</span>
          <strong className="num">{loading && !data ? "—" : formatCurrency(openValue)}</strong>
        </div>
        <div>
          <span>Weighted forecast</span>
          <strong className="num">{loading && !data ? "—" : formatCurrency(weighted)}</strong>
        </div>
        <div>
          <span>Open deals</span>
          <strong className="num">{loading && !data ? "—" : openCount}</strong>
        </div>
        <div>
          <span>Won</span>
          <strong className="num">{loading && !data ? "—" : formatCurrency(wonValue)}</strong>
        </div>
      </div>

      <div className="pipeline-toolbar">
        <SearchInput className="toolbar__search" value={filters.q} onChange={(q) => setFilters({ q }, { resetPage: false })} placeholder="Filter deals…" />
        {isPrivileged(user) && <AssigneeSelect size="sm" value={filters.assignedTo} onChange={(assignedTo) => setFilters({ assignedTo }, { resetPage: false })} emptyLabel="All owners" aria-label="Filter by owner" className="pipeline-toolbar__select" />}
        <Select size="sm" className="pipeline-toolbar__select" value={filters.source} onChange={(e) => setFilters({ source: e.target.value }, { resetPage: false })} options={LEAD_SOURCES} placeholder="All sources" aria-label="Filter by source" />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ q: "", assignedTo: "", source: "" }, { resetPage: false })}>
            Clear
          </Button>
        )}
      </div>

      {error && !data ? (
        <div className="panel">
          <EmptyState icon={RefreshCw} title="Couldn't load the pipeline" description={error.message} action={<Button onClick={() => reload()}>Try again</Button>} />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={({ active }) => setActiveLead(active.data.current?.lead)}
          onDragCancel={() => setActiveLead(null)}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements: {
              onDragStart: ({ active }) => `Picked up ${active.data.current?.lead?.name}.`,
              onDragOver: ({ over }) => (over ? `Over ${labelFor(LEAD_STAGES, over.id)}.` : "Not over a stage."),
              onDragEnd: ({ over, active }) => (over ? `Moved ${active.data.current?.lead?.name} to ${labelFor(LEAD_STAGES, over.id)}.` : "Drop cancelled."),
              onDragCancel: () => "Drop cancelled.",
            },
          }}
        >
          <div className="board">
            {LEAD_STAGES.map((stage) => (
              <Column key={stage.value} stage={stage} leads={grouped[stage.value]} loading={loading && !data} onMove={move} onConvert={setConverting} busyId={busyId} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>{activeLead ? <LeadCard lead={activeLead} overlay /> : null}</DragOverlay>
        </DndContext>
      )}

      <Modal
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
          const lead = lostPrompt;
          setLostPrompt(null);
          move(lead, "lost", lostReason.trim());
        }}
        open={Boolean(lostPrompt)}
        onClose={() => setLostPrompt(null)}
        size="sm"
        title={`Mark ${lostPrompt?.company || lostPrompt?.name} as lost`}
        description="A short reason helps the team learn from lost deals."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLostPrompt(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Mark as lost
            </Button>
          </>
        }
      >
        <Input label="Reason" optional placeholder="Went with a competitor" value={lostReason} onChange={(e) => setLostReason(e.target.value)} maxLength={300} />
      </Modal>

      <ConvertLeadModal open={Boolean(converting)} lead={converting} onClose={() => setConverting(null)} />
    </>
  );
}
