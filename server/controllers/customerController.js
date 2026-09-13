const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { searchRegex, parsePagination, parseSort, paginated, isObjectId } = require("../utils/query");
const { isPrivileged } = require("../utils/roles");
const { ownershipScope, assertAccess, resolveAssignee } = require("../services/accessService");
const { logActivity } = require("../services/activityService");
const { notify } = require("../services/notificationService");

const SORTABLE = ["name", "company", "createdAt", "lastInteractionAt", "lifetimeValue", "status"];
const OWNER_FIELDS = "name email role title";

const buildFilter = (user, query) => {
  const conditions = [ownershipScope(user)];

  if (query.q) {
    const regex = searchRegex(query.q);
    conditions.push({ $or: [{ name: regex }, { company: regex }, { email: regex }, { phone: regex }, { "address.city": regex }] });
  }
  if (query.status && Customer.CUSTOMER_STATUSES.includes(query.status)) conditions.push({ status: query.status });
  if (query.industry && Customer.INDUSTRIES.includes(query.industry)) conditions.push({ industry: query.industry });
  if (query.assignedTo === "unassigned") conditions.push({ assignedTo: null });
  else if (query.assignedTo && isObjectId(query.assignedTo)) conditions.push({ assignedTo: query.assignedTo });

  return { $and: conditions };
};

const ensureAssignee = async (id) => {
  if (!id) return;
  if (!(await User.exists({ _id: id, isActive: true }))) {
    throw ApiError.badRequest("Assigned team member was not found");
  }
};

const listCustomers = async (req, res) => {
  const filter = buildFilter(req.user, req.query);
  const pagination = parsePagination(req.query);
  const sort = parseSort(req.query.sort, SORTABLE);

  const [items, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip(pagination.skip).limit(pagination.limit).populate("assignedTo", OWNER_FIELDS).lean(),
    Customer.countDocuments(filter),
  ]);

  res.json(paginated(items, total, pagination));
};

const getCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id)
    .populate("assignedTo", OWNER_FIELDS)
    .populate("createdBy", "name")
    .populate("convertedFromLead", "name status value source createdAt");

  assertAccess(req.user, customer, "Customer");

  const [openTasks, stats] = await Promise.all([
    Task.countDocuments({ relatedCustomer: customer._id, status: { $ne: "completed" } }),
    Activity.aggregate([{ $match: { customer: customer._id } }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
  ]);

  res.json({
    customer,
    summary: {
      openTasks,
      interactions: stats.filter((s) => ["call", "email", "meeting", "note"].includes(s._id)).reduce((sum, s) => sum + s.count, 0),
    },
  });
};

const createCustomer = async (req, res) => {
  const assignedTo = resolveAssignee(req.user, req.body.assignedTo);
  await ensureAssignee(assignedTo);

  const customer = await Customer.create({ ...req.body, assignedTo, createdBy: req.user._id });

  await logActivity({ type: "created", summary: `${req.user.name} added ${customer.name} as a customer`, actor: req.user, customer });

  if (String(assignedTo) !== String(req.user._id)) {
    await notify({
      user: assignedTo,
      actor: req.user,
      type: "lead_assigned",
      title: `New customer assigned: ${customer.name}`,
      message: `${req.user.name} assigned ${customer.company || customer.name} to you.`,
      link: `/customers/${customer._id}`,
    });
  }

  await customer.populate("assignedTo", OWNER_FIELDS);
  res.status(201).json({ customer });
};

const updateCustomer = async (req, res) => {
  const customer = assertAccess(req.user, await Customer.findById(req.params.id), "Customer");
  const updates = { ...req.body };

  if ("assignedTo" in updates) {
    if (!isPrivileged(req.user)) {
      if (updates.assignedTo && String(updates.assignedTo) !== String(customer.assignedTo)) {
        throw ApiError.forbidden("Only managers can reassign customers");
      }
      delete updates.assignedTo;
    } else {
      await ensureAssignee(updates.assignedTo);
    }
  }

  const previousOwner = customer.assignedTo ? String(customer.assignedTo) : null;
  const previousStatus = customer.status;

  if (updates.address) updates.address = { ...customer.address?.toObject?.(), ...updates.address };
  Object.assign(customer, updates);
  await customer.save();

  const events = [];
  if (updates.status && updates.status !== previousStatus) {
    events.push(logActivity({ type: "status_changed", summary: `Status changed from ${previousStatus} to ${updates.status}`, actor: req.user, customer }));
  }
  if (customer.assignedTo && String(customer.assignedTo) !== previousOwner) {
    const owner = await User.findById(customer.assignedTo).select("name");
    events.push(logActivity({ type: "assigned", summary: `Assigned to ${owner?.name || "a team member"}`, actor: req.user, customer }));
    events.push(
      notify({
        user: customer.assignedTo,
        actor: req.user,
        type: "lead_assigned",
        title: `Customer assigned: ${customer.name}`,
        message: `${req.user.name} made you the owner of ${customer.company || customer.name}.`,
        link: `/customers/${customer._id}`,
      })
    );
  }
  if (!events.length) {
    events.push(logActivity({ type: "updated", summary: `${req.user.name} updated customer details`, actor: req.user, customer }));
  }
  await Promise.all(events);

  await customer.populate("assignedTo", OWNER_FIELDS);
  res.json({ customer });
};

const deleteCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound("Customer not found");

  await Activity.deleteMany({ customer: customer._id, lead: { $exists: false } });
  await Promise.all([
    Activity.updateMany({ customer: customer._id }, { $unset: { customer: "" } }),
    Task.updateMany({ relatedCustomer: customer._id }, { $unset: { relatedCustomer: "" } }),
    Lead.updateMany({ convertedCustomer: customer._id }, { $unset: { convertedCustomer: "", convertedAt: "" } }),
  ]);

  await customer.deleteOne();
  res.json({ message: "Customer deleted" });
};

const listActivities = async (req, res) => {
  const customer = assertAccess(req.user, await Customer.findById(req.params.id).select("assignedTo createdBy"), "Customer");
  const filter = { customer: customer._id };
  if (req.query.type && Activity.ACTIVITY_TYPES.includes(req.query.type)) filter.type = req.query.type;

  const items = await Activity.find(filter).sort({ occurredAt: -1 }).limit(100).populate("actor", "name").lean();
  res.json({ items });
};

const addInteraction = async (req, res) => {
  const customer = assertAccess(req.user, await Customer.findById(req.params.id), "Customer");

  const activity = await logActivity({ ...req.body, actor: req.user, customer });
  await activity.populate("actor", "name");

  res.status(201).json({ activity });
};

const deleteActivity = async (req, res) => {
  const customer = assertAccess(req.user, await Customer.findById(req.params.id).select("assignedTo createdBy"), "Customer");
  const activity = await Activity.findOne({ _id: req.params.activityId, customer: customer._id });

  if (!activity) throw ApiError.notFound("Activity not found");
  if (!Activity.INTERACTION_TYPES.includes(activity.type)) throw ApiError.badRequest("System activity cannot be deleted");
  if (!isPrivileged(req.user) && String(activity.actor) !== String(req.user._id)) throw ApiError.forbidden();

  await activity.deleteOne();
  res.json({ message: "Interaction removed" });
};

const customerMeta = async (_req, res) => {
  res.json({ statuses: Customer.CUSTOMER_STATUSES, industries: Customer.INDUSTRIES });
};

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listActivities,
  addInteraction,
  deleteActivity,
  customerMeta,
};
