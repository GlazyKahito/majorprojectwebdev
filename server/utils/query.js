const mongoose = require("mongoose");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchRegex = (value) => new RegExp(escapeRegex(value.trim()), "i");

const parsePagination = (query, defaults = { limit: 20, max: 100 }) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaults.limit, 1), defaults.max);
  return { page, limit, skip: (page - 1) * limit };
};

const parseSort = (value, allowed, fallback = "-createdAt") => {
  if (!value) return fallback;
  const field = value.replace(/^-/, "");
  return allowed.includes(field) ? value : fallback;
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === String(value);

const paginated = (items, total, { page, limit }) => ({
  items,
  pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
});

module.exports = { escapeRegex, searchRegex, parsePagination, parseSort, isObjectId, paginated };
