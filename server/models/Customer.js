const mongoose = require("mongoose");

const CUSTOMER_STATUSES = ["active", "prospect", "inactive", "churned"];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Logistics",
  "Hospitality",
  "Media",
  "Energy",
  "Other",
];

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
    },
    industry: { type: String, enum: INDUSTRIES, default: "Other" },
    status: { type: String, enum: CUSTOMER_STATUSES, default: "active" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, maxlength: 5000, default: "" },
    website: { type: String, trim: true, default: "" },
    lifetimeValue: { type: Number, min: 0, default: 0 },
    lastInteractionAt: Date,
    convertedFromLead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  },
  { timestamps: true }
);

customerSchema.index({ name: "text", company: "text", email: "text" });
customerSchema.index({ assignedTo: 1, status: 1 });
customerSchema.index({ createdAt: -1 });

customerSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Customer", customerSchema);
module.exports.CUSTOMER_STATUSES = CUSTOMER_STATUSES;
module.exports.INDUSTRIES = INDUSTRIES;
