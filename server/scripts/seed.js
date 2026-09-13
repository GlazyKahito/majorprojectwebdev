const mongoose = require("mongoose");
const User = require("../models/User");
const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const Notification = require("../models/Notification");
const Activity = require("../models/Activity");
const data = require("./seedData");

const DAY = 86400000;
const daysFromNow = (days, hour = 10) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const daysAgo = (days, hour = 11) => daysFromNow(-days, hour);

const STAGE_LABELS = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal Sent", won: "Won", lost: "Lost" };

const seedDatabase = async ({ log = console.log } = {}) => {
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Lead.deleteMany({}),
    Task.deleteMany({}),
    Notification.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  const userMap = {};
  for (const [index, entry] of data.users.entries()) {
    const { key, ...fields } = entry;
    const user = await User.create({
      ...fields,
      password: data.DEMO_PASSWORD,
      lastLoginAt: daysAgo(index % 3),
      createdAt: daysAgo(260 - index * 12),
    });
    userMap[key] = user;
  }
  log(`Created ${data.users.length} users`);

  const customerMap = {};
  const customerDocs = await Customer.insertMany(
    data.customers.map((c) => ({
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      website: c.website,
      industry: c.industry,
      status: c.status,
      notes: c.notes,
      lifetimeValue: c.ltv,
      address: { city: c.city, state: c.state, country: c.country },
      assignedTo: userMap[c.owner]._id,
      createdBy: userMap[c.owner]._id,
      createdAt: daysAgo(c.daysAgo),
      updatedAt: daysAgo(Math.max(c.daysAgo - 5, 1)),
    })),
    { timestamps: false }
  );
  customerDocs.forEach((doc) => (customerMap[doc.name] = doc));
  log(`Created ${customerDocs.length} customers`);

  const leadMap = {};
  const leadDocs = await Lead.insertMany(
    data.leads.map((l) => {
      const owner = l.owner ? userMap[l.owner] : null;
      const notes = (data.leadNotes[l.name] || []).map((body, i) => ({
        body,
        author: (owner || userMap.priya)._id,
        createdAt: daysAgo(Math.max(l.daysAgo - 2 - i * 3, 0)),
        updatedAt: daysAgo(Math.max(l.daysAgo - 2 - i * 3, 0)),
      }));
      const closed = ["won", "lost"].includes(l.status);
      return {
        name: l.name,
        company: l.company,
        email: l.email,
        title: l.title,
        phone: "",
        source: l.source,
        status: l.status,
        value: l.value,
        assignedTo: owner?._id,
        createdBy: (owner || userMap.priya)._id,
        notes,
        followUpDate: l.followUp === null || l.followUp === undefined ? undefined : daysFromNow(l.followUp, 11 + (l.value % 5)),
        followUpNote: l.followUp !== null && l.followUp !== undefined ? "Scheduled check-in" : "",
        lostReason: l.lostReason || "",
        closedAt: closed ? daysAgo(l.closedDaysAgo) : undefined,
        createdAt: daysAgo(l.daysAgo),
        updatedAt: closed ? daysAgo(l.closedDaysAgo) : daysAgo(Math.max(l.daysAgo - 3, 0)),
      };
    }),
    { timestamps: false }
  );
  leadDocs.forEach((doc) => (leadMap[doc.name] = doc));
  log(`Created ${leadDocs.length} leads`);

  const convertPairs = [
    ["Laura Bennett", "Hannah Morales"],
    ["Yusuf Khan", "William Hart"],
    ["Noah Fischer", "Carlos Mendes"],
  ];
  for (const [leadName, customerName] of convertPairs) {
    const lead = leadMap[leadName];
    const customer = customerMap[customerName];
    await Lead.updateOne({ _id: lead._id }, { $set: { convertedCustomer: customer._id, convertedAt: lead.closedAt } }, { timestamps: false });
    await Customer.updateOne({ _id: customer._id }, { $set: { convertedFromLead: lead._id } }, { timestamps: false });
  }

  const taskDocs = await Task.insertMany(
    data.tasks.map((t, i) => {
      const due = daysFromNow(t.due, 17);
      return {
        title: t.title,
        description: t.description,
        assignedTo: userMap[t.owner]._id,
        createdBy: userMap[t.creator]._id,
        priority: t.priority,
        status: t.status,
        dueDate: due,
        completedAt: t.status === "completed" ? new Date(due.getTime() - DAY / 2) : undefined,
        relatedCustomer: t.customer ? customerMap[t.customer]._id : undefined,
        relatedLead: t.lead ? leadMap[t.lead]._id : undefined,
        createdAt: daysAgo(10 - (i % 8)),
        updatedAt: daysAgo(i % 4),
      };
    }),
    { timestamps: false }
  );
  log(`Created ${taskDocs.length} tasks`);

  const activities = [];

  for (const c of data.customers) {
    const customer = customerMap[c.name];
    activities.push({
      type: "created",
      summary: `${userMap[c.owner].name} added ${c.name} as a customer`,
      actor: userMap[c.owner]._id,
      customer: customer._id,
      occurredAt: daysAgo(c.daysAgo),
    });
  }

  for (const item of data.interactions) {
    activities.push({
      type: item.type,
      summary: item.summary,
      body: item.body || "",
      actor: userMap[item.actor]._id,
      customer: customerMap[item.customer]._id,
      occurredAt: daysAgo(item.daysAgo, 9 + (item.daysAgo % 8)),
    });
  }

  for (const l of data.leads) {
    const lead = leadMap[l.name];
    const actor = l.owner ? userMap[l.owner] : userMap.priya;
    activities.push({ type: "created", summary: `${actor.name} created lead ${l.name}`, actor: actor._id, lead: lead._id, occurredAt: daysAgo(l.daysAgo, 9) });

    const order = ["new", "contacted", "qualified", "proposal"];
    const reached = l.status === "won" || l.status === "lost" ? order.length : order.indexOf(l.status) + 1;
    const span = l.closedDaysAgo !== undefined ? l.daysAgo - l.closedDaysAgo : l.daysAgo;
    let previous = "new";
    for (let step = 1; step < reached; step += 1) {
      const at = Math.round(l.daysAgo - (span * step) / (reached + 1));
      activities.push({
        type: "status_changed",
        summary: `${l.name} moved from ${STAGE_LABELS[previous]} to ${STAGE_LABELS[order[step]]}`,
        actor: actor._id,
        lead: lead._id,
        occurredAt: daysAgo(Math.max(at, 0), 14),
      });
      previous = order[step];
    }
    if (l.status === "won" || l.status === "lost") {
      activities.push({
        type: "status_changed",
        summary: `${l.name} moved from ${STAGE_LABELS[previous]} to ${STAGE_LABELS[l.status]}`,
        body: l.lostReason ? `Reason: ${l.lostReason}` : "",
        actor: actor._id,
        lead: lead._id,
        occurredAt: daysAgo(l.closedDaysAgo, 16),
      });
    }
  }

  for (const [leadName, customerName] of convertPairs) {
    const l = data.leads.find((x) => x.name === leadName);
    const actor = userMap[l.owner];
    activities.push({
      type: "converted",
      summary: `${actor.name} converted lead ${leadName} into a customer`,
      actor: actor._id,
      lead: leadMap[leadName]._id,
      customer: customerMap[customerName]._id,
      occurredAt: daysAgo(l.closedDaysAgo, 17),
    });
  }

  for (const t of data.tasks.filter((x) => x.status === "completed" && (x.customer || x.lead))) {
    const task = taskDocs.find((doc) => doc.title === t.title);
    activities.push({
      type: "task_completed",
      summary: `${userMap[t.owner].name} completed task "${t.title}"`,
      actor: userMap[t.owner]._id,
      task: task._id,
      customer: t.customer ? customerMap[t.customer]._id : undefined,
      lead: t.lead ? leadMap[t.lead]._id : undefined,
      occurredAt: task.completedAt,
    });
  }

  await Activity.insertMany(activities.map((a) => ({ ...a, createdAt: a.occurredAt, updatedAt: a.occurredAt })), { timestamps: false });

  const lastInteractions = await Activity.aggregate([
    { $match: { customer: { $ne: null }, type: { $in: ["call", "email", "meeting", "note"] } } },
    { $group: { _id: "$customer", last: { $max: "$occurredAt" } } },
  ]);
  await Promise.all(lastInteractions.map((row) => Customer.updateOne({ _id: row._id }, { $set: { lastInteractionAt: row.last } }, { timestamps: false })));
  log(`Created ${activities.length} activity entries`);

  const notifications = [];
  const push = (userKey, n) => notifications.push({ user: userMap[userKey]._id, ...n });
  const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

  const taskByTitle = (title) => taskDocs.find((doc) => doc.title === title);

  push("rohan", { actor: userMap.priya._id, type: "task_assigned", title: "New task: Security questionnaire follow-up with Helix", message: "Priya Raman assigned you a high priority task due today.", link: `/tasks?task=${taskByTitle("Security questionnaire follow-up with Helix")._id}`, read: false, createdAt: hoursAgo(2) });
  push("rohan", { actor: userMap.priya._id, type: "lead_updated", title: "New note on Aditya Rao", message: "Security review questionnaire sent to their IT team.", link: `/leads/${leadMap["Aditya Rao"]._id}`, read: false, createdAt: hoursAgo(5) });
  push("rohan", { type: "deadline", title: "Follow up with Kavya Iyer", message: "Scheduled follow-up with Saffron Hospitality is coming up.", link: `/leads/${leadMap["Kavya Iyer"]._id}`, read: false, createdAt: hoursAgo(7) });
  push("rohan", { actor: userMap.priya._id, type: "task_assigned", title: "New task: Draft pilot plan for Evergreen Clinics", message: "Priya Raman assigned you a medium priority task.", link: `/tasks?task=${taskByTitle("Draft pilot plan for Evergreen Clinics")._id}`, read: true, readAt: hoursAgo(20), createdAt: hoursAgo(26) });
  push("rohan", { actor: userMap.admin._id, type: "lead_assigned", title: "Lead assigned: Siddharth Jain", message: "Aarav Mehta assigned Vertex Infra to you.", link: `/leads/${leadMap["Siddharth Jain"]._id}`, read: true, readAt: hoursAgo(70), createdAt: hoursAgo(72) });
  push("rohan", { actor: userMap.priya._id, type: "lead_updated", title: "Harsh Vardhan moved to Won", message: "Priya Raman moved to Won.", link: `/leads/${leadMap["Harsh Vardhan"]._id}`, read: true, readAt: hoursAgo(280), createdAt: hoursAgo(288) });

  push("priya", { actor: userMap.daniel._id, type: "lead_updated", title: "Benjamin Scott moved to Proposal Sent", message: "Daniel Okafor moved to Proposal Sent, deal value updated to 132,000.", link: `/leads/${leadMap["Benjamin Scott"]._id}`, read: false, createdAt: hoursAgo(3) });
  push("priya", { actor: userMap.admin._id, type: "task_assigned", title: "New task: Review Q3 pipeline with the enterprise team", message: "Aarav Mehta assigned you a medium priority task.", link: `/tasks?task=${taskByTitle("Review Q3 pipeline with the enterprise team")._id}`, read: false, createdAt: hoursAgo(9) });
  push("priya", { type: "deadline", title: "Follow up with Grace Kim", message: "Scheduled follow-up with Tidewater Insurance is coming up.", link: `/leads/${leadMap["Grace Kim"]._id}`, read: false, createdAt: hoursAgo(12) });
  push("priya", { actor: userMap.maya._id, type: "task_assigned", title: "Completed: Share HIPAA documentation with Brightline", message: "Maya Chen marked this task as complete.", link: `/tasks?task=${taskByTitle("Share HIPAA documentation with Brightline")._id}`, read: true, readAt: hoursAgo(60), createdAt: hoursAgo(70) });
  push("priya", { actor: userMap.rohan._id, type: "lead_updated", title: "Harsh Vardhan moved to Won", message: "Rohan Kapoor moved to Won.", link: `/leads/${leadMap["Harsh Vardhan"]._id}`, read: true, readAt: hoursAgo(280), createdAt: hoursAgo(290) });

  push("admin", { actor: userMap.priya._id, type: "task_assigned", title: "Completed: Send welcome pack to Granite Peak", message: "Priya Raman marked this task as complete.", link: `/tasks?task=${taskByTitle("Send welcome pack to Granite Peak")._id}`, read: false, createdAt: hoursAgo(4) });
  push("admin", { actor: userMap.sara._id, type: "lead_updated", title: "Charlotte Evans moved to Lost", message: "Sara Lindqvist moved to Lost.", link: `/leads/${leadMap["Charlotte Evans"]._id}`, read: false, createdAt: hoursAgo(30) });
  push("admin", { type: "system", title: "Welcome to CRM360", message: "Your workspace is ready. Invite your team from the Users page.", link: "/users", read: true, readAt: hoursAgo(400), createdAt: hoursAgo(420) });

  push("sara", { actor: userMap.daniel._id, type: "task_assigned", title: "New task: Prepare pricing for Finstack SSO plan", message: "Daniel Okafor assigned you a high priority task.", link: `/tasks?task=${taskByTitle("Prepare pricing for Finstack SSO plan")._id}`, read: false, createdAt: hoursAgo(28) });
  push("sara", { type: "deadline", title: "Overdue: Prepare pricing for Finstack SSO plan", message: "This task is past its due date and still open.", link: `/tasks?task=${taskByTitle("Prepare pricing for Finstack SSO plan")._id}`, read: false, createdAt: hoursAgo(6) });
  push("maya", { type: "deadline", title: "Due soon: Call Marcus Bell at Ironclad Security", message: "This task is due within the next 24 hours.", link: `/tasks?task=${taskByTitle("Call Marcus Bell at Ironclad Security")._id}`, read: false, createdAt: hoursAgo(1) });
  push("kabir", { actor: userMap.priya._id, type: "lead_assigned", title: "Lead assigned: Riya Sethi", message: "Priya Raman assigned UrbanNest Interiors to you.", link: `/leads/${leadMap["Riya Sethi"]._id}`, read: false, createdAt: hoursAgo(10) });
  push("daniel", { actor: userMap.priya._id, type: "task_assigned", title: "New task: Send revised proposal to Clearwater Utilities", message: "Priya Raman assigned you a high priority task.", link: `/tasks?task=${taskByTitle("Send revised proposal to Clearwater Utilities")._id}`, read: false, createdAt: hoursAgo(8) });

  await Notification.insertMany(notifications.map((n) => ({ ...n, updatedAt: n.createdAt })), { timestamps: false });
  log(`Created ${notifications.length} notifications`);

  return { users: userMap, password: data.DEMO_PASSWORD };
};

module.exports = { seedDatabase };

if (require.main === module) {
  const connectDB = require("../config/db");

  (async () => {
    try {
      await connectDB();
      console.log("Seeding CRM360 demo workspace...");
      await seedDatabase();
      console.log("\nDemo accounts (password: Demo@1234)");
      console.log("  Admin            admin@crm360.app");
      console.log("  Sales Manager    manager@crm360.app");
      console.log("  Sales Executive  executive@crm360.app");
    } catch (error) {
      console.error("Seed failed:", error);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}
