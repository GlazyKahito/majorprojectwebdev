import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export function PageHeader({ title, description, actions, breadcrumbs, children }) {
  return (
    <div>
      {breadcrumbs && (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              {index > 0 && <ChevronRight />}
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span className="truncate" style={{ color: "var(--text-secondary)" }}>{crumb.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <header className="page-header">
        <div className="page-header__main">
          <h1 className="page-header__title">{title}</h1>
          {description && <p className="page-header__description">{description}</p>}
          {children}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </header>
    </div>
  );
}

export function Panel({ title, description, actions, children, footer, bodyClassName = "panel__body", bordered = false, className = "", style }) {
  return (
    <section className={`panel ${className}`} style={style}>
      {(title || actions) && (
        <div className={`panel__header ${bordered ? "panel__header--bordered" : ""}`}>
          <div style={{ minWidth: 0 }}>
            {title && <h2 className="panel__title">{title}</h2>}
            {description && <p className="panel__description">{description}</p>}
          </div>
          {actions && <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      {bodyClassName === null ? children : <div className={bodyClassName}>{children}</div>}
      {footer && <div className="panel__footer">{footer}</div>}
    </section>
  );
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button key={option.value} type="button" className="segmented__item" aria-pressed={value === option.value} onClick={() => onChange(option.value)} title={option.title}>
            {Icon && <Icon />}
            {option.label}
            {option.count !== undefined && <span className="segmented__count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.value} type="button" role="tab" className="tabs__item" aria-selected={value === tab.value} onClick={() => onChange(tab.value)}>
          {tab.label}
          {tab.count !== undefined && <span className="segmented__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
