const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const User = require("../models/User");
const { isPrivileged } = require("../utils/roles");
const { ownershipScope } = require("../services/accessService");

const MONTHS = 6;

const monthStart = (offset = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
};

const percentChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const getDashboard = async (req, res) => {
  const user = req.user;
  const scope = ownershipScope(user);
  const now = new Date();
  const thisMonth = monthStart(0);
  const lastMonth = monthStart(-1);
  const windowStart = monthStart(-(MONTHS - 1));
  const soon = new Date(now.getTime() + 7 * 86400000);

  const [
    totalCustomers,
    customersThisMonth,
    customersLastMonth,
    stageRows,
    wonThisMonthRows,
    wonLastMonthRows,
    pendingTasks,
    overdueTasks,
    monthlyWon,
    monthlyLeads,
    sourceRows,
    tasksDueSoon,
    recentLeads,
    recentCustomers,
    followUps,
  ] = await Promise.all([
    Customer.countDocuments(scope),
    Customer.countDocuments({ ...scope, createdAt: { $gte: thisMonth } }),
    Customer.countDocuments({ ...scope, createdAt: { $gte: lastMonth, $lt: thisMonth } }),
    Lead.aggregate([{ $match: scope }, { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$value" } } }]),
    Lead.aggregate([{ $match: { ...scope, status: "won", closedAt: { $gte: thisMonth } } }, { $group: { _id: null, value: { $sum: "$value" }, count: { $sum: 1 } } }]),
    Lead.aggregate([{ $match: { ...scope, status: "won", closedAt: { $gte: lastMonth, $lt: thisMonth } } }, { $group: { _id: null, value: { $sum: "$value" }, count: { $sum: 1 } } }]),
    Task.countDocuments({ ...scope, status: { $ne: "completed" } }),
    Task.countDocuments({ ...scope, status: { $ne: "completed" }, dueDate: { $lt: now } }),
    Lead.aggregate([
      { $match: { ...scope, status: { $in: ["won", "lost"] }, closedAt: { $gte: windowStart } } },
      {
        $group: {
          _id: { y: { $year: "$closedAt" }, m: { $month: "$closedAt" } },
          revenue: { $sum: { $cond: [{ $eq: ["$status", "won"] }, "$value", 0] } },
          won: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
        },
      },
    ]),
    Lead.aggregate([
      { $match: { ...scope, createdAt: { $gte: windowStart } } },
      { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: scope },
      { $group: { _id: "$source", count: { $sum: 1 }, won: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } }, value: { $sum: "$value" } } },
      { $sort: { count: -1 } },
    ]),
    Task.find({ ...scope, status: { $ne: "completed" }, dueDate: { $ne: null, $lte: soon } })
      .sort({ dueDate: 1 })
      .limit(6)
      .populate("assignedTo", "name")
      .populate("relatedCustomer", "name company")
      .populate("relatedLead", "name company")
      .lean(),
    Lead.find(scope).select("-notes").sort({ createdAt: -1 }).limit(5).populate("assignedTo", "name").lean(),
    Customer.find(scope).sort({ createdAt: -1 }).limit(5).populate("assignedTo", "name").lean(),
    Lead.find({ ...scope, status: { $in: Lead.OPEN_STATUSES }, followUpDate: { $ne: null, $lte: soon } })
      .select("name company followUpDate followUpNote status value assignedTo")
      .sort({ followUpDate: 1 })
      .limit(5)
      .populate("assignedTo", "name")
      .lean(),
  ]);

  const stages = Object.fromEntries(Lead.LEAD_STATUSES.map((s) => [s, { count: 0, value: 0 }]));
  for (const row of stageRows) stages[row._id] = { count: row.count, value: row.value };

  const activeLeads = Lead.OPEN_STATUSES.reduce((sum, s) => sum + stages[s].count, 0);
  const pipelineValue = Lead.OPEN_STATUSES.reduce((sum, s) => sum + stages[s].value, 0);
  const totalLeads = Lead.LEAD_STATUSES.reduce((sum, s) => sum + stages[s].count, 0);
  const closedTotal = stages.won.count + stages.lost.count;
  const wonThisMonth = wonThisMonthRows[0] || { value: 0, count: 0 };
  const wonLastMonth = wonLastMonthRows[0] || { value: 0, count: 0 };

  const salesOverview = [];
  for (let i = MONTHS - 1; i >= 0; i -= 1) {
    const date = monthStart(-i);
    const key = (row) => row._id.y === date.getFullYear() && row._id.m === date.getMonth() + 1;
    const closed = monthlyWon.find(key) || { revenue: 0, won: 0, lost: 0 };
    const created = monthlyLeads.find(key) || { count: 0 };
    salesOverview.push({
      month: date.toLocaleString("en-US", { month: "short" }),
      year: date.getFullYear(),
      revenue: closed.revenue,
      won: closed.won,
      lost: closed.lost,
      leads: created.count,
    });
  }

  let activityFilter = {};
  if (!isPrivileged(user)) {
    const [leadIds, customerIds] = await Promise.all([Lead.find(scope).distinct("_id"), Customer.find(scope).distinct("_id")]);
    activityFilter = { $or: [{ actor: user._id }, { lead: { $in: leadIds } }, { customer: { $in: customerIds } }] };
  }

  const recentActivity = await Activity.find(activityFilter)
    .sort({ occurredAt: -1 })
    .limit(8)
    .populate("actor", "name")
    .populate("lead", "name")
    .populate("customer", "name")
    .lean();

  let teamPerformance = [];
  if (isPrivileged(user)) {
    const [rows, openRows, members] = await Promise.all([
      Lead.aggregate([
        { $match: { status: "won", closedAt: { $gte: windowStart }, assignedTo: { $ne: null } } },
        { $group: { _id: "$assignedTo", revenue: { $sum: "$value" }, deals: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { status: { $in: Lead.OPEN_STATUSES }, assignedTo: { $ne: null } } },
        { $group: { _id: "$assignedTo", pipeline: { $sum: "$value" }, open: { $sum: 1 } } },
      ]),
      User.find({ isActive: true, role: { $in: ["manager", "executive"] } }).select("name role title").lean(),
    ]);

    const won = Object.fromEntries(rows.map((r) => [String(r._id), r]));
    const open = Object.fromEntries(openRows.map((r) => [String(r._id), r]));

    teamPerformance = members
      .map((m) => ({
        _id: m._id,
        name: m.name,
        role: m.role,
        title: m.title,
        revenue: won[String(m._id)]?.revenue || 0,
        deals: won[String(m._id)]?.deals || 0,
        pipeline: open[String(m._id)]?.pipeline || 0,
        openLeads: open[String(m._id)]?.open || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.pipeline - a.pipeline)
      .slice(0, 6);
  }

  res.json({
    scope: isPrivileged(user) ? "team" : "personal",
    stats: {
      totalCustomers,
      newCustomersThisMonth: customersThisMonth,
      customersChange: percentChange(customersThisMonth, customersLastMonth),
      activeLeads,
      pipelineValue,
      pendingTasks,
      overdueTasks,
      closedDeals: stages.won.count,
      wonRevenue: stages.won.value,
      revenueThisMonth: wonThisMonth.value,
      revenueChange: percentChange(wonThisMonth.value, wonLastMonth.value),
      dealsThisMonth: wonThisMonth.count,
      winRate: closedTotal ? Math.round((stages.won.count / closedTotal) * 1000) / 10 : 0,
      conversionRate: totalLeads ? Math.round((stages.won.count / totalLeads) * 1000) / 10 : 0,
      averageDealSize: stages.won.count ? Math.round(stages.won.value / stages.won.count) : 0,
      totalLeads,
    },
    pipeline: Lead.LEAD_STATUSES.map((status) => ({ status, ...stages[status] })),
    salesOverview,
    leadSources: sourceRows.map((r) => ({ source: r._id, count: r.count, won: r.won, value: r.value })),
    teamPerformance,
    tasksDueSoon,
    followUps,
    recentLeads,
    recentCustomers,
    recentActivity,
  });
};

module.exports = { getDashboard };
