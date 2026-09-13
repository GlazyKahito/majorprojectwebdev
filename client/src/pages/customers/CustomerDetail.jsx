import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, CheckSquare, Globe, Mail, MapPin, Pencil, Phone, Plus, Target, Trash2 } from "lucide-react";
import { customerService, taskService } from "../../services";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Avatar, Button, ConfirmDialog, CustomerStatus, DueDate, EmptyState, LeadStage, PageHeader, PageLoader, Panel, Person, Priority, Segmented, TaskStatus } from "../../components/ui";
import ActivityTimeline from "../../components/crm/ActivityTimeline";
import InteractionComposer from "../../components/crm/InteractionComposer";
import TaskFormModal from "../../components/crm/TaskFormModal";
import { formatAddress, formatCurrency, formatDate, timeAgo } from "../../utils/format";
import { can, isPrivileged } from "../../utils/permissions";

const HISTORY_FILTERS = [
  { value: "", label: "All" },
  { value: "call", label: "Calls" },
  { value: "email", label: "Emails" },
  { value: "meeting", label: "Meetings" },
  { value: "note", label: "Notes" },
];

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [historyFilter, setHistoryFilter] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [pendingActivity, setPendingActivity] = useState(null);

  const customer = useAsync(() => customerService.get(id), [id]);
  const history = useAsync(() => customerService.activities(id, { type: historyFilter }), [id, historyFilter]);
  const tasks = useAsync(() => taskService.list({ customer: id, limit: 50 }), [id]);

  if (customer.loading && !customer.data) return <PageLoader />;

  if (customer.error && !customer.data) {
    return (
      <EmptyState
        icon={Building2}
        title={customer.error.status === 404 ? "Customer not found" : "Couldn't load customer"}
        description={customer.error.status === 404 ? "It may have been deleted, or you don't have access to it." : customer.error.message}
        action={<Button to="/customers">Back to customers</Button>}
      />
    );
  }

  const { customer: c, summary } = customer.data;
  const address = formatAddress(c.address);

  const removeCustomer = async () => {
    setDeleting(true);
    try {
      await customerService.remove(c._id);
      toast.success("Customer deleted", `${c.name} was removed.`);
      navigate("/customers", { replace: true });
    } catch (error) {
      toast.error("Couldn't delete customer", error.message);
      setDeleting(false);
    }
  };

  const logInteraction = async (payload) => {
    await customerService.addInteraction(c._id, payload);
    history.reload({ silent: true });
    customer.reload({ silent: true });
  };

  const removeActivity = async () => {
    try {
      await customerService.removeInteraction(c._id, pendingActivity._id);
      toast.success("Interaction removed");
      setPendingActivity(null);
      history.reload({ silent: true });
    } catch (error) {
      toast.error("Couldn't remove interaction", error.message);
    }
  };

  const toggleTask = async (task) => {
    const status = task.status === "completed" ? "todo" : "completed";
    tasks.setData((d) => ({ ...d, items: d.items.map((t) => (t._id === task._id ? { ...t, status } : t)) }));
    try {
      await taskService.update(task._id, { status });
      if (status === "completed") toast.success("Task completed");
      history.reload({ silent: true });
    } catch (error) {
      toast.error("Couldn't update task", error.message);
      tasks.reload({ silent: true });
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Customers", to: "/customers" }, { label: c.name }]}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <Avatar name={c.name} size="lg" />
            <span>
              {c.name}
              <span className="page-header__description" style={{ display: "block", marginTop: 2 }}>
                {[c.company, c.industry].filter(Boolean).join(" · ")}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {can(user, "customers:delete") && (
              <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            )}
            <Button variant="secondary" icon={Plus} onClick={() => setTaskModal(true)}>
              Task
            </Button>
            <Button variant="primary" icon={Pencil} to={`/customers/${c._id}/edit`}>
              Edit
            </Button>
          </>
        }
      />

      <div className="meta-bar">
        <div className="meta-bar__item">
          <span>Status</span>
          <CustomerStatus status={c.status} />
        </div>
        <div className="meta-bar__item">
          <span>Owner</span>
          <Person user={c.assignedTo} />
        </div>
        <div className="meta-bar__item">
          <span>Lifetime value</span>
          <strong className="num">{formatCurrency(c.lifetimeValue)}</strong>
        </div>
        <div className="meta-bar__item">
          <span>Last interaction</span>
          <strong>{c.lastInteractionAt ? timeAgo(c.lastInteractionAt) : "Never"}</strong>
        </div>
        <div className="meta-bar__item">
          <span>Open tasks</span>
          <strong className="num">{summary.openTasks}</strong>
        </div>
        <div className="meta-bar__item">
          <span>Customer since</span>
          <strong>{formatDate(c.createdAt, { year: true })}</strong>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-grid__main">
          <Panel title="Interaction history" description="Log calls, emails and meetings to keep the whole team in context.">
            <InteractionComposer onSubmit={logInteraction} />
            <div className="history-filter">
              <Segmented ariaLabel="Filter history" value={historyFilter} onChange={setHistoryFilter} options={HISTORY_FILTERS} />
            </div>
            <ActivityTimeline
              items={history.data?.items}
              loading={history.loading && !history.data}
              onDelete={setPendingActivity}
              canDelete={(item) => isPrivileged(user) || item.actor?._id === user._id}
              emptyText={historyFilter ? "No interactions of this type yet." : undefined}
            />
          </Panel>
        </div>

        <aside className="detail-grid__side">
          <Panel title="Details">
            <ul className="contact-list">
              <li>
                <Mail />
                {c.email ? <a href={`mailto:${c.email}`} className="link truncate">{c.email}</a> : <span className="subtle">No email</span>}
              </li>
              <li>
                <Phone />
                {c.phone ? <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="truncate">{c.phone}</a> : <span className="subtle">No phone</span>}
              </li>
              <li>
                <Globe />
                {c.website ? (
                  <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="link truncate">
                    {c.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span className="subtle">No website</span>
                )}
              </li>
              <li>
                <MapPin />
                {address ? <span>{address}</span> : <span className="subtle">No address</span>}
              </li>
            </ul>
            <hr className="divider" style={{ margin: "16px 0" }} />
            <dl className="dl">
              <dt>Industry</dt>
              <dd>{c.industry}</dd>
              <dt>Created by</dt>
              <dd>{c.createdBy?.name || "—"}</dd>
              <dt>Last updated</dt>
              <dd>{timeAgo(c.updatedAt)}</dd>
            </dl>
          </Panel>

          {c.convertedFromLead && (
            <Panel title="Converted from lead">
              <Link to={`/leads/${c.convertedFromLead._id}`} className="linked-record">
                <Target className="icon-md subtle" />
                <span className="list__main">
                  <span className="list__title truncate">{c.convertedFromLead.name}</span>
                  <span className="list__sub">{formatCurrency(c.convertedFromLead.value)} deal</span>
                </span>
                <LeadStage status={c.convertedFromLead.status} />
              </Link>
            </Panel>
          )}

          <Panel
            title="Tasks"
            bodyClassName={null}
            actions={
              <Button variant="ghost" size="sm" icon={Plus} onClick={() => setTaskModal(true)}>
                Add
              </Button>
            }
          >
            {tasks.loading && !tasks.data ? (
              <div className="panel__body subtle">Loading tasks…</div>
            ) : tasks.data?.items?.length ? (
              <ul className="list">
                {tasks.data.items.map((task) => (
                  <li key={task._id} className="list__row list__row--static">
                    <input type="checkbox" className="task-check" checked={task.status === "completed"} onChange={() => toggleTask(task)} aria-label={`Mark ${task.title} ${task.status === "completed" ? "incomplete" : "complete"}`} />
                    <Link to={`/tasks?task=${task._id}`} className="list__main">
                      <span className={`list__title truncate ${task.status === "completed" ? "is-done" : ""}`}>{task.title}</span>
                      <span className="list__sub" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <TaskStatus status={task.status} />
                      </span>
                    </Link>
                    <span className="list__aside">
                      <Priority value={task.priority} showLabel={false} />
                      <DueDate value={task.dueDate} completed={task.status === "completed"} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={CheckSquare} title="No tasks" description="Plan the next step for this account." />
            )}
          </Panel>

          {c.notes && (
            <Panel title="Notes">
              <p className="prose">{c.notes}</p>
            </Panel>
          )}
        </aside>
      </div>

      <TaskFormModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        defaults={{ relatedCustomer: c._id }}
        onSaved={() => {
          tasks.reload({ silent: true });
          customer.reload({ silent: true });
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={removeCustomer}
        loading={deleting}
        title={`Delete ${c.name}?`}
        description="This permanently removes the customer and their interaction history. Tasks stay but are unlinked."
        confirmLabel="Delete customer"
      />

      <ConfirmDialog
        open={Boolean(pendingActivity)}
        onClose={() => setPendingActivity(null)}
        onConfirm={removeActivity}
        title="Remove this interaction?"
        description={pendingActivity?.summary}
        confirmLabel="Remove"
      />
    </>
  );
}
