import { Link, useNavigate } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, CalendarClock, CheckSquare, Inbox, Plus, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardService } from "../services";
import useAsync from "../hooks/useAsync";
import { useAuth } from "../context/AuthContext";
import { Avatar, Button, CustomerStatus, DueDate, EmptyState, LeadStage, PageHeader, Panel, Person, Priority, Skeleton } from "../components/ui";
import ActivityTimeline from "../components/crm/ActivityTimeline";
import { LEAD_SOURCES, LEAD_STAGES, OPEN_STAGES, ROLES, labelFor } from "../utils/constants";
import { formatCurrency, formatDate, formatNumber, formatPercent, timeAgo } from "../utils/format";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

function Delta({ value, suffix = "vs last month" }) {
  if (value === undefined || value === null) return null;
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`delta ${positive ? "delta--up" : "delta--down"}`}>
      <Icon />
      {formatPercent(Math.abs(value))}
      <span className="subtle">{suffix}</span>
    </span>
  );
}

function StatStrip({ stats, loading }) {
  const items = [
    { label: "Total customers", value: formatNumber(stats?.totalCustomers), meta: stats && <span className="subtle">{formatNumber(stats.newCustomersThisMonth)} added this month</span>, to: "/customers" },
    { label: "Active leads", value: formatNumber(stats?.activeLeads), meta: stats && <span className="subtle">{formatCurrency(stats.pipelineValue, { compact: true })} in open pipeline</span>, to: "/leads?status=open" },
    {
      label: "Pending tasks",
      value: formatNumber(stats?.pendingTasks),
      meta: stats && (stats.overdueTasks ? <span style={{ color: "var(--danger-text)" }}>{formatNumber(stats.overdueTasks)} overdue</span> : <span className="subtle">Nothing overdue</span>),
      to: "/tasks",
    },
    { label: "Closed deals", value: formatNumber(stats?.closedDeals), meta: stats && <span className="subtle">{formatPercent(stats.winRate)} win rate</span>, to: "/leads?status=won" },
    { label: "Revenue this month", value: formatCurrency(stats?.revenueThisMonth, { compact: true }), meta: stats && <Delta value={stats.revenueChange} />, to: "/pipeline" },
  ];

  return (
    <div className="stat-strip">
      {items.map((item) => (
        <Link to={item.to} className="stat" key={item.label}>
          <span className="stat__label">{item.label}</span>
          {loading ? <Skeleton width={70} height={24} style={{ margin: "6px 0 4px" }} /> : <span className="stat__value num">{item.value}</span>}
          <span className="stat__meta">{loading ? <Skeleton width={110} height={10} /> : item.meta}</span>
        </Link>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">
        {row.month} {row.year}
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__swatch" style={{ background: "var(--chart-1)" }} />
        Won revenue
        <strong className="num">{formatCurrency(row.revenue)}</strong>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__swatch" style={{ background: "transparent" }} />
        Deals won / lost
        <strong className="num">
          {row.won} / {row.lost}
        </strong>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__swatch" style={{ background: "transparent" }} />
        New leads
        <strong className="num">{row.leads}</strong>
      </div>
    </div>
  );
}

function SalesOverview({ data, stats, loading }) {
  const total = data?.reduce((sum, row) => sum + row.revenue, 0) || 0;
  return (
    <Panel
      title="Sales overview"
      description="Won revenue by month, last 6 months"
      actions={
        !loading && (
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {formatCurrency(total)}
            </div>
            <div className="subtle" style={{ fontSize: 12 }}>
              Avg. deal {formatCurrency(stats?.averageDealSize, { compact: true })}
            </div>
          </div>
        )
      }
    >
      <div style={{ height: 248, marginLeft: -8 }}>
        {loading ? (
          <Skeleton height="100%" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} dy={6} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(v, { compact: true })}
              />
              <Tooltip cursor={{ fill: "var(--surface-hover)" }} content={<RevenueTooltip />} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function PipelineBreakdown({ pipeline, stats, loading }) {
  const open = pipeline?.filter((p) => OPEN_STAGES.includes(p.status)) || [];
  const max = Math.max(...open.map((p) => p.value), 1);

  return (
    <Panel
      title="Pipeline value"
      description={loading ? " " : `${formatCurrency(stats.pipelineValue)} across ${formatNumber(stats.activeLeads)} open leads`}
      actions={
        <Button variant="ghost" size="sm" to="/pipeline">
          Open board
        </Button>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} height={30} />)
          : open.map((stage) => {
              const meta = LEAD_STAGES.find((s) => s.value === stage.status);
              return (
                <Link to={`/leads?status=${stage.status}`} key={stage.status} className="hbar">
                  <div className="hbar__head">
                    <span className="status">
                      <span className="status__dot" style={{ background: meta.color }} />
                      {meta.label}
                      <span className="subtle num">{stage.count}</span>
                    </span>
                    <span className="num" style={{ fontWeight: 500 }}>
                      {formatCurrency(stage.value, { compact: true })}
                    </span>
                  </div>
                  <div className="hbar__track">
                    <div className="hbar__fill" style={{ width: `${Math.max((stage.value / max) * 100, stage.value ? 2 : 0)}%` }} />
                  </div>
                </Link>
              );
            })}
      </div>
      {!loading && (
        <div className="split-metrics">
          <div>
            <span className="subtle">Won</span>
            <strong className="num">{formatCurrency(stats.wonRevenue, { compact: true })}</strong>
          </div>
          <div>
            <span className="subtle">Lead conversion</span>
            <strong className="num">{formatPercent(stats.conversionRate)}</strong>
          </div>
          <div>
            <span className="subtle">Win rate</span>
            <strong className="num">{formatPercent(stats.winRate)}</strong>
          </div>
        </div>
      )}
    </Panel>
  );
}

function LeadSources({ sources, loading }) {
  const max = Math.max(...(sources || []).map((s) => s.count), 1);
  return (
    <Panel title="Lead sources" description="Where leads come from and how often they close">
      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={18} />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <EmptyState compact icon={Inbox} title="No leads yet" />
      ) : (
        <table className="mini-table">
          <thead>
            <tr>
              <th>Source</th>
              <th style={{ width: "42%" }}>
                <span className="sr-only">Share</span>
              </th>
              <th className="align-right">Leads</th>
              <th className="align-right">Won</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.source}>
                <td>{labelFor(LEAD_SOURCES, source.source)}</td>
                <td>
                  <div className="hbar__track" title={`${source.count} leads`}>
                    <div className="hbar__fill" style={{ width: `${(source.count / max) * 100}%` }} />
                  </div>
                </td>
                <td className="align-right num">{source.count}</td>
                <td className="align-right num subtle">{source.count ? formatPercent((source.won / source.count) * 100, 0) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function TeamPerformance({ team }) {
  const max = Math.max(...team.map((m) => m.revenue), 1);
  return (
    <Panel title="Team performance" description="Won revenue over the last 6 months" bodyClassName={null}>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Rep</th>
              <th style={{ minWidth: 140 }}>Won revenue</th>
              <th className="align-right">Deals</th>
              <th className="align-right">Open pipeline</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member._id}>
                <td>
                  <Person user={member} size="sm" subtitle={ROLES[member.role]} />
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="hbar__track" style={{ flex: 1, minWidth: 60 }}>
                      <div className="hbar__fill" style={{ width: `${(member.revenue / max) * 100}%` }} />
                    </div>
                    <span className="num" style={{ minWidth: 56, textAlign: "right", fontWeight: 500 }}>
                      {formatCurrency(member.revenue, { compact: true })}
                    </span>
                  </div>
                </td>
                <td className="align-right num">{member.deals}</td>
                <td className="align-right num muted">
                  {formatCurrency(member.pipeline, { compact: true })}
                  <span className="subtle"> · {member.openLeads}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DueSoon({ tasks, followUps, loading }) {
  const navigate = useNavigate();
  const items = [
    ...(tasks || []).map((t) => ({ kind: "task", id: t._id, title: t.title, date: t.dueDate, sub: t.relatedCustomer?.name || t.relatedLead?.name || t.assignedTo?.name, priority: t.priority, to: `/tasks?task=${t._id}` })),
    ...(followUps || []).map((l) => ({ kind: "followup", id: l._id, title: `Follow up with ${l.name}`, date: l.followUpDate, sub: l.company, stage: l.status, to: `/leads/${l._id}` })),
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 7);

  return (
    <Panel
      title="Due soon"
      description="Tasks and follow-ups in the next 7 days"
      bodyClassName={null}
      actions={
        <Button variant="ghost" size="sm" to="/tasks">
          All tasks
        </Button>
      }
    >
      {loading ? (
        <div className="panel__body" style={{ display: "grid", gap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={16} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState compact icon={CheckSquare} title="Nothing due this week" description="Enjoy the breathing room — or plan ahead." />
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <button type="button" className="list__row" onClick={() => navigate(item.to)}>
                <span className="list__icon">{item.kind === "task" ? <CheckSquare /> : <CalendarClock />}</span>
                <span className="list__main">
                  <span className="list__title truncate">{item.title}</span>
                  <span className="list__sub truncate">{item.sub || (item.kind === "task" ? "Task" : "Lead follow-up")}</span>
                </span>
                <span className="list__aside">
                  {item.kind === "task" ? <Priority value={item.priority} showLabel={false} /> : <LeadStage status={item.stage} />}
                  <DueDate value={item.date} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentList({ title, items, loading, type, emptyTitle, to }) {
  const navigate = useNavigate();
  return (
    <Panel
      title={title}
      bodyClassName={null}
      actions={
        <Button variant="ghost" size="sm" to={to}>
          View all
        </Button>
      }
    >
      {loading ? (
        <div className="panel__body" style={{ display: "grid", gap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={16} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState compact icon={Inbox} title={emptyTitle} />
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item._id}>
              <button type="button" className="list__row" onClick={() => navigate(`/${type}/${item._id}`)}>
                <Avatar name={item.name} size="md" />
                <span className="list__main">
                  <span className="list__title truncate">{item.name}</span>
                  <span className="list__sub truncate">
                    {item.company || "—"} · {timeAgo(item.createdAt)}
                  </span>
                </span>
                <span className="list__aside">
                  {type === "leads" ? (
                    <>
                      <LeadStage status={item.status} />
                      <span className="num" style={{ fontWeight: 500, minWidth: 58, textAlign: "right" }}>
                        {formatCurrency(item.value, { compact: true })}
                      </span>
                    </>
                  ) : (
                    <CustomerStatus status={item.status} />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => dashboardService.get(), []);
  const firstName = user?.name?.split(" ")[0];
  const team = data?.scope === "team";

  if (error && !data) {
    return (
      <>
        <PageHeader title={`${greeting()}, ${firstName}`} />
        <Panel>
          <EmptyState
            icon={RefreshCw}
            title="We couldn't load your dashboard"
            description={error.message}
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={() => reload()}>
                Try again
              </Button>
            }
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          loading
            ? "Loading your workspace…"
            : team
              ? `Here's how the team is tracking · ${formatDate(new Date(), { year: true })}`
              : `Here's what's on your plate · ${formatDate(new Date(), { year: true })}`
        }
        actions={
          <>
            <Button variant="secondary" icon={Plus} to="/customers/new">
              Customer
            </Button>
            <Button variant="primary" icon={Plus} to="/leads/new">
              New lead
            </Button>
          </>
        }
      />

      <StatStrip stats={data?.stats} loading={loading} />

      <div className="dash-grid">
        <div className="dash-grid__main">
          <SalesOverview data={data?.salesOverview} stats={data?.stats} loading={loading} />
        </div>
        <div className="dash-grid__side">
          <PipelineBreakdown pipeline={data?.pipeline} stats={data?.stats} loading={loading} />
        </div>

        <div className="dash-grid__main">
          <DueSoon tasks={data?.tasksDueSoon} followUps={data?.followUps} loading={loading} />
        </div>
        <div className="dash-grid__side">
          <LeadSources sources={data?.leadSources} loading={loading} />
        </div>

        {team && data.teamPerformance.length > 0 && (
          <div className="dash-grid__full">
            <TeamPerformance team={data.teamPerformance} />
          </div>
        )}

        <div className="dash-grid__third">
          <RecentList title="Recent leads" type="leads" to="/leads" items={data?.recentLeads || []} loading={loading} emptyTitle="No leads yet" />
        </div>
        <div className="dash-grid__third">
          <RecentList title="Recent customers" type="customers" to="/customers" items={data?.recentCustomers || []} loading={loading} emptyTitle="No customers yet" />
        </div>
        <div className="dash-grid__third">
          <Panel title="Recent activity">
            <ActivityTimeline items={data?.recentActivity} loading={loading} />
          </Panel>
        </div>
      </div>
    </>
  );
}
