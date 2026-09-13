import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KanbanSquare, MoreHorizontal, Pencil, Plus, Repeat, Target, Trash2, X } from "lucide-react";
import { leadService } from "../../services";
import useAsync from "../../hooks/useAsync";
import useQueryState from "../../hooks/useQueryState";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button, ConfirmDialog, DataTable, DueDate, Dropdown, EmptyState, LeadStage, MenuItem, MenuSeparator, PageHeader, Pagination, Person, Select } from "../../components/ui";
import SearchInput from "../../components/crm/SearchInput";
import AssigneeSelect from "../../components/crm/AssigneeSelect";
import ConvertLeadModal from "../../components/crm/ConvertLeadModal";
import { LEAD_SOURCES, LEAD_STAGES, OPEN_STAGES, labelFor } from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/format";
import { can, isPrivileged } from "../../utils/permissions";

const DEFAULTS = { q: "", status: "", source: "", assignedTo: "", followUp: "", sort: "-createdAt", page: 1 };

const STATUS_FILTERS = [{ value: "open", label: "All open stages" }, ...LEAD_STAGES];

export default function Leads() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useQueryState(DEFAULTS);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => leadService.list({ ...filters, limit: 15 }),
    [filters.q, filters.status, filters.source, filters.assignedTo, filters.followUp, filters.sort, filters.page]
  );

  const hasFilters = filters.q || filters.status || filters.source || filters.assignedTo || filters.followUp;
  const clear = () => setFilters({ q: "", status: "", source: "", assignedTo: "", followUp: "" });

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await leadService.remove(pendingDelete._id);
      toast.success("Lead deleted", `${pendingDelete.name} was removed.`);
      setPendingDelete(null);
      reload({ silent: true });
    } catch (err) {
      toast.error("Couldn't delete lead", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const changeStage = async (lead, status) => {
    try {
      await leadService.updateStatus(lead._id, { status });
      toast.success("Stage updated", `${lead.name} moved to ${labelFor(LEAD_STAGES, status)}.`);
      reload({ silent: true });
    } catch (err) {
      toast.error("Couldn't update stage", err.message);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Lead",
      sortable: true,
      minWidth: 220,
      render: (l) => (
        <div className="table__primary">
          <strong className="truncate row-link">{l.name}</strong>
          <span className="truncate">{[l.title, l.company].filter(Boolean).join(" · ") || l.email || "—"}</span>
        </div>
      ),
    },
    { key: "status", header: "Stage", sortable: true, render: (l) => <LeadStage status={l.status} /> },
    { key: "value", header: "Value", sortable: true, align: "right", render: (l) => <span className="num" style={{ fontWeight: 500 }}>{formatCurrency(l.value)}</span> },
    { key: "source", header: "Source", render: (l) => <span className="muted">{labelFor(LEAD_SOURCES, l.source)}</span> },
    { key: "assignedTo", header: "Owner", render: (l) => <Person user={l.assignedTo} /> },
    {
      key: "followUpDate",
      header: "Follow-up",
      sortable: true,
      render: (l) => (OPEN_STAGES.includes(l.status) ? <DueDate value={l.followUpDate} /> : <span className="subtle">{l.convertedCustomer ? "Converted" : "Closed"}</span>),
    },
    { key: "createdAt", header: "Created", sortable: true, render: (l) => <span className="muted num">{formatDate(l.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: 48,
      render: (l) => (
        <div className="table__actions" data-stop>
          <Dropdown
            width={200}
            trigger={({ toggle, open }) => (
              <button type="button" className="icon-button" onClick={toggle} aria-expanded={open} aria-label={`Actions for ${l.name}`}>
                <MoreHorizontal />
              </button>
            )}
          >
            <MenuItem icon={Target} onClick={() => navigate(`/leads/${l._id}`)}>
              View details
            </MenuItem>
            <MenuItem icon={Pencil} onClick={() => navigate(`/leads/${l._id}/edit`)}>
              Edit
            </MenuItem>
            {!l.convertedCustomer && (
              <MenuItem icon={Repeat} onClick={() => setConverting(l)}>
                Convert to customer
              </MenuItem>
            )}
            <MenuSeparator />
            <div className="menu__label">Move to stage</div>
            {LEAD_STAGES.filter((s) => s.value !== l.status).map((stage) => (
              <MenuItem key={stage.value} onClick={() => changeStage(l, stage.value)}>
                <span className="status">
                  <span className="status__dot" style={{ background: stage.color }} />
                  {stage.label}
                </span>
              </MenuItem>
            ))}
            {can(user, "leads:delete") && (
              <>
                <MenuSeparator />
                <MenuItem icon={Trash2} danger onClick={() => setPendingDelete(l)}>
                  Delete
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Leads"
        description={isPrivileged(user) ? "Qualify, assign and follow up on every opportunity." : "Opportunities assigned to you."}
        actions={
          <>
            <Button variant="secondary" icon={KanbanSquare} to="/pipeline">
              Pipeline
            </Button>
            <Button variant="primary" icon={Plus} to="/leads/new">
              New lead
            </Button>
          </>
        }
      />

      <div className="panel">
        <div className="toolbar">
          <SearchInput className="toolbar__search" value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search name, company, email…" />
          <Select size="sm" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} options={STATUS_FILTERS} placeholder="All stages" aria-label="Filter by stage" />
          <Select size="sm" value={filters.source} onChange={(e) => setFilters({ source: e.target.value })} options={LEAD_SOURCES} placeholder="All sources" aria-label="Filter by source" />
          {isPrivileged(user) && <AssigneeSelect size="sm" value={filters.assignedTo} onChange={(assignedTo) => setFilters({ assignedTo })} emptyLabel="All owners" aria-label="Filter by owner" />}
          <Select
            size="sm"
            value={filters.followUp}
            onChange={(e) => setFilters({ followUp: e.target.value })}
            options={[
              { value: "overdue", label: "Follow-up overdue" },
              { value: "upcoming", label: "Follow-up upcoming" },
            ]}
            placeholder="Any follow-up"
            aria-label="Filter by follow-up"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={clear}>
              Clear
            </Button>
          )}
        </div>

        {error && !data ? (
          <EmptyState icon={Target} title="Couldn't load leads" description={error.message} action={<Button onClick={() => reload()}>Try again</Button>} />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.items || []}
            loading={loading && !data}
            sort={filters.sort}
            onSort={(sort) => setFilters({ sort: sort || DEFAULTS.sort })}
            onRowClick={(l) => navigate(`/leads/${l._id}`)}
            skeletonRows={8}
            mobileRender={(l) => (
              <>
                <div className="mobile-list__top">
                  <div className="table__primary">
                    <strong className="truncate">{l.name}</strong>
                    <span className="truncate">{l.company || l.email || "—"}</span>
                  </div>
                  <span className="num" style={{ fontWeight: 600 }}>
                    {formatCurrency(l.value, { compact: true })}
                  </span>
                </div>
                <div className="mobile-list__meta">
                  <LeadStage status={l.status} />
                  {OPEN_STAGES.includes(l.status) && l.followUpDate ? <DueDate value={l.followUpDate} /> : <Person user={l.assignedTo} />}
                </div>
              </>
            )}
            empty={
              hasFilters ? (
                <EmptyState icon={Target} title="No leads match these filters" description="Try a different search or clear the filters." action={<Button onClick={clear}>Clear filters</Button>} />
              ) : (
                <EmptyState icon={Target} title="No leads yet" description="Capture your first opportunity to start building a pipeline." action={<Button variant="primary" icon={Plus} to="/leads/new">New lead</Button>} />
              )
            }
          />
        )}

        {data?.items?.length > 0 && (
          <div className="panel__footer" style={{ opacity: loading ? 0.6 : 1 }}>
            <Pagination pagination={data.pagination} onPageChange={(page) => setFilters({ page }, { resetPage: false })} label="leads" />
          </div>
        )}
      </div>

      <ConvertLeadModal open={Boolean(converting)} lead={converting} onClose={() => setConverting(null)} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Delete ${pendingDelete?.name}?`}
        description="This permanently removes the lead, its notes and history. Linked tasks are kept but unlinked."
        confirmLabel="Delete lead"
      />
    </>
  );
}
