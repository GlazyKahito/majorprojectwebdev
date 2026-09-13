import { CURRENCIES } from "./constants";

let currentCurrency = "USD";

export const setCurrency = (currency) => {
  currentCurrency = currency || "USD";
};

const localeFor = (currency) => CURRENCIES.find((c) => c.value === currency)?.locale || "en-US";

export const formatCurrency = (value, { compact = false, currency = currentCurrency } = {}) => {
  const amount = Number(value) || 0;
  const useCompact = compact && Math.abs(amount) >= 10000;
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    notation: useCompact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: useCompact ? 1 : 0,
  }).format(amount);
};

export const currencySymbol = (currency = currentCurrency) =>
  new Intl.NumberFormat(localeFor(currency), { style: "currency", currency, maximumFractionDigits: 0 })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value || "$";

export const formatNumber = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);

export const formatPercent = (value, digits = 1) => `${(Number(value) || 0).toFixed(digits).replace(/\.0$/, "")}%`;

const toDate = (value) => (value instanceof Date ? value : new Date(value));

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const formatDate = (value, options = {}) => {
  if (!value) return "—";
  const date = toDate(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear && !options.year ? {} : { year: "numeric" }),
  });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = toDate(value);
  return `${formatDate(date)}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

export const formatTime = (value) => toDate(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const daysUntil = (value) => {
  if (!value) return null;
  return Math.round((startOfDay(toDate(value)) - startOfDay(new Date())) / 86400000);
};

export const formatDueDate = (value) => {
  if (!value) return { label: "No date", tone: "none" };
  const days = daysUntil(value);
  if (days < 0) return { label: days === -1 ? "Yesterday" : `${Math.abs(days)}d overdue`, tone: "overdue" };
  if (days === 0) return { label: "Today", tone: "today" };
  if (days === 1) return { label: "Tomorrow", tone: "soon" };
  if (days < 7) return { label: toDate(value).toLocaleDateString("en-US", { weekday: "long" }), tone: "soon" };
  return { label: formatDate(value), tone: "later" };
};

export const timeAgo = (value) => {
  if (!value) return "";
  const seconds = Math.round((Date.now() - toDate(value).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return formatDate(value);
};

export const toInputDate = (value) => {
  if (!value) return "";
  const d = toDate(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fromInputDate = (value, hour = 17) => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0).toISOString();
};

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const AVATAR_COLORS = ["#4f5ee8", "#0e9f6e", "#c2410c", "#7c3aed", "#0891b2", "#be185d", "#4d7c0f", "#b45309", "#475569"];

export const avatarColor = (seed = "") => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const pluralize = (count, singular, plural = `${singular}s`) => `${formatNumber(count)} ${count === 1 ? singular : plural}`;

export const formatAddress = (address = {}) => [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(", ");
