export function BrandMark({ className = "brand__mark" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--primary)" />
      <path d="M16 7a9 9 0 1 0 8.5 12" fill="none" stroke="var(--primary-text)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="12" r="2.6" fill="var(--accent)" />
    </svg>
  );
}

export default function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      CRM360
    </span>
  );
}
