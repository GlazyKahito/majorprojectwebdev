import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Target } from "lucide-react";
import { Button, Modal, Select, Switch } from "../ui";
import { leadService } from "../../services";
import { useToast } from "../../context/ToastContext";
import { CUSTOMER_STATUSES, INDUSTRIES } from "../../utils/constants";
import { formatCurrency } from "../../utils/format";

export default function ConvertLeadModal({ open, onClose, lead, onConverted }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [industry, setIndustry] = useState("Other");
  const [status, setStatus] = useState("active");
  const [markWon, setMarkWon] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await leadService.convert(lead._id, { industry, status, markWon });
      toast.success("Lead converted", `${res.customer.name} is now a customer.`);
      onConverted?.(res);
      onClose();
      navigate(`/customers/${res.customer._id}`);
    } catch (error) {
      toast.error("Conversion failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      dismissible={!saving}
      title="Convert to customer"
      description="Creates a customer record from this lead and carries over its notes, tasks and history."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} iconRight={ArrowRight}>
            Convert lead
          </Button>
        </>
      }
    >
      <div className="convert-flow">
        <div className="convert-flow__card">
          <Target className="icon-md subtle" />
          <div className="truncate">
            <div style={{ fontWeight: 500 }} className="truncate">
              {lead.name}
            </div>
            <div className="subtle truncate" style={{ fontSize: 12.5 }}>
              Lead · {formatCurrency(lead.value)}
            </div>
          </div>
        </div>
        <ArrowRight className="icon-md subtle" />
        <div className="convert-flow__card">
          <Building2 className="icon-md subtle" />
          <div className="truncate">
            <div style={{ fontWeight: 500 }} className="truncate">
              {lead.company || lead.name}
            </div>
            <div className="subtle" style={{ fontSize: 12.5 }}>
              Customer
            </div>
          </div>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 20 }}>
        <Select label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} options={INDUSTRIES} />
        <Select label="Customer status" value={status} onChange={(e) => setStatus(e.target.value)} options={CUSTOMER_STATUSES} />
        {lead.status !== "won" && (
          <label className="span-full setting-row" style={{ padding: 0, border: "none" }}>
            <span>
              <span style={{ fontWeight: 500, display: "block" }}>Mark deal as won</span>
              <span className="subtle" style={{ fontSize: 12.5 }}>
                Moves the lead to Won and counts {formatCurrency(lead.value)} toward closed revenue.
              </span>
            </span>
            <Switch checked={markWon} onChange={setMarkWon} label="Mark deal as won" />
          </label>
        )}
      </div>
    </Modal>
  );
}
