const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { validateId } = require("../middleware/validate");
const dashboard = require("../controllers/dashboardController");
const notifications = require("../controllers/notificationController");
const { search } = require("../controllers/searchController");

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "crm360-api", time: new Date().toISOString() });
});

router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/customers", require("./customerRoutes"));
router.use("/leads", require("./leadRoutes"));
router.use("/tasks", require("./taskRoutes"));

router.get("/dashboard", protect, dashboard.getDashboard);
router.get("/search", protect, search);

router.get("/notifications", protect, notifications.listNotifications);
router.get("/notifications/unread-count", protect, notifications.unreadCount);
router.put("/notifications/read-all", protect, notifications.markAllRead);
router.put("/notifications/:id/read", protect, validateId(), notifications.markRead);
router.put("/notifications/:id/unread", protect, validateId(), notifications.markUnread);
router.delete("/notifications/:id", protect, validateId(), notifications.deleteNotification);

module.exports = router;
