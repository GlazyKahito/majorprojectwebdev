const mongoose = require("mongoose");

const NOTIFICATION_TYPES = ["task_assigned", "lead_assigned", "lead_updated", "deadline", "system"];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, maxlength: 500, default: "" },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
    readAt: Date,
    dedupeKey: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });

notificationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.dedupeKey;
    return ret;
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
