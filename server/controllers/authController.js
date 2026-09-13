const crypto = require("crypto");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../utils/roles");
const { signToken } = require("../utils/token");
const { clientUrl, isProduction, exposeResetLink } = require("../config/env");
const { sendPasswordResetEmail, isMailConfigured } = require("../services/mailService");

const authPayload = (user) => ({ token: signToken(user), user });

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const isFirstUser = (await User.estimatedDocumentCount()) === 0;
  const user = await User.create({
    name,
    email,
    password,
    role: isFirstUser ? ROLES.ADMIN : ROLES.EXECUTIVE,
    title: isFirstUser ? "Workspace Owner" : "Sales Executive",
    lastLoginAt: new Date(),
  });

  res.status(201).json(authPayload(user));
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password +tokenVersion");

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Incorrect email or password");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Your account has been deactivated. Contact your workspace admin.");
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json(authPayload(user));
};

const logout = async (_req, res) => {
  res.json({ message: "Signed out" });
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email, isActive: true });
  const response = { message: "If an account exists for that email, a reset link is on its way." };

  if (user) {
    const token = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${clientUrl}/reset-password/${token}`;

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (error) {
      console.error("Password reset email failed", error.message);
    }

    if (!isMailConfigured() && (!isProduction || exposeResetLink)) {
      response.resetUrl = `/reset-password/${token}`;
    }
  }

  res.json(response);
};

const resetPassword = async (req, res) => {
  const hashed = crypto.createHash("sha256").update(req.body.token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires +tokenVersion");

  if (!user) {
    throw ApiError.badRequest("This reset link is invalid or has expired");
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  res.json({ message: "Password updated", ...authPayload(user) });
};

const updateProfile = async (req, res) => {
  const { email } = req.body;

  if (email && email !== req.user.email && (await User.exists({ email }))) {
    throw ApiError.conflict("That email is already in use");
  }

  Object.assign(req.user, req.body);
  await req.user.save();

  res.json({ user: req.user });
};

const changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select("+password +tokenVersion");

  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  user.password = req.body.newPassword;
  await user.save();

  res.json({ message: "Password changed", ...authPayload(user) });
};

const updatePreferences = async (req, res) => {
  const current = req.user.preferences?.toObject?.() ?? req.user.preferences ?? {};
  req.user.preferences = { ...current, ...req.body };
  await req.user.save();
  res.json({ user: req.user });
};

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  updatePreferences,
};
