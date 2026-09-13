import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Field({ label, htmlFor, optional, hint, error, children, className = "", aside }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          <span>
            {label} {optional && <span className="field__optional">Optional</span>}
          </span>
          {aside}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, optional, hint, error, className = "", fieldClassName = "", icon: Icon, aside, size, ...props }, ref) {
  const generated = useId();
  const id = props.id || generated;
  const input = (
    <input
      ref={ref}
      id={id}
      className={`input ${size ? `input--${size}` : ""} ${error ? "input--invalid" : ""} ${className}`}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
  );

  return (
    <Field label={label} htmlFor={id} optional={optional} hint={hint} error={error} className={fieldClassName} aside={aside}>
      {Icon ? (
        <div className="input-group">
          <Icon className="input-group__icon" />
          {input}
        </div>
      ) : (
        input
      )}
    </Field>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ label, hint, error, fieldClassName = "", aside, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const generated = useId();
  const id = props.id || generated;

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={fieldClassName} aside={aside}>
      <div className="input-group input-group--trailing">
        <input ref={ref} id={id} type={visible ? "text" : "password"} className={`input ${error ? "input--invalid" : ""}`} aria-invalid={error ? "true" : undefined} {...props} />
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--icon input-group__action"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, optional, hint, error, options = [], placeholder, className = "", fieldClassName = "", size, children, ...props }, ref) {
  const generated = useId();
  const id = props.id || generated;
  const select = (
    <select ref={ref} id={id} className={`select ${size ? `select--${size}` : ""} ${error ? "input--invalid" : ""} ${className}`} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) =>
        typeof option === "string" ? (
          <option key={option} value={option}>
            {option}
          </option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )
      )}
      {children}
    </select>
  );

  if (!label) return select;

  return (
    <Field label={label} htmlFor={id} optional={optional} hint={hint} error={error} className={fieldClassName}>
      {select}
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, optional, hint, error, className = "", fieldClassName = "", ...props }, ref) {
  const generated = useId();
  const id = props.id || generated;
  return (
    <Field label={label} htmlFor={id} optional={optional} hint={hint} error={error} className={fieldClassName}>
      <textarea ref={ref} id={id} className={`textarea ${error ? "input--invalid" : ""} ${className}`} {...props} />
    </Field>
  );
});

export function Switch({ checked, onChange, disabled, label, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      {...props}
    />
  );
}

export function FormError({ error }) {
  if (!error) return null;
  return (
    <div className="form-error" role="alert">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      <span>{error}</span>
    </div>
  );
}
