import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, CheckSquare, MoreHorizontal, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { taskService } from "../services";
import useAsync from "../hooks/useAsync";
import useQueryState from "../hooks/useQueryState";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, ConfirmDialog, DueDate, Dropdown, EmptyState, MenuItem, MenuSeparator, PageHeader, Pagination, Person, Priority, Segmented, Select, Skeleton, TaskStatus } from "../components/ui";
import SearchInput from "../components/crm/SearchInput";
import AssigneeSelect from "../components/crm/AssigneeSelect";
import TaskFormModal from "../components/crm/TaskFormModal";
import { TASK_PRIORITIES, TASK_STATUSES, labelFor } from "../utils/constants";
import { canDeleteTask, isPrivileged } from "../utils/permissions";

const DEFAULTS = { status: "pending", q: "", priority: "", due: "", assignedTo: "", sort: "dueDate", page: 1 };

function TaskRow({ task, onToggle, onEdit, onStatus, onDelete, canDelete, showAssignee }) {
  const done = task.status === "completed";
  return (
    <li className={`task-row ${done ? "task-row--done" : ""}`}>
      <input type="checkbox" className="task-check" checked={done} onChange={() => onToggle(task)} aria-label={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`} />
      <button type="button" className="task-row__main" onClick={() => onEdit(task)}>
        <span className="task-row__title">{task.title}</span>
        <span className="task-row__meta">
          {task.relatedCustomer && (
            <span className="task-row__link">
              <Building2 />
              {task.relatedCustomer.name}
            </span>
          )}
          {task.relatedLead && (
            <span className="task-row__link">
              <Target />
              {task.relatedLead.name}
            </span>
          )}
          {task.description && !task.relatedCustomer && !task.relatedLead && <span className="truncate">{task.description}</span>}
        </span>
      </button>
      <div className="task-row__cells">
        <span className="task-row__status">
          <TaskStatus status={task.status} />
        </span>
        <Priority value={task.priority} />
        {showAssignee && (
          <span className="task-row__assignee">
            <Person user={task.assignedTo} />
          </span>
        )}
        <span className="task-row__due">
          <DueDate value={task.dueDate} completed={done} />
        </span>
        <Dropdown
          width={190}
          trigger={({ toggle, open }) => (
            <button type="button" className="icon-button" onClick={toggle} aria-expanded={open} aria-label={`Actions for ${task.title}`}>
              <MoreHorizontal />
            </button>
          )}
        >
          <MenuItem icon={Pencil} onClick={() => onEdit(task)}>
            Edit task
          </MenuItem>
          <MenuSeparator />
          <div className="menu__label">Set status</div>
          {TASK_STATUSES.filter((s) => s.value !== task.status).map((status) => (
            <MenuItem key={status.value} onClick={() => onStatus(task, status.value)}>
              <span className="status">
                <span className="status__dot" style={{ background: status.color }} />
                {status.label}
              </span>
            </MenuItem>
          ))}
          {canDelete && (
            <>
              <MenuSeparator />
              <MenuItem icon={Trash2} danger onClick={() => onDelete(task)}>
                Delete
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>
    </li>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useQueryState(DEFAULTS);
  const [modal, setModal] = useState({ open: false, task: null });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload, setData } = useAsync(
    () => taskService.list({ ...filters, status: filters.status === "all" ? "" : filters.status, limit: 25 }),
    [filters.status, filters.q, filters.priority, filters.due, filters.assignedTo, filters.sort, filters.page]
  );

  const deepLinkTask = params.get("task");
  const openNew = params.get("new");

  useEffect(() => {
    if (openNew) {
      setModal({ open: true, task: null });
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("new");
        return next;
      }, { replace: true });
    }
  }, [openNew]);

  useEffect(() => {
    if (!deepLinkTask) return;
    taskService
      .get(deepLinkTask)
      .then((res) => setModal({ open: true, task: res.task }))
      .catch((err) => toast.error("Task unavailable", err.message))
      .finally(() =>
        setParams((p) => {
          const next = new URLSearchParams(p);
          next.delete("task");
          return next;
        }, { replace: true })
      );
  }, [deepLinkTask]);

  const updateStatus = async (task, status) => {
    const previous = task.status;
    setData((d) => ({ ...d, items: d.items.map((t) => (t._id === task._id ? { ...t, status } : t)) }));
    try {
      await taskService.update(task._id, { status });
      toast.success(status === "completed" ? "Task completed" : "Task updated", status === "completed" ? task.title : `Marked as ${labelFor(TASK_STATUSES, status).toLowerCase()}.`);
      reload({ silent: true });
    } catch (err) {
      setData((d) => ({ ...d, items: d.items.map((t) => (t._id === task._id ? { ...t, status: previous } : t)) }));
      toast.error("Couldn't update task", err.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await taskService.remove(pendingDelete._id);
      toast.success("Task deleted");
      setPendingDelete(null);
      reload({ silent: true });
    } catch (err) {
      toast.error("Couldn't delete task", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const summary = data?.summary;
  const hasFilters = filters.q || filters.priority || filters.due || filters.assignedTo;
  const clear = () => setFilters({ q: "", priority: "", due: "", assignedTo: "" });

  return (
    <>
      <PageHeader
        title="Tasks"
        description={isPrivileged(user) ? "Follow-ups and to-dos across the team." : "Your follow-ups and to-dos."}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setModal({ open: true, task: null })}>
            New task
          </Button>
        }
      />

      <div className="task-summary">
        {[
          { label: "To do", value: summary?.todo, status: "todo" },
          { label: "In progress", value: summary?.in_progress, status: "in_progress" },
          { label: "Overdue", value: summary?.overdue, due: "overdue", tone: "danger" },
          { label: "Completed", value: summary?.completed, status: "completed" },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className={`task-summary__item ${(item.status && filters.status === item.status && !filters.due) || (item.due && filters.due === item.due) ? "is-active" : ""}`}
            onClick={() => (item.due ? setFilters({ due: item.due, status: "pending" }) : setFilters({ status: item.status, due: "" }))}
          >
            <span>{item.label}</span>
            <strong className="num" style={item.tone === "danger" && item.value ? { color: "var(--danger-text)" } : undefined}>
              {summary ? item.value : "—"}
            </strong>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          <Segmented
            ariaLabel="Status"
            value={filters.status}
            onChange={(status) => setFilters({ status })}
            options={[
              { value: "pending", label: "Pending" },
              { value: "todo", label: "To do" },
              { value: "in_progress", label: "In progress" },
              { value: "completed", label: "Completed" },
              { value: "all", label: "All" },
            ]}
          />
          <div className="toolbar__spacer" />
          <SearchInput className="toolbar__search" value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search tasks…" />
          <Select size="sm" value={filters.priority} onChange={(e) => setFilters({ priority: e.target.value })} options={TASK_PRIORITIES} placeholder="Any priority" aria-label="Priority" />
          <Select
            size="sm"
            value={filters.due}
            onChange={(e) => setFilters({ due: e.target.value })}
            options={[
              { value: "overdue", label: "Overdue" },
              { value: "today", label: "Due today" },
              { value: "week", label: "Due this week" },
              { value: "none", label: "No due date" },
            ]}
            placeholder="Any due date"
            aria-label="Due date"
          />
          {isPrivileged(user) ? (
            <AssigneeSelect size="sm" value={filters.assignedTo} onChange={(assignedTo) => setFilters({ assignedTo })} emptyLabel="Everyone" aria-label="Assignee">
              <option value="me">Assigned to me</option>
            </AssigneeSelect>
          ) : (
            <Select size="sm" value={filters.assignedTo} onChange={(e) => setFilters({ assignedTo: e.target.value })} placeholder="Mine & created by me" options={[{ value: "me", label: "Assigned to me" }]} aria-label="Assignee" />
          )}
          <Select
            size="sm"
            value={filters.sort}
            onChange={(e) => setFilters({ sort: e.target.value })}
            options={[
              { value: "dueDate", label: "Sort: Due date" },
              { value: "priority", label: "Sort: Priority" },
              { value: "createdAt", label: "Sort: Newest" },
            ]}
            aria-label="Sort"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={clear}>
              Clear
            </Button>
          )}
        </div>

        {error && !data ? (
          <EmptyState icon={CheckSquare} title="Couldn't load tasks" description={error.message} action={<Button onClick={() => reload()}>Try again</Button>} />
        ) : loading && !data ? (
          <div style={{ padding: 16, display: "grid", gap: 18 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Skeleton width={16} height={16} />
                <Skeleton width={`${50 + (i % 3) * 12}%`} />
              </div>
            ))}
          </div>
        ) : data.items.length === 0 ? (
          hasFilters || filters.status !== "pending" ? (
            <EmptyState icon={CheckSquare} title="No tasks match" description="Try another status or clear your filters." action={<Button onClick={() => setFilters({ q: "", priority: "", due: "", assignedTo: "", status: "pending" })}>Reset filters</Button>} />
          ) : (
            <EmptyState icon={CheckSquare} title="You're all caught up" description="No pending tasks. Create one to plan your next follow-up." action={<Button variant="primary" icon={Plus} onClick={() => setModal({ open: true, task: null })}>New task</Button>} />
          )
        ) : (
          <ul className="task-list" style={{ opacity: loading ? 0.6 : 1 }}>
            {data.items.map((task) => (
              <TaskRow
                key={task._id}
                task={task}
                showAssignee={isPrivileged(user)}
                canDelete={canDeleteTask(user, task)}
                onToggle={(t) => updateStatus(t, t.status === "completed" ? "todo" : "completed")}
                onStatus={updateStatus}
                onEdit={(t) => setModal({ open: true, task: t })}
                onDelete={setPendingDelete}
              />
            ))}
          </ul>
        )}

        {data?.items?.length > 0 && data.pagination.pages > 1 && (
          <div className="panel__footer">
            <Pagination pagination={data.pagination} onPageChange={(page) => setFilters({ page }, { resetPage: false })} label="tasks" />
          </div>
        )}
      </div>

      <TaskFormModal open={modal.open} task={modal.task} onClose={() => setModal({ open: false, task: null })} onSaved={() => reload({ silent: true })} />

      <ConfirmDialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} loading={deleting} title="Delete this task?" description={pendingDelete?.title} confirmLabel="Delete task" />
    </>
  );
}
