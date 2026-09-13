const ApiError = require("../utils/ApiError");
const { isPrivileged } = require("../utils/roles");

const ownershipScope = (user) => {
  if (isPrivileged(user)) return {};
  return { $or: [{ assignedTo: user._id }, { createdBy: user._id }] };
};

const canAccessRecord = (user, record) => {
  if (!record) return false;
  if (isPrivileged(user)) return true;
  const id = String(user._id);
  const assigned = record.assignedTo?._id ?? record.assignedTo;
  const creator = record.createdBy?._id ?? record.createdBy;
  return String(assigned) === id || String(creator) === id;
};

const assertAccess = (user, record, label = "Record") => {
  if (!record) throw ApiError.notFound(`${label} not found`);
  if (!canAccessRecord(user, record)) throw ApiError.notFound(`${label} not found`);
  return record;
};

const resolveAssignee = (user, requested) => {
  if (isPrivileged(user)) return requested || user._id;
  if (requested && String(requested) !== String(user._id)) {
    throw ApiError.forbidden("Only managers can assign records to other team members");
  }
  return user._id;
};

module.exports = { ownershipScope, canAccessRecord, assertAccess, resolveAssignee };
