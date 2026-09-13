const Activity = require("../models/Activity");
const Customer = require("../models/Customer");

const INTERACTION_TYPES = new Set(Activity.INTERACTION_TYPES);

const logActivity = async ({ type, summary, body = "", actor, customer, lead, task, occurredAt }) => {
  const activity = await Activity.create({
    type,
    summary,
    body,
    actor: actor?._id ?? actor,
    customer: customer?._id ?? customer,
    lead: lead?._id ?? lead,
    task: task?._id ?? task,
    occurredAt: occurredAt || new Date(),
  });

  if (activity.customer && INTERACTION_TYPES.has(type)) {
    await Customer.updateOne(
      {
        _id: activity.customer,
        $or: [{ lastInteractionAt: { $exists: false } }, { lastInteractionAt: { $lt: activity.occurredAt } }],
      },
      { $set: { lastInteractionAt: activity.occurredAt } }
    );
  }

  return activity;
};

const safeLog = (payload) =>
  logActivity(payload).catch((error) => {
    console.error("Failed to record activity", error.message);
  });

module.exports = { logActivity, safeLog };
