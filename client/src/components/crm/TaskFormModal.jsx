import { useEffect, useState } from "react";
import { Button, FormError, Input, Modal, Select, Textarea } from "../ui";
import AssigneeSelect from "./AssigneeSelect";
import { customerService, leadService, taskService } from "../../services";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { TASK_PRIORITIES, TASK_STATUSES } from "../../utils/constants";
import { fromInputDate, toInputDate } from "../../utils/format";
import { isPrivileged } from "../../utils/permissions";

const idOf = (value) => value?._id ?? value ?? "";

const emptyTask = (user, defaults = {}) => ({
  title: "",
  description: "",
  assignedTo: user?._id || "",
  priority: "medium",
  status: "todo",
  dueDate: toInputDate(new Date(Date.now() + 86400000)),
  relatedCustomer: "",
  relatedLead: "",
  ...defaults,
});

export default function TaskFormModal({ open, onClose, task, defaults, onSaved }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => emptyTask(user, defaults));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ customers: [], leads: [] });

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError("");
    setForm(
      task
        ? {
            title: task.title,
            description: task.description || "",
            assignedTo: idOf(task.assignedTo),
            priority: task.priority,
            status: task.status,
            dueDate: toInputDate(task.dueDate),
            relatedCustomer: idOf(task.relatedCustomer),
            relatedLead: idOf(task.relatedLead),
          }
        : emptyTask(user, defaults)
    );
    Promise.all([customerService.list({ limit: 100, sort: "name" }), leadService.list({ limit: 100, sort: "name" })])
      .then(([customers, leads]) => setOptions({ customers: customers.items, leads: leads.items }))
      .catch(() => setOptions({ customers: [], leads: [] }));
  }, [open, task]);

  const set = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.title.trim().length < 2) {
      setErrors({ title: "Give the task a title" });
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate ? fromInputDate(form.dueDate) : null,
    };
    if (!isPrivileged(user) && !task) payload.assignedTo = user._id;
    try {
      const res = task ? await taskService.update(task._id, payload) : await taskService.create(payload);
      toast.success(task ? "Task updated" : "Task created", task ? undefined : res.task.assignedTo?._id !== user._id ? `Assigned to ${res.task.assignedTo?.name}` : undefined);
      onSaved?.(res.task);
      onClose();
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const withSelected = (list, selected, fallback) => {
    if (!selected || list.some((item) => item._id === selected)) return list;
    return fallback ? [fallback, ...list] : list;
  };

  const customers = withSelected(options.customers, form.relatedCustomer, task?.relatedCustomer?._id ? task.relatedCustomer : null);
  const leads = withSelected(options.leads, form.relatedLead, task?.relatedLead?._id ? task.relatedLead : null);

  return (
    <Modal
      as="form"
      onSubmit={submit}
      open={open}
      onClose={saving ? undefined : onClose}
      dismissible={!saving}
      title={task ? "Edit task" : "New task"}
      description={task ? undefined : "Plan the next step and make sure someone owns it."}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {formError && (
          <div className="span-full">
            <FormError error={formError} />
          </div>
        )}
        <Input fieldClassName="span-full" label="Title" placeholder="Send revised proposal" value={form.title} onChange={(e) => set("title")(e.target.value)} error={errors.title} maxLength={160} data-autofocus />
        <Textarea fieldClassName="span-full" label="Description" optional placeholder="Context, links, what done looks like…" rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} maxLength={4000} />
        {isPrivileged(user) ? (
          <AssigneeSelect label="Assignee" allowEmpty={false} value={form.assignedTo} onChange={set("assignedTo")} error={errors.assignedTo} />
        ) : (
          <Input label="Assignee" value={task?.assignedTo?.name || user.name} disabled hint="Managers can assign tasks to others" />
        )}
        <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => set("dueDate")(e.target.value)} error={errors.dueDate} />
        <Select label="Priority" value={form.priority} onChange={(e) => set("priority")(e.target.value)} options={TASK_PRIORITIES} />
        <Select label="Status" value={form.status} onChange={(e) => set("status")(e.target.value)} options={TASK_STATUSES} />
        <Select label="Related customer" optional value={form.relatedCustomer} onChange={(e) => set("relatedCustomer")(e.target.value)} placeholder="None" error={errors.relatedCustomer}>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
        </Select>
        <Select label="Related lead" optional value={form.relatedLead} onChange={(e) => set("relatedLead")(e.target.value)} placeholder="None" error={errors.relatedLead}>
          {leads.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
              {l.company ? ` · ${l.company}` : ""}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
