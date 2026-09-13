const mongoose = require("mongoose");

const TASK_STATUSES = ["todo", "in_progress", "completed"];
const TASK_PRIORITIES = ["low", "medium", "high"];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, enum: TASK_PRIORITIES, default: "medium" },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    dueDate: Date,
    completedAt: Date,
    relatedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    relatedLead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });

taskSchema.pre("save", function syncCompletedAt(next) {
  if (this.isModified("status")) {
    this.completedAt = this.status === "completed" ? this.completedAt || new Date() : undefined;
  }
  next();
});

taskSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Task", taskSchema);
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.TASK_PRIORITIES = TASK_PRIORITIES;
