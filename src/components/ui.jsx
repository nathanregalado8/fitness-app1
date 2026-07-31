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

export function Modal({ title, onClose, children, footer, closeLabel = 'Close' }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
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
