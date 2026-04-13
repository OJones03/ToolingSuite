import './ToolCard.css'

const STATUS_CONFIG = {
  online:   { label: 'Online',   cls: 'status--online' },
  offline:  { label: 'Offline',  cls: 'status--offline' },
  checking: { label: 'Checking', cls: 'status--checking' },
}

export default function ToolCard({ title, description, icon, href, badge, target, status, placeholder }) {
  const s = STATUS_CONFIG[status]

  return (
    <div className={`tool-card${placeholder ? ' tool-card--placeholder' : ''}`}>
      <div className="tool-card__header">
        <span className="tool-card__icon" aria-hidden="true">{icon}</span>
        <div className="tool-card__badges">
          {s && !placeholder && (
            <span className={`tool-card__status ${s.cls}`} aria-label={`Status: ${s.label}`}>
              <span className="tool-card__status-dot" aria-hidden="true" />
              {s.label}
            </span>
          )}
          <span className="tool-card__badge">{badge}</span>
        </div>
      </div>
      <h3 className="tool-card__title">{title}</h3>
      <p className="tool-card__description">{description}</p>
      {placeholder ? (
        <span className="tool-card__link tool-card__link--disabled" aria-disabled="true">
          Coming Soon
        </span>
      ) : (
        <a
          className="tool-card__link"
          href={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        >
          Open {title} <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  )
}
