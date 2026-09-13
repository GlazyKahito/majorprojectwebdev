import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { customerService } from "../../services";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button, EmptyState, FormError, Input, PageHeader, PageLoader, Select, Textarea } from "../../components/ui";
import AssigneeSelect from "../../components/crm/AssigneeSelect";
import { CUSTOMER_STATUSES, INDUSTRIES } from "../../utils/constants";
import { currencySymbol } from "../../utils/format";
import { isPrivileged } from "../../utils/permissions";
import { Building2 } from "lucide-react";

const EMPTY = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  industry: "Technology",
  status: "active",
  assignedTo: "",
  notes: "",
  lifetimeValue: "",
  address: { street: "", city: "", state: "", country: "", postalCode: "" },
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

export default function CustomerForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY, assignedTo: user?._id || "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    customerService
      .get(id)
      .then(({ customer }) =>
        setForm({
          name: customer.name,
          company: customer.company || "",
          email: customer.email || "",
          phone: customer.phone || "",
          website: customer.website || "",
          industry: customer.industry || "Other",
          status: customer.status,
          assignedTo: customer.assignedTo?._id || "",
          notes: customer.notes || "",
          lifetimeValue: customer.lifetimeValue ?? "",
          address: { ...EMPTY.address, ...customer.address },
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

  const setAddress = (field) => (event) => setForm((f) => ({ ...f, address: { ...f.address, [field]: event.target.value } }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter the customer's name";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
    if (form.lifetimeValue !== "" && Number(form.lifetimeValue) < 0) next.lifetimeValue = "Value can't be negative";
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) {
      document.querySelector(".input--invalid")?.focus();
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      lifetimeValue: form.lifetimeValue === "" ? 0 : Number(form.lifetimeValue),
    };
    if (!isPrivileged(user)) delete payload.assignedTo;

    setSaving(true);
    try {
      const res = editing ? await customerService.update(id, payload) : await customerService.create(payload);
      toast.success(editing ? "Customer updated" : "Customer added", editing ? undefined : `${res.customer.name} is ready to go.`);
      navigate(`/customers/${res.customer._id}`, { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.message);
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  if (loadError) {
    return <EmptyState icon={Building2} title="Customer not found" description={loadError.message} action={<Button to="/customers">Back to customers</Button>} />;
  }

  return (
    <form onSubmit={submit} noValidate className="form-page">
      <PageHeader
        breadcrumbs={[{ label: "Customers", to: "/customers" }, ...(editing ? [{ label: form.name || "Customer", to: `/customers/${id}` }] : []), { label: editing ? "Edit" : "New customer" }]}
        title={editing ? "Edit customer" : "Add customer"}
        description={editing ? "Update contact details, ownership and status." : "Create a record for an account your team works with."}
      />

      {formError && (
        <div style={{ marginBottom: 20 }}>
          <FormError error={formError} />
        </div>
      )}

      <div className="panel form-panel">
        <Section title="Contact" description="Who you talk to at this account.">
          <Input label="Full name" placeholder="Ananya Deshpande" value={form.name} onChange={set("name")} error={errors.name} autoFocus maxLength={120} />
          <Input label="Company" optional placeholder="Northwind Logistics" value={form.company} onChange={set("company")} error={errors.company} maxLength={120} />
          <Input label="Email" optional type="email" placeholder="name@company.com" value={form.email} onChange={set("email")} error={errors.email} />
          <Input label="Phone" optional type="tel" placeholder="+91 98200 14521" value={form.phone} onChange={set("phone")} error={errors.phone} maxLength={30} />
          <Input label="Website" optional placeholder="company.com" value={form.website} onChange={set("website")} fieldClassName="span-full" maxLength={200} />
        </Section>

        <Section title="Account" description="How this customer is classified and who owns it.">
          <Select label="Industry" value={form.industry} onChange={set("industry")} options={INDUSTRIES} />
          <Select label="Status" value={form.status} onChange={set("status")} options={CUSTOMER_STATUSES} />
          {isPrivileged(user) ? (
            <AssigneeSelect label="Owner" value={form.assignedTo} onChange={set("assignedTo")} error={errors.assignedTo} />
          ) : (
            <Input label="Owner" value={editing ? "Managed by your manager" : user.name} disabled hint="Managers can reassign customers" />
          )}
          <Input
            label="Lifetime value"
            optional
            type="number"
            min="0"
            step="100"
            inputMode="decimal"
            placeholder={`${currencySymbol()}0`}
            value={form.lifetimeValue}
            onChange={set("lifetimeValue")}
            error={errors.lifetimeValue}
          />
        </Section>

        <Section title="Address" description="Used for territory planning and invoices.">
          <Input label="Street" optional fieldClassName="span-full" value={form.address.street} onChange={setAddress("street")} />
          <Input label="City" optional value={form.address.city} onChange={setAddress("city")} />
          <Input label="State / Region" optional value={form.address.state} onChange={setAddress("state")} />
          <Input label="Country" optional value={form.address.country} onChange={setAddress("country")} />
          <Input label="Postal code" optional value={form.address.postalCode} onChange={setAddress("postalCode")} />
        </Section>

        <Section title="Notes" description="Context the whole team should know.">
          <Textarea fieldClassName="span-full" rows={5} placeholder="Buying process, key stakeholders, renewal timing…" value={form.notes} onChange={set("notes")} maxLength={5000} />
        </Section>
      </div>

      <div className="form-footer">
        <Button variant="secondary" onClick={() => navigate(editing ? `/customers/${id}` : "/customers")} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving}>
          {editing ? "Save changes" : "Add customer"}
        </Button>
      </div>
    </form>
  );
}
