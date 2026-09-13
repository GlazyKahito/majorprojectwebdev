const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const { parsePagination, paginated } = require("../utils/query");
const { sweepDeadlines } = require("../services/notificationService");

const listNotifications = async (req, res) => {
  await sweepDeadlines(req.user);

  const filter = { user: req.user._id };
  if (req.query.filter === "unread") filter.read = false;
  if (req.query.type && Notification.NOTIFICATION_TYPES.includes(req.query.type)) filter.type = req.query.type;

  const pagination = parsePagination(req.query, { limit: 20, max: 100 });
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).populate("actor", "name").lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  res.json({ ...paginated(items.map(({ dedupeKey, __v, ...n }) => n), total, pagination), unreadCount });
};

const unreadCount = async (req, res) => {
  await sweepDeadlines(req.user);
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ unreadCount: count });
};

const markRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) throw ApiError.notFound("Notification not found");
  res.json({ notification });
};

const markUnread = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: false }, $unset: { readAt: "" } },
    { new: true }
  );
  if (!notification) throw ApiError.notFound("Notification not found");
  res.json({ notification });
};

const markAllRead = async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true, readAt: new Date() } });
  res.json({ updated: result.modifiedCount });
};

const deleteNotification = async (req, res) => {
  const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) throw ApiError.notFound("Notification not found");
  res.json({ message: "Notification removed" });
};

module.exports = { listNotifications, unreadCount, markRead, markUnread, markAllRead, deleteNotification };
