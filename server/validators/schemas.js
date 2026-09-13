const { z, objectId, optionalObjectId, optionalDate, trimmed, optionalEmail, password } = require("./common");
const { ROLES } = require("../utils/roles");
const { CUSTOMER_STATUSES, INDUSTRIES } = require("../models/Customer");
const { LEAD_STATUSES, LEAD_SOURCES } = require("../models/Lead");
const { TASK_STATUSES, TASK_PRIORITIES } = require("../models/Task");
const { INTERACTION_TYPES } = require("../models/Activity");

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const name = z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long");

const register = z.object({ name, email, password });

const login = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

const forgotPassword = z.object({ email });

const resetPassword = z.object({
  token: z.string().min(20, "Reset link is invalid"),
  password,
});

const updateProfile = z.object({
  name: name.optional(),
  email: email.optional(),
  title: trimmed(80, "Title").optional(),
  phone: trimmed(30, "Phone").optional(),
  timezone: trimmed(60, "Timezone").optional(),
});

const changePassword = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

const updatePreferences = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  currency: z.enum(["USD", "INR", "EUR", "GBP"]).optional(),
  notifyTaskAssigned: z.boolean().optional(),
  notifyLeadUpdates: z.boolean().optional(),
  notifyDeadlines: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
});

const createUser = z.object({
  name,
  email,
  password,
  role: z.enum(Object.values(ROLES)),
  title: trimmed(80, "Title").optional(),
  phone: trimmed(30, "Phone").optional(),
});

const updateUser = z.object({
  name: name.optional(),
  email: email.optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  title: trimmed(80, "Title").optional(),
  phone: trimmed(30, "Phone").optional(),
  isActive: z.boolean().optional(),
});

const address = z
  .object({
    street: trimmed(160, "Street").optional(),
    city: trimmed(80, "City").optional(),
    state: trimmed(80, "State").optional(),
    country: trimmed(80, "Country").optional(),
    postalCode: trimmed(20, "Postal code").optional(),
  })
  .partial();

const customerFields = {
  name: z.string().trim().min(2, "Customer name is required").max(120, "Name is too long"),
  company: trimmed(120, "Company").optional(),
  email: optionalEmail.optional(),
  phone: trimmed(30, "Phone").optional(),
  website: trimmed(200, "Website").optional(),
  address: address.optional(),
  industry: z.enum(INDUSTRIES).optional(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  assignedTo: optionalObjectId,
  notes: trimmed(5000, "Notes").optional(),
  lifetimeValue: z.coerce.number().min(0, "Value cannot be negative").optional(),
};

const createCustomer = z.object(customerFields);
const updateCustomer = z.object(customerFields).partial();

const leadFields = {
  name: z.string().trim().min(2, "Lead name is required").max(120, "Name is too long"),
  company: trimmed(120, "Company").optional(),
  email: optionalEmail.optional(),
  phone: trimmed(30, "Phone").optional(),
  title: trimmed(80, "Job title").optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  value: z.coerce.number().min(0, "Deal value cannot be negative").max(1e10, "Deal value is too large").optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  assignedTo: optionalObjectId,
  followUpDate: optionalDate,
  followUpNote: trimmed(500, "Follow-up note").optional(),
  expectedCloseDate: optionalDate,
  lostReason: trimmed(300, "Lost reason").optional(),
  note: trimmed(2000, "Note").optional(),
};

const createLead = z.object(leadFields);
const updateLead = z.object(leadFields).partial();

const leadStatus = z.object({
  status: z.enum(LEAD_STATUSES),
  lostReason: trimmed(300, "Lost reason").optional(),
});

const leadNote = z.object({
  body: z.string().trim().min(1, "Note cannot be empty").max(2000, "Note is too long"),
});

const convertLead = z.object({
  industry: z.enum(INDUSTRIES).optional(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  markWon: z.boolean().optional(),
});

const taskFields = {
  title: z.string().trim().min(2, "Task title is required").max(160, "Title is too long"),
  description: trimmed(4000, "Description").optional(),
  assignedTo: optionalObjectId,
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: optionalDate,
  relatedCustomer: optionalObjectId,
  relatedLead: optionalObjectId,
};

const createTask = z.object(taskFields);
const updateTask = z.object(taskFields).partial();

const interaction = z.object({
  type: z.enum(INTERACTION_TYPES),
  summary: z.string().trim().min(2, "Add a short summary").max(240, "Summary is too long"),
  body: trimmed(4000, "Details").optional(),
  occurredAt: optionalDate,
});

const deleteUser = z.object({ reassignTo: objectId.optional() });

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  updatePreferences,
  createUser,
  updateUser,
  deleteUser,
  createCustomer,
  updateCustomer,
  createLead,
  updateLead,
  leadStatus,
  leadNote,
  convertLead,
  createTask,
  updateTask,
  interaction,
};
