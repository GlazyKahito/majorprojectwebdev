import { forwardRef } from "react";
import { Link } from "react-router-dom";

const Button = forwardRef(function Button(
  { variant = "secondary", size, block, icon: Icon, iconRight: IconRight, loading, disabled, children, className = "", to, type = "button", ...props },
  ref
) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size && `btn--${size}`,
    block && "btn--block",
    !children && Icon && "btn--icon",
    loading && "btn--loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="btn__label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {Icon && <Icon aria-hidden="true" />}
        {children}
        {IconRight && <IconRight aria-hidden="true" />}
      </span>
      {loading && (
        <span className="btn__spinner">
          <span className="spinner" />
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});

export default Button;
