const User = require("../models/User");
const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const { searchRegex, parsePagination, paginated } = require("../utils/query");
const { ROLES } = require("../utils/roles");

const listUsers = async (req, res) => {
  const { q, role, status } = req.query;
  const filter = {};

  if (q) filter.$or = [{ name: searchRegex(q) }, { email: searchRegex(q) }, { title: searchRegex(q) }];
  if (role && Object.values(ROLES).includes(role)) filter.role = role;
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  const pagination = parsePagination(req.query, { limit: 50, max: 200 });
  const [users, total] = await Promise.all([
    User.find(filter).sort({ isActive: -1, role: 1, name: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    User.countDocuments(filter),
  ]);

  const ids = users.map((u) => u._id);
  const [leadCounts, wonTotals, taskCounts] = await Promise.all([
    Lead.aggregate([
      { $match: { assignedTo: { $in: ids }, status: { $in: Lead.OPEN_STATUSES } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { assignedTo: { $in: ids }, status: "won" } },
      { $group: { _id: "$assignedTo", value: { $sum: "$value" } } },
    ]),
    Task.aggregate([
      { $match: { assignedTo: { $in: ids }, status: { $ne: "completed" } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]),
  ]);

  const byId = (rows, field) => Object.fromEntries(rows.map((row) => [String(row._id), row[field]]));
  const openLeads = byId(leadCounts, "count");
  const wonValue = byId(wonTotals, "value");
  const openTasks = byId(taskCounts, "count");

  const items = users.map(({ password, passwordResetToken, passwordResetExpires, __v, ...user }) => ({
    ...user,
    stats: {
      openLeads: openLeads[String(user._id)] || 0,
      wonValue: wonValue[String(user._id)] || 0,
      openTasks: openTasks[String(user._id)] || 0,
    },
  }));

  res.json(paginated(items, total, pagination));
};

const listTeam = async (_req, res) => {
  const users = await User.find({ isActive: true }).select("name email role title").sort({ name: 1 }).lean();
  res.json({ items: users });
};

const getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  res.json({ user });
};

const createUser = async (req, res) => {
  if (await User.exists({ email: req.body.email })) {
    throw ApiError.conflict("A user with this email already exists");
  }
  const user = await User.create(req.body);
  res.status(201).json({ user });
};

const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  const isSelf = String(user._id) === String(req.user._id);
  if (isSelf && req.body.role && req.body.role !== user.role) {
    throw ApiError.badRequest("You cannot change your own role");
  }
  if (isSelf && req.body.isActive === false) {
    throw ApiError.badRequest("You cannot deactivate your own account");
  }
  if (req.body.email && req.body.email !== user.email && (await User.exists({ email: req.body.email }))) {
    throw ApiError.conflict("A user with this email already exists");
  }

  if (user.role === ROLES.ADMIN && (req.body.role && req.body.role !== ROLES.ADMIN || req.body.isActive === false)) {
    const admins = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
    if (admins <= 1) throw ApiError.badRequest("The workspace needs at least one active admin");
  }

  Object.assign(user, req.body);
  await user.save();
  res.json({ user });
};

const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  if (String(user._id) === String(req.user._id)) {
    throw ApiError.badRequest("You cannot delete your own account");
  }

  if (user.role === ROLES.ADMIN) {
    const admins = await User.countDocuments({ role: ROLES.ADMIN, isActive: true, _id: { $ne: user._id } });
    if (admins < 1) throw ApiError.badRequest("The workspace needs at least one active admin");
  }

  let reassignTo = req.user._id;
  if (req.body?.reassignTo) {
    const target = await User.findOne({ _id: req.body.reassignTo, isActive: true });
    if (!target || String(target._id) === String(user._id)) {
      throw ApiError.badRequest("Choose an active team member to receive this user's records");
    }
    reassignTo = target._id;
  }

  await Promise.all([
    Customer.updateMany({ assignedTo: user._id }, { $set: { assignedTo: reassignTo } }),
    Lead.updateMany({ assignedTo: user._id }, { $set: { assignedTo: reassignTo } }),
    Task.updateMany({ assignedTo: user._id }, { $set: { assignedTo: reassignTo } }),
    Notification.deleteMany({ user: user._id }),
  ]);

  await user.deleteOne();
  res.json({ message: "User removed and records reassigned" });
};

module.exports = { listUsers, listTeam, getUser, createUser, updateUser, deleteUser };
