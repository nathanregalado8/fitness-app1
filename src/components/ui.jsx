/** Small shared primitives. Every edit in this app goes through these. */

export function Button({ variant = 'default', size, className = '', ...props }) {
  return <button className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} {...props} />;
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <label className="field" htmlFor={htmlFor}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`segmented-item ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipToggle({ label, active, onClick, tone }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`chip ${active ? 'is-active' : ''} ${tone ? `chip-${tone}` : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function Card({ title, action, children, tone }) {
  return (
    <section className={`card ${tone ? `card-${tone}` : ''}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Bottom sheet. Every modal surface in the app is one of these. */
export function Modal({ title, onClose, children, footer, closeLabel = 'Close' }) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          <h2 className="display-sm">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

/**
 * Big −/+ number control for the guided logger. Typing stays possible (the
 * value is a real input) but thumbs never have to hit a tiny field.
 */
export function Stepper({ label, value, step = 1, min = 0, onChange, suffix }) {
  const bump = (delta) => {
    const next = Math.round(((Number(value) || 0) + delta) * 100) / 100;
    onChange(Math.max(min, next));
  };
  return (
    <div className="stepper">
      <span className="stat-label">
        {label}
        {suffix ? ` · ${suffix}` : ''}
      </span>
      <div className="row row-tight row-nowrap">
        <button type="button" className="stepper-btn" onClick={() => bump(-step)} aria-label={`− ${label}`}>
          −
        </button>
        <input
          className="stepper-value"
          type="number"
          inputMode="decimal"
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
        <button type="button" className="stepper-btn" onClick={() => bump(step)} aria-label={`+ ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

/** Numeric input that keeps empty as null instead of coercing to 0. */
export function NumberInput({ value, onChange, ...props }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? null : Number(raw));
      }}
      {...props}
    />
  );
}
