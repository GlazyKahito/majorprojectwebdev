const mongoose = require("mongoose");

const INTERACTION_TYPES = ["call", "email", "meeting", "note"];
const ACTIVITY_TYPES = [...INTERACTION_TYPES, "created", "updated", "status_changed", "assigned", "converted", "task_completed"];

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    summary: { type: String, required: true, maxlength: 240 },
    body: { type: String, maxlength: 4000, default: "" },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

activitySchema.index({ customer: 1, occurredAt: -1 });
activitySchema.index({ lead: 1, occurredAt: -1 });
activitySchema.index({ occurredAt: -1 });

activitySchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Activity", activitySchema);
module.exports.INTERACTION_TYPES = INTERACTION_TYPES;
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
