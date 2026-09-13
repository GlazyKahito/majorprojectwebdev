const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { searchRegex, parsePagination, parseSort, paginated, isObjectId } = require("../utils/query");
const { isPrivileged } = require("../utils/roles");
const { ownershipScope, assertAccess, resolveAssignee } = require("../services/accessService");
const { logActivity } = require("../services/activityService");
const { notify, notifyMany } = require("../services/notificationService");

const SORTABLE = ["name", "company", "value", "status", "createdAt", "updatedAt", "followUpDate"];
const OWNER_FIELDS = "name email role title";

const STAGE_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

const buildFilter = (user, query) => {
  const conditions = [ownershipScope(user)];

  if (query.q) {
    const regex = searchRegex(query.q);
    conditions.push({ $or: [{ name: regex }, { company: regex }, { email: regex }, { phone: regex }] });
  }
  if (query.status === "open") conditions.push({ status: { $in: Lead.OPEN_STATUSES } });
  else if (query.status && Lead.LEAD_STATUSES.includes(query.status)) conditions.push({ status: query.status });
  if (query.source && Lead.LEAD_SOURCES.includes(query.source)) conditions.push({ source: query.source });
  if (query.assignedTo === "unassigned") conditions.push({ assignedTo: null });
  else if (query.assignedTo && isObjectId(query.assignedTo)) conditions.push({ assignedTo: query.assignedTo });
  if (query.followUp === "overdue") conditions.push({ followUpDate: { $lt: new Date() }, status: { $in: Lead.OPEN_STATUSES } });
  if (query.followUp === "upcoming") conditions.push({ followUpDate: { $gte: new Date() } });

  return { $and: conditions };
};

const ensureAssignee = async (id) => {
  if (!id) return;
  if (!(await User.exists({ _id: id, isActive: true }))) {
    throw ApiError.badRequest("Assigned team member was not found");
  }
};

const populateLead = (query) =>
  query
    .populate("assignedTo", OWNER_FIELDS)
    .populate("createdBy", "name")
    .populate("notes.author", "name")
    .populate("convertedCustomer", "name company status");

const listLeads = async (req, res) => {
  const filter = buildFilter(req.user, req.query);
  const sort = parseSort(req.query.sort, SORTABLE);

  if (req.query.view === "pipeline") {
    const items = await Lead.find(filter)
      .select("-notes")
      .sort({ updatedAt: -1 })
      .limit(500)
      .populate("assignedTo", OWNER_FIELDS)
      .lean();
    return res.json({ items });
  }

  const pagination = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Lead.find(filter).select("-notes").sort(sort).skip(pagination.skip).limit(pagination.limit).populate("assignedTo", OWNER_FIELDS).lean(),
    Lead.countDocuments(filter),
  ]);

  res.json(paginated(items, total, pagination));
};

const getLead = async (req, res) => {
  const lead = assertAccess(req.user, await populateLead(Lead.findById(req.params.id)), "Lead");
  res.json({ lead });
};

const createLead = async (req, res) => {
  const { note, ...data } = req.body;
  const assignedTo = resolveAssignee(req.user, data.assignedTo);
  await ensureAssignee(assignedTo);

  const lead = new Lead({ ...data, assignedTo, createdBy: req.user._id });
  if (note) lead.notes.push({ body: note, author: req.user._id });
  await lead.save();

  await logActivity({ type: "created", summary: `${req.user.name} created lead ${lead.name}`, actor: req.user, lead });

  await notify({
    user: assignedTo,
    actor: req.user,
    type: "lead_assigned",
    title: `New lead assigned: ${lead.name}`,
    message: `${req.user.name} assigned ${lead.company || lead.name} to you${lead.value ? ` (${lead.value.toLocaleString("en-US")} deal)` : ""}.`,
    link: `/leads/${lead._id}`,
  });

  res.status(201).json({ lead: await populateLead(Lead.findById(lead._id)) });
};

const applyLeadChanges = async (req, lead, updates) => {
  const previous = {
    status: lead.status,
    assignedTo: lead.assignedTo ? String(lead.assignedTo) : null,
    followUpDate: lead.followUpDate ? lead.followUpDate.getTime() : null,
    value: lead.value,
  };

  if ("assignedTo" in updates) {
    if (!isPrivileged(req.user)) {
      if (updates.assignedTo && String(updates.assignedTo) !== previous.assignedTo) {
        throw ApiError.forbidden("Only managers can reassign leads");
      }
      delete updates.assignedTo;
    } else {
      await ensureAssignee(updates.assignedTo);
    }
  }

  const { note, ...fields } = updates;
  Object.assign(lead, fields);
  if (note) lead.notes.push({ body: note, author: req.user._id });
  await lead.save();

  const changes = [];
  const tasks = [];

  if (lead.status !== previous.status) {
    changes.push(`moved to ${STAGE_LABELS[lead.status]}`);
    tasks.push(
      logActivity({
        type: "status_changed",
        summary: `${lead.name} moved from ${STAGE_LABELS[previous.status]} to ${STAGE_LABELS[lead.status]}`,
        body: lead.status === "lost" && lead.lostReason ? `Reason: ${lead.lostReason}` : "",
        actor: req.user,
        lead,
        customer: lead.convertedCustomer,
      })
    );
  }
  if (lead.value !== previous.value) changes.push(`deal value updated to ${lead.value.toLocaleString("en-US")}`);
  if ((lead.followUpDate ? lead.followUpDate.getTime() : null) !== previous.followUpDate && lead.followUpDate) {
    changes.push(`follow-up set for ${lead.followUpDate.toDateString()}`);
  }

  const newOwner = lead.assignedTo ? String(lead.assignedTo) : null;
  if (newOwner && newOwner !== previous.assignedTo) {
    const owner = await User.findById(newOwner).select("name");
    tasks.push(logActivity({ type: "assigned", summary: `${lead.name} assigned to ${owner?.name || "a team member"}`, actor: req.user, lead }));
    tasks.push(
      notify({
        user: newOwner,
        actor: req.user,
        type: "lead_assigned",
        title: `Lead assigned: ${lead.name}`,
        message: `${req.user.name} assigned ${lead.company || lead.name} to you.`,
        link: `/leads/${lead._id}`,
      })
    );
  }

  if (changes.length) {
    const recipients = [newOwner === previous.assignedTo ? lead.assignedTo : null, lead.createdBy];
    tasks.push(
      notifyMany(recipients, {
        actor: req.user,
        type: "lead_updated",
        title: `${lead.name} ${changes[0]}`,
        message: `${req.user.name} ${changes.join(", ")}.`,
        link: `/leads/${lead._id}`,
      })
    );
    if (lead.status === previous.status) {
      tasks.push(logActivity({ type: "updated", summary: `${req.user.name} ${changes.join(", ")}`, actor: req.user, lead }));
    }
  } else if (!note && !tasks.length) {
    tasks.push(logActivity({ type: "updated", summary: `${req.user.name} updated lead details`, actor: req.user, lead }));
  }

  if (note) {
    tasks.push(logActivity({ type: "note", summary: `${req.user.name} added a note`, body: note, actor: req.user, lead }));
  }

  await Promise.all(tasks);
  return lead;
};

const updateLead = async (req, res) => {
  const lead = assertAccess(req.user, await Lead.findById(req.params.id), "Lead");
  await applyLeadChanges(req, lead, { ...req.body });
  res.json({ lead: await populateLead(Lead.findById(lead._id)) });
};

const updateLeadStatus = async (req, res) => {
  const lead = assertAccess(req.user, await Lead.findById(req.params.id), "Lead");
  const updates = { status: req.body.status };
  if (req.body.lostReason !== undefined) updates.lostReason = req.body.lostReason;
  await applyLeadChanges(req, lead, updates);
  const populated = await Lead.findById(lead._id).select("-notes").populate("assignedTo", OWNER_FIELDS);
  res.json({ lead: populated });
};

const addNote = async (req, res) => {
  const lead = assertAccess(req.user, await Lead.findById(req.params.id), "Lead");
  lead.notes.push({ body: req.body.body, author: req.user._id });
  await lead.save();

  await Promise.all([
    logActivity({ type: "note", summary: `${req.user.name} added a note`, body: req.body.body, actor: req.user, lead }),
    notifyMany([lead.assignedTo, lead.createdBy], {
      actor: req.user,
      type: "lead_updated",
      title: `New note on ${lead.name}`,
      message: req.body.body.slice(0, 140),
      link: `/leads/${lead._id}`,
    }),
  ]);

  const populated = await populateLead(Lead.findById(lead._id));
  res.status(201).json({ lead: populated, note: populated.notes[populated.notes.length - 1] });
};

const deleteNote = async (req, res) => {
  const lead = assertAccess(req.user, await Lead.findById(req.params.id), "Lead");
  const note = lead.notes.id(req.params.noteId);

  if (!note) throw ApiError.notFound("Note not found");
  if (!isPrivileged(req.user) && String(note.author) !== String(req.user._id)) {
    throw ApiError.forbidden("You can only delete your own notes");
  }

  note.deleteOne();
  await lead.save();
  res.json({ lead: await populateLead(Lead.findById(lead._id)) });
};

const deleteLead = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound("Lead not found");

  await Activity.deleteMany({ lead: lead._id, customer: { $exists: false } });
  await Promise.all([
    Activity.updateMany({ lead: lead._id }, { $unset: { lead: "" } }),
    Task.updateMany({ relatedLead: lead._id }, { $unset: { relatedLead: "" } }),
    Customer.updateMany({ convertedFromLead: lead._id }, { $unset: { convertedFromLead: "" } }),
  ]);

  await lead.deleteOne();
  res.json({ message: "Lead deleted" });
};

const convertLead = async (req, res) => {
  const lead = assertAccess(req.user, await Lead.findById(req.params.id), "Lead");

  if (lead.convertedCustomer && (await Customer.exists({ _id: lead.convertedCustomer }))) {
    throw ApiError.conflict("This lead has already been converted");
  }

  const noteText = lead.notes.map((n) => n.body).join("\n\n");
  const customer = await Customer.create({
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    industry: req.body.industry || "Other",
    status: req.body.status || "active",
    assignedTo: lead.assignedTo || req.user._id,
    createdBy: req.user._id,
    notes: noteText.slice(0, 5000),
    lifetimeValue: lead.value || 0,
    convertedFromLead: lead._id,
    lastInteractionAt: new Date(),
  });

  const previousStatus = lead.status;
  lead.convertedCustomer = customer._id;
  lead.convertedAt = new Date();
  if (req.body.markWon !== false && lead.status !== "won") lead.status = "won";
  await lead.save();

  await Promise.all([
    Activity.updateMany({ lead: lead._id, customer: { $exists: false } }, { $set: { customer: customer._id } }),
    Task.updateMany({ relatedLead: lead._id, relatedCustomer: { $exists: false } }, { $set: { relatedCustomer: customer._id } }),
  ]);

  await logActivity({
    type: "converted",
    summary: `${req.user.name} converted lead ${lead.name} into a customer`,
    body: previousStatus !== lead.status ? `Deal marked as won from ${STAGE_LABELS[previousStatus]}` : "",
    actor: req.user,
    lead,
    customer,
  });

  await notifyMany([lead.assignedTo, lead.createdBy], {
    actor: req.user,
    type: "lead_updated",
    title: `${lead.name} converted to customer`,
    message: `${req.user.name} closed ${lead.company || lead.name} and created a customer record.`,
    link: `/customers/${customer._id}`,
  });

  res.status(201).json({ customer, lead: await populateLead(Lead.findById(lead._id)) });
};

const listActivities = async (req, res) => {
  const lead = assertAccess(req.user, await Lead.findById(req.params.id).select("assignedTo createdBy"), "Lead");
  const items = await Activity.find({ lead: lead._id }).sort({ occurredAt: -1 }).limit(100).populate("actor", "name").lean();
  res.json({ items });
};

const addInteraction = async (req, res) => {
  const lead = assertAccess(req.user, await Lead.findById(req.params.id), "Lead");
  const activity = await logActivity({ ...req.body, actor: req.user, lead, customer: lead.convertedCustomer });
  await activity.populate("actor", "name");
  res.status(201).json({ activity });
};

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  addNote,
  deleteNote,
  deleteLead,
  convertLead,
  listActivities,
  addInteraction,
};
