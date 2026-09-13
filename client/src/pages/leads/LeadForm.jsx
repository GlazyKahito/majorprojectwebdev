import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Target } from "lucide-react";
import { leadService } from "../../services";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button, EmptyState, FormError, Input, PageHeader, PageLoader, Select, Textarea } from "../../components/ui";
import AssigneeSelect from "../../components/crm/AssigneeSelect";
import { LEAD_SOURCES, LEAD_STAGES } from "../../utils/constants";
import { currencySymbol, fromInputDate, toInputDate } from "../../utils/format";
import { isPrivileged } from "../../utils/permissions";

const EMPTY = {
  name: "",
  company: "",
  title: "",
  email: "",
  phone: "",
  source: "website",
  status: "new",
  value: "",
  assignedTo: "",
  followUpDate: "",
  followUpNote: "",
  expectedCloseDate: "",
  lostReason: "",
  note: "",
};

function Section({ title, description, children }) {
  return (
    <section className="form-section">
      <div className="form-section__intro">
        <h2 className="form-section__title">{title}</h2>
        {description && <p className="form-section__description">{description}</p>}
      </div>
      <div className="form-grid">{children}</div>
    </section>
  );
}

export default function LeadForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const initialStatus = LEAD_STAGES.some((s) => s.value === params.get("status")) ? params.get("status") : "new";
  const [form, setForm] = useState({ ...EMPTY, status: initialStatus, assignedTo: user?._id || "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    leadService
      .get(id)
      .then(({ lead }) =>
        setForm({
          ...EMPTY,
          name: lead.name,
          company: lead.company || "",
          title: lead.title || "",
          email: lead.email || "",
          phone: lead.phone || "",
          source: lead.source,
          status: lead.status,
          value: lead.value ?? "",
          assignedTo: lead.assignedTo?._id || "",
          followUpDate: toInputDate(lead.followUpDate),
          followUpNote: lead.followUpNote || "",
          expectedCloseDate: toInputDate(lead.expectedCloseDate),
          lostReason: lead.lostReason || "",
        })
      )
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [id, editing]);

  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter the lead's name";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
    if (form.value !== "" && Number(form.value) < 0) next.value = "Deal value can't be negative";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    const payload = {
      ...form,
      name: form.name.trim(),
      value: form.value === "" ? 0 : Number(form.value),
      followUpDate: form.followUpDate ? fromInputDate(form.followUpDate, 10) : null,
      expectedCloseDate: form.expectedCloseDate ? fromInputDate(form.expectedCloseDate, 17) : null,
    };
    if (!payload.note) delete payload.note;
    if (!isPrivileged(user)) delete payload.assignedTo;
    if (payload.status !== "lost") payload.lostReason = "";

    setSaving(true);
    try {
      const res = editing ? await leadService.update(id, payload) : await leadService.create(payload);
      toast.success(editing ? "Lead updated" : "Lead created", editing ? undefined : res.lead.assignedTo && res.lead.assignedTo._id !== user._id ? `Assigned to ${res.lead.assignedTo.name}` : undefined);
      navigate(`/leads/${res.lead._id}`, { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.message);
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (loadError) return <EmptyState icon={Target} title="Lead not found" description={loadError.message} action={<Button to="/leads">Back to leads</Button>} />;

  return (
    <form onSubmit={submit} noValidate className="form-page">
      <PageHeader
        breadcrumbs={[{ label: "Leads", to: "/leads" }, ...(editing ? [{ label: form.name || "Lead", to: `/leads/${id}` }] : []), { label: editing ? "Edit" : "New lead" }]}
        title={editing ? "Edit lead" : "New lead"}
        description={editing ? "Update the opportunity, its stage and next follow-up." : "Capture an opportunity and decide who owns it."}
      />

      {formError && (
        <div style={{ marginBottom: 20 }}>
          <FormError error={formError} />
        </div>
      )}

      <div className="panel form-panel">
        <Section title="Contact" description="The person you're selling to.">
          <Input label="Full name" placeholder="Kavya Iyer" value={form.name} onChange={set("name")} error={errors.name} autoFocus maxLength={120} />
          <Input label="Company" optional placeholder="Saffron Hospitality" value={form.company} onChange={set("company")} maxLength={120} />
          <Input label="Job title" optional placeholder="Director of Operations" value={form.title} onChange={set("title")} maxLength={80} />
          <Input label="Email" optional type="email" placeholder="name@company.com" value={form.email} onChange={set("email")} error={errors.email} />
          <Input label="Phone" optional type="tel" value={form.phone} onChange={set("phone")} maxLength={30} />
          <Select label="Source" value={form.source} onChange={set("source")} options={LEAD_SOURCES} />
        </Section>

        <Section title="Opportunity" description="Deal size, stage and ownership.">
          <Input label="Deal value" type="number" min="0" step="500" inputMode="decimal" placeholder={`${currencySymbol()}0`} value={form.value} onChange={set("value")} error={errors.value} />
          <Select label="Stage" value={form.status} onChange={set("status")} options={LEAD_STAGES} />
          {isPrivileged(user) ? (
            <AssigneeSelect label="Assigned to" value={form.assignedTo} onChange={set("assignedTo")} error={errors.assignedTo} hint="The owner is notified when a lead is assigned." />
          ) : (
            <Input label="Assigned to" value={editing ? "Set by your manager" : user.name} disabled hint="Managers can reassign leads" />
          )}
          <Input label="Expected close" optional type="date" value={form.expectedCloseDate} onChange={set("expectedCloseDate")} />
          {form.status === "lost" && <Input label="Lost reason" fieldClassName="span-full" placeholder="Chose a competitor, budget frozen…" value={form.lostReason} onChange={set("lostReason")} maxLength={300} />}
        </Section>

        <Section title="Follow-up" description="You'll get a reminder when the date is close.">
          <Input label="Follow-up date" optional type="date" value={form.followUpDate} onChange={set("followUpDate")} />
          <Input label="What's next" optional placeholder="Send case study, schedule demo…" value={form.followUpNote} onChange={set("followUpNote")} maxLength={500} />
          {!editing && <Textarea label="First note" optional fieldClassName="span-full" rows={4} placeholder="How you met, what they need, budget signals…" value={form.note} onChange={set("note")} maxLength={2000} />}
          {editing && <Textarea label="Add a note" optional fieldClassName="span-full" rows={3} placeholder="Appended to the lead's notes" value={form.note} onChange={set("note")} maxLength={2000} />}
        </Section>
      </div>

      <div className="form-footer">
        <Button variant="secondary" onClick={() => navigate(editing ? `/leads/${id}` : "/leads")} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving}>
          {editing ? "Save changes" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
