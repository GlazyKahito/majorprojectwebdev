const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { ROLES } = require("../utils/roles");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.EXECUTIVE },
    title: { type: String, trim: true, maxlength: 80, default: "" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    timezone: { type: String, default: "Asia/Kolkata" },
    isActive: { type: Boolean, default: true },
    preferences: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      currency: { type: String, enum: ["USD", "INR", "EUR", "GBP"], default: "USD" },
      notifyTaskAssigned: { type: Boolean, default: true },
      notifyLeadUpdates: { type: Boolean, default: true },
      notifyDeadlines: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
    },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    tokenVersion: { type: Number, default: 0, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
    this.tokenVersion = (this.tokenVersion || 0) + 1;
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  return token;
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
