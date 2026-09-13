export const ROLES = {
  admin: "Admin",
  manager: "Sales Manager",
  executive: "Sales Executive",
};

export const ROLE_DESCRIPTIONS = {
  admin: "Full access to every record, user management and workspace analytics.",
  manager: "Manages customers and leads across the team, assigns work and views sales analytics.",
  executive: "Works assigned leads and customers, and manages their own tasks.",
};

export const LEAD_STAGES = [
  { value: "new", label: "New", color: "#8a8a93" },
  { value: "contacted", label: "Contacted", color: "#0891b2" },
  { value: "qualified", label: "Qualified", color: "#7c3aed" },
  { value: "proposal", label: "Proposal Sent", color: "#d97706" },
  { value: "won", label: "Won", color: "#16a34a" },
  { value: "lost", label: "Lost", color: "#dc2626" },
];

export const OPEN_STAGES = ["new", "contacted", "qualified", "proposal"];

export const LEAD_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cold_call", label: "Cold call" },
  { value: "email_campaign", label: "Email campaign" },
  { value: "event", label: "Event" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

export const CUSTOMER_STATUSES = [
  { value: "active", label: "Active", color: "#16a34a" },
  { value: "prospect", label: "Prospect", color: "#4f5ee8" },
  { value: "inactive", label: "Inactive", color: "#a1a1aa" },
  { value: "churned", label: "Churned", color: "#dc2626" },
];

export const INDUSTRIES = [
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

export const TASK_STATUSES = [
  { value: "todo", label: "To do", color: "#a1a1aa" },
  { value: "in_progress", label: "In progress", color: "#d97706" },
  { value: "completed", label: "Completed", color: "#16a34a" },
];

export const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const INTERACTION_TYPES = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
];

export const CURRENCIES = [
  { value: "USD", label: "US Dollar", locale: "en-US" },
  { value: "INR", label: "Indian Rupee", locale: "en-IN" },
  { value: "EUR", label: "Euro", locale: "de-DE" },
  { value: "GBP", label: "British Pound", locale: "en-GB" },
];

export const findOption = (list, value) => list.find((item) => item.value === value);
export const labelFor = (list, value) => findOption(list, value)?.label ?? value;
