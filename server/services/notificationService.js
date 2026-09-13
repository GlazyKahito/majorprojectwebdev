const Notification = require("../models/Notification");
const User = require("../models/User");
const Task = require("../models/Task");
const Lead = require("../models/Lead");

const PREFERENCE_BY_TYPE = {
  task_assigned: "notifyTaskAssigned",
  lead_assigned: "notifyLeadUpdates",
  lead_updated: "notifyLeadUpdates",
  deadline: "notifyDeadlines",
};

const DAY = 24 * 60 * 60 * 1000;
const lastSweep = new Map();

const wantsNotification = async (userId, type) => {
  const preference = PREFERENCE_BY_TYPE[type];
  if (!preference) return true;
  const user = await User.findById(userId).select("preferences isActive").lean();
  if (!user || !user.isActive) return false;
  return user.preferences?.[preference] !== false;
};

const notify = async ({ user, actor, type, title, message = "", link = "", dedupeKey }) => {
  if (!user) return null;
  const userId = user._id ?? user;
  const actorId = actor?._id ?? actor;

  if (actorId && String(actorId) === String(userId)) return null;
  if (!(await wantsNotification(userId, type))) return null;

  try {
    return await Notification.create({ user: userId, actor: actorId, type, title, message, link, dedupeKey });
  } catch (error) {
    if (error.code === 11000) return null;
    console.error("Failed to create notification", error.message);
    return null;
  }
};

const notifyMany = async (recipients, payload) => {
  const unique = [...new Set(recipients.filter(Boolean).map((r) => String(r._id ?? r)))];
  await Promise.all(unique.map((user) => notify({ ...payload, user })));
};

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

const sweepDeadlines = async (user) => {
  const key = String(user._id);
  const now = Date.now();

  if (lastSweep.has(key) && now - lastSweep.get(key) < 5 * 60 * 1000) return;
  lastSweep.set(key, now);

  if (user.preferences?.notifyDeadlines === false) return;

  const horizon = new Date(now + DAY);
  const lookback = new Date(now - 7 * DAY);

  const [tasks, leads] = await Promise.all([
    Task.find({
      assignedTo: user._id,
      status: { $ne: "completed" },
      dueDate: { $gte: lookback, $lte: horizon },
    })
      .select("title dueDate")
      .lean(),
    Lead.find({
      assignedTo: user._id,
      status: { $in: Lead.OPEN_STATUSES },
      followUpDate: { $gte: new Date(now - DAY), $lte: horizon },
    })
      .select("name company followUpDate")
      .lean(),
  ]);

  const operations = [];

  for (const task of tasks) {
    const overdue = new Date(task.dueDate).getTime() < now;
    operations.push({
      updateOne: {
        filter: { user: user._id, dedupeKey: `task-${overdue ? "overdue" : "due"}:${task._id}:${dayKey(task.dueDate)}` },
        update: {
          $setOnInsert: {
            user: user._id,
            type: "deadline",
            title: overdue ? `Overdue: ${task.title}` : `Due soon: ${task.title}`,
            message: overdue
              ? "This task is past its due date and still open."
              : "This task is due within the next 24 hours.",
            link: `/tasks?task=${task._id}`,
            read: false,
          },
        },
        upsert: true,
      },
    });
  }

  for (const lead of leads) {
    operations.push({
      updateOne: {
        filter: { user: user._id, dedupeKey: `lead-followup:${lead._id}:${dayKey(lead.followUpDate)}` },
        update: {
          $setOnInsert: {
            user: user._id,
            type: "deadline",
            title: `Follow up with ${lead.name}`,
            message: lead.company
              ? `Scheduled follow-up with ${lead.company} is coming up.`
              : "A scheduled follow-up is coming up.",
            link: `/leads/${lead._id}`,
            read: false,
          },
        },
        upsert: true,
      },
    });
  }

  if (operations.length) {
    try {
      await Notification.bulkWrite(operations, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) console.error("Deadline sweep failed", error.message);
    }
  }
};

module.exports = { notify, notifyMany, sweepDeadlines };
