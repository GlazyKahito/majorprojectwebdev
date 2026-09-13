const mongoose = require("mongoose");
const Task = require("../models/Task");
const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { searchRegex, parsePagination, paginated, isObjectId } = require("../utils/query");
const { isPrivileged } = require("../utils/roles");
const { ownershipScope, assertAccess, canAccessRecord } = require("../services/accessService");
const { logActivity } = require("../services/activityService");
const { notify } = require("../services/notificationService");

const POPULATE = [
  { path: "assignedTo", select: "name email role title" },
  { path: "createdBy", select: "name" },
  { path: "relatedCustomer", select: "name company" },
  { path: "relatedLead", select: "name company status" },
];

const oid = (value) => new mongoose.Types.ObjectId(String(value));

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const buildFilter = (user, query) => {
  const conditions = [ownershipScope(user)];
  const now = new Date();

  if (query.q) {
    const regex = searchRegex(query.q);
    conditions.push({ $or: [{ title: regex }, { description: regex }] });
  }
  if (query.status === "pending") conditions.push({ status: { $ne: "completed" } });
  else if (query.status && Task.TASK_STATUSES.includes(query.status)) conditions.push({ status: query.status });
  if (query.priority && Task.TASK_PRIORITIES.includes(query.priority)) conditions.push({ priority: query.priority });
  if (query.assignedTo === "me") conditions.push({ assignedTo: user._id });
  else if (query.assignedTo && isObjectId(query.assignedTo)) conditions.push({ assignedTo: oid(query.assignedTo) });
  if (query.customer && isObjectId(query.customer)) conditions.push({ relatedCustomer: oid(query.customer) });
  if (query.lead && isObjectId(query.lead)) conditions.push({ relatedLead: oid(query.lead) });

  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);

  if (query.due === "overdue") conditions.push({ dueDate: { $lt: now }, status: { $ne: "completed" } });
  if (query.due === "today") conditions.push({ dueDate: { $gte: today, $lt: tomorrow } });
  if (query.due === "week") conditions.push({ dueDate: { $gte: today, $lt: weekEnd } });
  if (query.due === "none") conditions.push({ dueDate: null });

  return { $and: conditions };
};

const validateRelations = async (user, { relatedCustomer, relatedLead, assignedTo }) => {
  if (assignedTo && !(await User.exists({ _id: assignedTo, isActive: true }))) {
    throw ApiError.badRequest("Assigned team member was not found");
  }
  if (relatedCustomer) {
    const customer = await Customer.findById(relatedCustomer).select("assignedTo createdBy");
    if (!customer || !canAccessRecord(user, customer)) throw ApiError.badRequest("Related customer was not found");
  }
  if (relatedLead) {
    const lead = await Lead.findById(relatedLead).select("assignedTo createdBy");
    if (!lead || !canAccessRecord(user, lead)) throw ApiError.badRequest("Related lead was not found");
  }
};

const listTasks = async (req, res) => {
  const filter = buildFilter(req.user, req.query);
  const pagination = parsePagination(req.query, { limit: 50, max: 200 });

  const sortKey = ["priority", "createdAt"].includes(req.query.sort) ? req.query.sort : "dueDate";

  const pipeline = [
    { $match: filter },
    {
      $addFields: {
        priorityRank: { $switch: { branches: [{ case: { $eq: ["$priority", "high"] }, then: 0 }, { case: { $eq: ["$priority", "medium"] }, then: 1 }], default: 2 } },
        dueSort: { $ifNull: ["$dueDate", new Date("9999-12-31")] },
        statusRank: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
      },
    },
    {
      $sort:
        sortKey === "createdAt"
          ? { createdAt: -1 }
          : sortKey === "priority"
            ? { statusRank: 1, priorityRank: 1, dueSort: 1 }
            : { statusRank: 1, dueSort: 1, priorityRank: 1 },
    },
    { $skip: pagination.skip },
    { $limit: pagination.limit },
  ];

  const [raw, total, counts] = await Promise.all([
    Task.aggregate(pipeline),
    Task.countDocuments(filter),
    Task.aggregate([
      { $match: ownershipScope(req.user) },
      {
        $group: {
          _id: null,
          todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "completed"] }, { $lt: ["$dueDate", new Date()] }, { $ne: ["$dueDate", null] }] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const items = await Task.populate(
    raw.map(({ priorityRank, dueSort, statusRank, __v, ...task }) => task),
    POPULATE
  );

  const { _id, ...summary } = counts[0] || { todo: 0, in_progress: 0, completed: 0, overdue: 0 };
  res.json({ ...paginated(items, total, pagination), summary });
};

const getTask = async (req, res) => {
  const task = assertAccess(req.user, await Task.findById(req.params.id).populate(POPULATE), "Task");
  res.json({ task });
};

const createTask = async (req, res) => {
  const assignedTo = req.body.assignedTo || req.user._id;

  if (!isPrivileged(req.user) && String(assignedTo) !== String(req.user._id)) {
    throw ApiError.forbidden("Sales executives can only assign tasks to themselves");
  }

  await validateRelations(req.user, { ...req.body, assignedTo });
  const task = await Task.create({ ...req.body, assignedTo, createdBy: req.user._id });

  await notify({
    user: assignedTo,
    actor: req.user,
    type: "task_assigned",
    title: `New task: ${task.title}`,
    message: `${req.user.name} assigned you a ${task.priority} priority task${task.dueDate ? ` due ${task.dueDate.toDateString()}` : ""}.`,
    link: `/tasks?task=${task._id}`,
  });

  res.status(201).json({ task: await task.populate(POPULATE) });
};

const updateTask = async (req, res) => {
  const task = assertAccess(req.user, await Task.findById(req.params.id), "Task");
  const updates = { ...req.body };
  const previousAssignee = String(task.assignedTo);
  const previousStatus = task.status;

  if ("assignedTo" in updates) {
    if (!updates.assignedTo) delete updates.assignedTo;
    else if (!isPrivileged(req.user) && String(updates.assignedTo) !== previousAssignee) {
      throw ApiError.forbidden("Only managers can reassign tasks");
    }
  }

  await validateRelations(req.user, {
    assignedTo: updates.assignedTo,
    relatedCustomer: updates.relatedCustomer,
    relatedLead: updates.relatedLead,
  });

  Object.assign(task, updates);
  await task.save();

  const events = [];
  if (String(task.assignedTo) !== previousAssignee) {
    events.push(
      notify({
        user: task.assignedTo,
        actor: req.user,
        type: "task_assigned",
        title: `Task assigned: ${task.title}`,
        message: `${req.user.name} handed this task over to you.`,
        link: `/tasks?task=${task._id}`,
      })
    );
  }
  if (task.status === "completed" && previousStatus !== "completed") {
    if (task.relatedCustomer || task.relatedLead) {
      events.push(
        logActivity({
          type: "task_completed",
          summary: `${req.user.name} completed task "${task.title}"`,
          actor: req.user,
          task,
          customer: task.relatedCustomer,
          lead: task.relatedLead,
        })
      );
    }
    if (task.createdBy && String(task.createdBy) !== String(req.user._id)) {
      events.push(
        notify({
          user: task.createdBy,
          actor: req.user,
          type: "task_assigned",
          title: `Completed: ${task.title}`,
          message: `${req.user.name} marked this task as complete.`,
          link: `/tasks?task=${task._id}`,
        })
      );
    }
  }
  await Promise.all(events);

  res.json({ task: await task.populate(POPULATE) });
};

const deleteTask = async (req, res) => {
  const task = assertAccess(req.user, await Task.findById(req.params.id), "Task");

  if (!isPrivileged(req.user) && String(task.createdBy) !== String(req.user._id)) {
    throw ApiError.forbidden("Only the task creator or a manager can delete this task");
  }

  await task.deleteOne();
  res.json({ message: "Task deleted" });
};

module.exports = { listTasks, getTask, createTask, updateTask, deleteTask };
