const mongoose = require("mongoose");

const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const OPEN_STATUSES = ["new", "contacted", "qualified", "proposal"];
const LEAD_SOURCES = ["website", "referral", "linkedin", "cold_call", "email_campaign", "event", "partner", "other"];

const noteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    title: { type: String, trim: true, maxlength: 80, default: "" },
    source: { type: String, enum: LEAD_SOURCES, default: "website" },
    status: { type: String, enum: LEAD_STATUSES, default: "new" },
    value: { type: Number, min: 0, default: 0 },
    probability: { type: Number, min: 0, max: 100 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: [noteSchema],
    followUpDate: Date,
    followUpNote: { type: String, trim: true, maxlength: 500, default: "" },
    expectedCloseDate: Date,
    lostReason: { type: String, trim: true, maxlength: 300, default: "" },
    closedAt: Date,
    convertedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    convertedAt: Date,
  },
  { timestamps: true }
);

leadSchema.index({ status: 1, assignedTo: 1 });
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ closedAt: -1 });

leadSchema.pre("save", function syncClosedAt(next) {
  if (this.isModified("status")) {
    if (["won", "lost"].includes(this.status)) {
      if (!this.closedAt) this.closedAt = new Date();
    } else {
      this.closedAt = undefined;
    }
  }
  next();
});

leadSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Lead", leadSchema);
module.exports.LEAD_STATUSES = LEAD_STATUSES;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
module.exports.LEAD_SOURCES = LEAD_SOURCES;
