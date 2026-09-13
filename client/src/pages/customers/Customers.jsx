import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Download, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { customerService } from "../../services";
import useAsync from "../../hooks/useAsync";
import useQueryState from "../../hooks/useQueryState";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button, ConfirmDialog, CustomerStatus, DataTable, Dropdown, EmptyState, MenuItem, MenuSeparator, PageHeader, Pagination, Person, Select } from "../../components/ui";
import SearchInput from "../../components/crm/SearchInput";
import AssigneeSelect from "../../components/crm/AssigneeSelect";
import { CUSTOMER_STATUSES, INDUSTRIES } from "../../utils/constants";
import { formatCurrency, formatDate, timeAgo } from "../../utils/format";
import { can, isPrivileged } from "../../utils/permissions";

const DEFAULTS = { q: "", status: "", industry: "", assignedTo: "", sort: "-createdAt", page: 1 };

const toCsv = (rows) => {
  const header = ["Name", "Company", "Email", "Phone", "Industry", "Status", "Owner", "City", "Country", "Lifetime value", "Last interaction", "Created"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((c) =>
    [c.name, c.company, c.email, c.phone, c.industry, c.status, c.assignedTo?.name, c.address?.city, c.address?.country, c.lifetimeValue, c.lastInteractionAt ? new Date(c.lastInteractionAt).toISOString() : "", new Date(c.createdAt).toISOString()]
      .map(escape)
      .join(",")
  );
  return [header.map(escape).join(","), ...lines].join("\n");
};

export default function Customers() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useQueryState(DEFAULTS);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useAsync(() => customerService.list({ ...filters, limit: 15 }), [filters.q, filters.status, filters.industry, filters.assignedTo, filters.sort, filters.page]);

  const hasFilters = filters.q || filters.status || filters.industry || filters.assignedTo;

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await customerService.remove(pendingDelete._id);
      toast.success("Customer deleted", `${pendingDelete.name} was removed.`);
      setPendingDelete(null);
      reload({ silent: true });
    } catch (err) {
      toast.error("Couldn't delete customer", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await customerService.list({ ...filters, page: 1, limit: 100 });
      const blob = new Blob([toCsv(res.items)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready", `${res.items.length} customers exported.`);
    } catch (err) {
      toast.error("Export failed", err.message);
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Customer",
      sortable: true,
      minWidth: 220,
      render: (c) => (
        <div className="table__primary">
          <strong className="truncate row-link">{c.name}</strong>
          <span className="truncate">{c.email || "No email"}</span>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortable: true,
      render: (c) => (
        <div className="table__primary">
          <span style={{ color: "var(--text)", fontSize: 13.5 }}>{c.company || "—"}</span>
          <span>{c.industry}</span>
        </div>
      ),
    },
    { key: "status", header: "Status", sortable: true, render: (c) => <CustomerStatus status={c.status} /> },
    { key: "assignedTo", header: "Owner", render: (c) => <Person user={c.assignedTo} /> },
    { key: "lifetimeValue", header: "Lifetime value", sortable: true, align: "right", render: (c) => <span className="num">{c.lifetimeValue ? formatCurrency(c.lifetimeValue) : "—"}</span> },
    {
      key: "lastInteractionAt",
      header: "Last interaction",
      sortable: true,
      render: (c) => <span className={c.lastInteractionAt ? "muted" : "subtle"}>{c.lastInteractionAt ? timeAgo(c.lastInteractionAt) : "Never"}</span>,
    },
    { key: "createdAt", header: "Created", sortable: true, render: (c) => <span className="muted num">{formatDate(c.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: 48,
      render: (c) => (
        <div className="table__actions" data-stop>
          <Dropdown
            trigger={({ toggle, open }) => (
              <button type="button" className="icon-button" onClick={toggle} aria-expanded={open} aria-label={`Actions for ${c.name}`}>
                <MoreHorizontal />
              </button>
            )}
          >
            <MenuItem icon={Building2} onClick={() => navigate(`/customers/${c._id}`)}>
              View details
            </MenuItem>
            <MenuItem icon={Pencil} onClick={() => navigate(`/customers/${c._id}/edit`)}>
              Edit
            </MenuItem>
            {can(user, "customers:delete") && (
              <>
                <MenuSeparator />
                <MenuItem icon={Trash2} danger onClick={() => setPendingDelete(c)}>
                  Delete
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      ),
    },
  ];

  const total = data?.pagination?.total;

  return (
    <>
      <PageHeader
        title="Customers"
        description={isPrivileged(user) ? "Every account your team manages." : "Accounts you own or created."}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} loading={exporting} disabled={!total}>
              Export
            </Button>
            <Button variant="primary" icon={Plus} to="/customers/new">
              Add customer
            </Button>
          </>
        }
      />

      <div className="panel">
        <div className="toolbar">
          <SearchInput className="toolbar__search" value={filters.q} onChange={(q) => setFilters({ q })} placeholder="Search name, company, email…" />
          <Select size="sm" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} options={CUSTOMER_STATUSES} placeholder="All statuses" aria-label="Filter by status" />
          <Select size="sm" value={filters.industry} onChange={(e) => setFilters({ industry: e.target.value })} options={INDUSTRIES} placeholder="All industries" aria-label="Filter by industry" />
          {isPrivileged(user) && <AssigneeSelect size="sm" value={filters.assignedTo} onChange={(assignedTo) => setFilters({ assignedTo })} emptyLabel="All owners" aria-label="Filter by owner" />}
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={() => setFilters({ q: "", status: "", industry: "", assignedTo: "" })}>
              Clear
            </Button>
          )}
        </div>

        {error && !data ? (
          <EmptyState icon={Building2} title="Couldn't load customers" description={error.message} action={<Button onClick={() => reload()}>Try again</Button>} />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.items || []}
            loading={loading && !data}
            sort={filters.sort}
            onSort={(sort) => setFilters({ sort: sort || DEFAULTS.sort })}
            onRowClick={(c) => navigate(`/customers/${c._id}`)}
            skeletonRows={8}
            mobileRender={(c) => (
              <>
                <div className="mobile-list__top">
                  <div className="table__primary">
                    <strong className="truncate">{c.name}</strong>
                    <span className="truncate">{c.company || c.email || "—"}</span>
                  </div>
                  <CustomerStatus status={c.status} />
                </div>
                <div className="mobile-list__meta">
                  <Person user={c.assignedTo} />
                  <span className="num">{c.lifetimeValue ? formatCurrency(c.lifetimeValue, { compact: true }) : ""}</span>
                </div>
              </>
            )}
            empty={
              hasFilters ? (
                <EmptyState icon={Building2} title="No customers match these filters" description="Try a different search or clear the filters." action={<Button onClick={() => setFilters({ q: "", status: "", industry: "", assignedTo: "" })}>Clear filters</Button>} />
              ) : (
                <EmptyState icon={Building2} title="No customers yet" description="Add your first customer or convert a won lead." action={<Button variant="primary" icon={Plus} to="/customers/new">Add customer</Button>} />
              )
            }
          />
        )}

        {data?.items?.length > 0 && (
          <div className="panel__footer" style={{ opacity: loading ? 0.6 : 1 }}>
            <Pagination pagination={data.pagination} onPageChange={(page) => setFilters({ page }, { resetPage: false })} label="customers" />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Delete ${pendingDelete?.name}?`}
        description="The customer and their interaction history will be permanently removed. Related tasks will be kept but unlinked."
        confirmLabel="Delete customer"
      />
    </>
  );
}
