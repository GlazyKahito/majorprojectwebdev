import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, CalendarClock, Check, CheckSquare, Mail, Pencil, Phone, Plus, Repeat, Target, Trash2 } from "lucide-react";
import { leadService, taskService } from "../../services";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Avatar, Button, ConfirmDialog, CustomerStatus, DueDate, EmptyState, Modal, PageHeader, PageLoader, Panel, Person, Priority, Tabs, Textarea, Input } from "../../components/ui";
import ActivityTimeline from "../../components/crm/ActivityTimeline";
import InteractionComposer from "../../components/crm/InteractionComposer";
import TaskFormModal from "../../components/crm/TaskFormModal";
import ConvertLeadModal from "../../components/crm/ConvertLeadModal";
import { LEAD_SOURCES, LEAD_STAGES, OPEN_STAGES, labelFor } from "../../utils/constants";
import { formatCurrency, formatDate, formatDateTime, fromInputDate, timeAgo, toInputDate } from "../../utils/format";
import { can, isPrivileged } from "../../utils/permissions";

function StageStepper({ status, onChange, disabled }) {
  const openIndex = OPEN_STAGES.indexOf(status);
  const closed = status === "won" || status === "lost";
  return (
    <div className="stepper" role="group" aria-label="Pipeline stage">
      {LEAD_STAGES.map((stage, index) => {
        const isCurrent = stage.value === status;
        const isOpenStage = OPEN_STAGES.includes(stage.value);
        const done = isOpenStage && (closed ? true : index < openIndex);
        return (
          <button
            key={stage.value}
            type="button"
            className={`stepper__step ${isCurrent ? "is-current" : ""} ${done ? "is-done" : ""} stepper__step--${stage.value}`}
            onClick={() => !isCurrent && onChange(stage.value)}
            disabled={disabled}
            aria-pressed={isCurrent}
            style={{ "--stage": stage.color }}
          >
            {done && !isCurrent ? <Check /> : <span className="stepper__dot" />}
            {stage.label}
          </button>
        );
      })}
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("notes");
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [followOpen, setFollowOpen] = useState(false);
  const [follow, setFollow] = useState({ date: "", note: "" });
  const [followSaving, setFollowSaving] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingNote, setPendingNote] = useState(null);

  const lead = useAsync(() => leadService.get(id), [id]);
  const activity = useAsync(() => leadService.activities(id), [id]);
  const tasks = useAsync(() => taskService.list({ lead: id, limit: 50 }), [id]);

  if (lead.loading && !lead.data) return <PageLoader />;
  if (lead.error && !lead.data) {
    return (
      <EmptyState
        icon={Target}
        title={lead.error.status === 404 ? "Lead not found" : "Couldn't load lead"}
        description={lead.error.status === 404 ? "It may have been deleted, or it isn't assigned to you." : lead.error.message}
        action={<Button to="/leads">Back to leads</Button>}
      />
    );
  }

  const l = lead.data.lead;
  const refresh = () => {
    lead.reload({ silent: true });
    activity.reload({ silent: true });
  };

  const changeStage = async (status, reason) => {
    if (status === "lost" && reason === undefined) {
      setLostReason(l.lostReason || "");
      setLostOpen(true);
      return;
    }
    setStageSaving(true);
    try {
      const res = await leadService.updateStatus(l._id, { status, ...(reason !== undefined ? { lostReason: reason } : {}) });
      lead.setData((d) => ({ ...d, lead: { ...d.lead, status: res.lead.status, closedAt: res.lead.closedAt, lostReason: res.lead.lostReason } }));
      toast.success("Stage updated", `${l.name} moved to ${labelFor(LEAD_STAGES, status)}.`);
      setLostOpen(false);
      activity.reload({ silent: true });
    } catch (error) {
      toast.error("Couldn't update stage", error.message);
    } finally {
      setStageSaving(false);
    }
  };

  const addNote = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      const res = await leadService.addNote(l._id, note.trim());
      lead.setData((d) => ({ ...d, lead: res.lead }));
      setNote("");
      toast.success("Note added");
      activity.reload({ silent: true });
    } catch (error) {
      toast.error("Couldn't add note", error.message);
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async () => {
    try {
      const res = await leadService.removeNote(l._id, pendingNote._id);
      lead.setData((d) => ({ ...d, lead: res.lead }));
      setPendingNote(null);
      toast.success("Note deleted");
    } catch (error) {
      toast.error("Couldn't delete note", error.message);
    }
  };

  const saveFollowUp = async (event) => {
    event.preventDefault();
    setFollowSaving(true);
    try {
      const res = await leadService.update(l._id, { followUpDate: follow.date ? fromInputDate(follow.date, 10) : null, followUpNote: follow.note });
      lead.setData((d) => ({ ...d, lead: res.lead }));
      toast.success(follow.date ? "Follow-up scheduled" : "Follow-up cleared");
      setFollowOpen(false);
      activity.reload({ silent: true });
    } catch (error) {
      toast.error("Couldn't save follow-up", error.message);
    } finally {
      setFollowSaving(false);
    }
  };

  const removeLead = async () => {
    setDeleting(true);
    try {
      await leadService.remove(l._id);
      toast.success("Lead deleted");
      navigate("/leads", { replace: true });
    } catch (error) {
      toast.error("Couldn't delete lead", error.message);
      setDeleting(false);
    }
  };

  const logInteraction = async (payload) => {
    await leadService.addInteraction(l._id, payload);
    activity.reload({ silent: true });
  };

  const isOpen = OPEN_STAGES.includes(l.status);
  const notes = [...(l.notes || [])].reverse();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Leads", to: "/leads" }, { label: l.name }]}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <Avatar name={l.name} size="lg" />
            <span>
              {l.name}
              <span className="page-header__description" style={{ display: "block", marginTop: 2 }}>
                {[l.title, l.company].filter(Boolean).join(" at ") || "No company"}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {can(user, "leads:delete") && (
              <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button variant="secondary" icon={Pencil} to={`/leads/${l._id}/edit`}>
              Edit
            </Button>
            {l.convertedCustomer ? (
              <Button variant="primary" icon={Building2} to={`/customers/${l.convertedCustomer._id}`}>
                View customer
              </Button>
            ) : (
              <Button variant="primary" icon={Repeat} onClick={() => setConvertOpen(true)}>
                Convert
              </Button>
            )}
          </>
        }
      />

      <div className="panel stepper-panel">
        <StageStepper status={l.status} onChange={(status) => changeStage(status)} disabled={stageSaving} />
        {l.status === "lost" && l.lostReason && (
          <div className="stepper-panel__note">
            <span className="subtle">Lost reason:</span> {l.lostReason}
          </div>
        )}
        {l.convertedCustomer && (
          <div className="stepper-panel__note">
            <span className="subtle">Converted {formatDate(l.convertedAt)} to </span>
            <Link to={`/customers/${l.convertedCustomer._id}`} className="link">
              {l.convertedCustomer.name}
            </Link>
          </div>
        )}
      </div>

      <div className="meta-bar">
        <div className="meta-bar__item">
          <span>Deal value</span>
          <strong className="num" style={{ fontSize: 16 }}>
            {formatCurrency(l.value)}
          </strong>
        </div>
        <div className="meta-bar__item">
          <span>Owner</span>
          <Person user={l.assignedTo} />
        </div>
        <div className="meta-bar__item">
          <span>Source</span>
          <strong>{labelFor(LEAD_SOURCES, l.source)}</strong>
        </div>
        <div className="meta-bar__item">
          <span>{isOpen ? "Next follow-up" : "Closed"}</span>
          {isOpen ? <DueDate value={l.followUpDate} /> : <strong>{formatDate(l.closedAt)}</strong>}
        </div>
        <div className="meta-bar__item">
          <span>Created</span>
          <strong>{formatDate(l.createdAt, { year: true })}</strong>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-grid__main">
          <div className="panel">
            <div style={{ padding: "0 16px" }}>
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "notes", label: "Notes", count: l.notes?.length || 0 },
                  { value: "activity", label: "Activity" },
                  { value: "tasks", label: "Tasks", count: tasks.data?.items?.length },
                ]}
              />
            </div>

            {tab === "notes" && (
              <div className="panel__body">
                <form onSubmit={addNote} className="note-composer">
                  <Textarea
                    placeholder="Add a note — call outcome, objections, next steps…"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                    aria-label="New note"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote(e);
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span className="subtle" style={{ fontSize: 12 }}>
                      The lead owner is notified of new notes.
                    </span>
                    <Button type="submit" variant="primary" size="sm" loading={savingNote} disabled={!note.trim()}>
                      Add note
                    </Button>
                  </div>
                </form>
                {notes.length === 0 ? (
                  <EmptyState compact title="No notes yet" description="Notes are shared with everyone who can see this lead." />
                ) : (
                  <ul className="notes">
                    {notes.map((n) => (
                      <li key={n._id} className="note">
                        <Avatar name={n.author?.name || "?"} size="sm" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="note__meta">
                            <strong>{n.author?.name || "Former teammate"}</strong>
                            <span title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                            {(isPrivileged(user) || n.author?._id === user._id) && (
                              <button type="button" className="note__delete" onClick={() => setPendingNote(n)} aria-label="Delete note">
                                <Trash2 />
                              </button>
                            )}
                          </div>
                          <p className="note__body">{n.body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "activity" && (
              <div className="panel__body">
                <InteractionComposer onSubmit={logInteraction} />
                <div style={{ marginTop: 20 }}>
                  <ActivityTimeline items={activity.data?.items} loading={activity.loading && !activity.data} />
                </div>
              </div>
            )}

            {tab === "tasks" && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px 0" }}>
                  <Button size="sm" variant="secondary" icon={Plus} onClick={() => setTaskModal(true)}>
                    Add task
                  </Button>
                </div>
                {tasks.data?.items?.length ? (
                  <ul className="list" style={{ marginTop: 8 }}>
                    {tasks.data.items.map((task) => (
                      <li key={task._id}>
                        <Link to={`/tasks?task=${task._id}`} className="list__row">
                          <span className="list__icon">
                            <CheckSquare />
                          </span>
                          <span className="list__main">
                            <span className={`list__title truncate ${task.status === "completed" ? "is-done" : ""}`}>{task.title}</span>
                            <span className="list__sub">{task.assignedTo?.name}</span>
                          </span>
                          <span className="list__aside">
                            <Priority value={task.priority} showLabel={false} />
                            <DueDate value={task.dueDate} completed={task.status === "completed"} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact icon={CheckSquare} title="No tasks for this lead" description="Create a task to plan the next touchpoint." />
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="detail-grid__side">
          <Panel
            title="Follow-up"
            actions={
              isOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={CalendarClock}
                  onClick={() => {
                    setFollow({ date: toInputDate(l.followUpDate), note: l.followUpNote || "" });
                    setFollowOpen(true);
                  }}
                >
                  {l.followUpDate ? "Reschedule" : "Schedule"}
                </Button>
              )
            }
          >
            {isOpen ? (
              l.followUpDate ? (
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <strong>{formatDate(l.followUpDate, { year: true })}</strong>
                    <DueDate value={l.followUpDate} />
                  </div>
                  <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                    {l.followUpNote || "No agenda set"}
                  </p>
                </div>
              ) : (
                <p className="subtle" style={{ fontSize: 13 }}>
                  No follow-up scheduled. Leads without a next step go cold quickly.
                </p>
              )
            ) : (
              <p className="subtle" style={{ fontSize: 13 }}>
                This deal is closed.
              </p>
            )}
          </Panel>

          <Panel title="Contact">
            <ul className="contact-list">
              <li>
                <Mail />
                {l.email ? <a href={`mailto:${l.email}`} className="link truncate">{l.email}</a> : <span className="subtle">No email</span>}
              </li>
              <li>
                <Phone />
                {l.phone ? <a href={`tel:${l.phone.replace(/\s/g, "")}`}>{l.phone}</a> : <span className="subtle">No phone</span>}
              </li>
              <li>
                <Building2 />
                {l.company || <span className="subtle">No company</span>}
              </li>
            </ul>
            <hr className="divider" style={{ margin: "16px 0" }} />
            <dl className="dl">
              <dt>Expected close</dt>
              <dd>{l.expectedCloseDate ? formatDate(l.expectedCloseDate, { year: true }) : "—"}</dd>
              <dt>Created by</dt>
              <dd>{l.createdBy?.name || "—"}</dd>
              <dt>Last updated</dt>
              <dd>{timeAgo(l.updatedAt)}</dd>
            </dl>
          </Panel>

          {l.convertedCustomer && (
            <Panel title="Customer record">
              <Link to={`/customers/${l.convertedCustomer._id}`} className="linked-record">
                <Building2 className="icon-md subtle" />
                <span className="list__main">
                  <span className="list__title truncate">{l.convertedCustomer.name}</span>
                  <span className="list__sub truncate">{l.convertedCustomer.company}</span>
                </span>
                <CustomerStatus status={l.convertedCustomer.status} />
              </Link>
            </Panel>
          )}
        </aside>
      </div>

      <Modal
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
          changeStage("lost", lostReason.trim());
        }}
        open={lostOpen}
        onClose={() => setLostOpen(false)}
        size="sm"
        title="Mark as lost"
        description="Recording why deals are lost helps the team spot patterns."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLostOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" loading={stageSaving}>
              Mark as lost
            </Button>
          </>
        }
      >
        <Input label="Reason" optional placeholder="Chose a competitor, no budget…" value={lostReason} onChange={(e) => setLostReason(e.target.value)} maxLength={300} />
      </Modal>

      <Modal
        as="form"
        onSubmit={saveFollowUp}
        open={followOpen}
        onClose={() => setFollowOpen(false)}
        size="sm"
        title="Schedule follow-up"
        description="The owner gets a reminder 24 hours before."
        footer={
          <>
            {l.followUpDate && (
              <Button variant="ghost" style={{ marginRight: "auto" }} onClick={() => setFollow({ date: "", note: "" })}>
                Clear
              </Button>
            )}
            <Button variant="secondary" onClick={() => setFollowOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={followSaving}>
              Save
            </Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 14 }}>
          <Input label="Date" type="date" value={follow.date} onChange={(e) => setFollow((f) => ({ ...f, date: e.target.value }))} />
          <Input label="Agenda" optional placeholder="Walk through proposal" value={follow.note} onChange={(e) => setFollow((f) => ({ ...f, note: e.target.value }))} maxLength={500} />
        </div>
      </Modal>

      <ConvertLeadModal open={convertOpen} lead={l} onClose={() => setConvertOpen(false)} onConverted={refresh} />

      <TaskFormModal open={taskModal} onClose={() => setTaskModal(false)} defaults={{ relatedLead: l._id }} onSaved={() => tasks.reload({ silent: true })} />

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={removeLead} loading={deleting} title={`Delete ${l.name}?`} description="The lead, its notes and activity will be permanently removed." confirmLabel="Delete lead" />

      <ConfirmDialog open={Boolean(pendingNote)} onClose={() => setPendingNote(null)} onConfirm={removeNote} title="Delete this note?" description={pendingNote?.body?.slice(0, 140)} confirmLabel="Delete note" />
    </>
  );
}
