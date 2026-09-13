const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/schemas");

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

router.post("/register", authLimiter, validate(schemas.register), controller.register);
router.post("/login", authLimiter, validate(schemas.login), controller.login);
router.post("/forgot-password", authLimiter, validate(schemas.forgotPassword), controller.forgotPassword);
router.post("/reset-password", authLimiter, validate(schemas.resetPassword), controller.resetPassword);

router.use(protect);
router.post("/logout", controller.logout);
router.get("/me", controller.me);
router.put("/profile", validate(schemas.updateProfile), controller.updateProfile);
router.put("/password", validate(schemas.changePassword), controller.changePassword);
router.put("/preferences", validate(schemas.updatePreferences), controller.updatePreferences);

module.exports = router;
