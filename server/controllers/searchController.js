const Customer = require("../models/Customer");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const { searchRegex } = require("../utils/query");
const { ownershipScope } = require("../services/accessService");

const search = async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (q.length < 2) {
    return res.json({ customers: [], leads: [], tasks: [] });
  }

  const regex = searchRegex(q);
  const scope = ownershipScope(req.user);

  const [customers, leads, tasks] = await Promise.all([
    Customer.find({ $and: [scope, { $or: [{ name: regex }, { company: regex }, { email: regex }] }] })
      .select("name company email status")
      .limit(5)
      .lean(),
    Lead.find({ $and: [scope, { $or: [{ name: regex }, { company: regex }, { email: regex }] }] })
      .select("name company status value")
      .limit(5)
      .lean(),
    Task.find({ $and: [scope, { title: regex }] })
      .select("title status priority dueDate")
      .limit(5)
      .lean(),
  ]);

  res.json({ customers, leads, tasks });
};

module.exports = { search };
