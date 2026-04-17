import { memo } from 'react'
import './ToolCard.css'

const STATUS_CONFIG = {
  online:   { label: 'Online',   cls: 'status--online' },
  offline:  { label: 'Offline',  cls: 'status--offline' },
  checking: { label: 'Checking', cls: 'status--checking' },
}

function UptimeSparkline({ history }) {
  if (!history || history.length < 2) return null
  const BAR_W = 3, GAP = 1, H = 12
  const pct = Math.round((history.filter(Boolean).length / history.length) * 100)
  const pctColor = pct >= 90 ? 'var(--status-active)' : pct >= 70 ? 'var(--status-warning)' : 'var(--status-error)'
  return (
    <div className="tool-card__uptime">
      <svg
        width={history.length * (BAR_W + GAP) - GAP}
        height={H}
        aria-label={`Uptime history: ${pct}%`}
      >
        {history.map((up, i) => (
          <rect
            key={i}
            x={i * (BAR_W + GAP)}
            y={0}
            width={BAR_W}
            height={H}
            rx={1}
            fill={up ? 'var(--status-active)' : 'var(--status-error)'}
            opacity={0.75}
          />
        ))}
      </svg>
      <span className="tool-card__uptime-pct" style={{ color: pctColor }}>{pct}%</span>
    </div>
  )
}

const ToolCard = memo(function ToolCard({ title, description, icon, href, badge, target, status, uptimeHistory, placeholder, editMode }) {
  const s = STATUS_CONFIG[status]

  return (
    <div className={`tool-card${placeholder ? ' tool-card--placeholder' : ''}${editMode ? ' tool-card--edit' : ''}`}>
      <div className="tool-card__header">
        <span className="tool-card__icon" aria-hidden="true">{icon}</span>
        <div className="tool-card__badges">
          {editMode && (
            <span className="tool-card__drag-handle" aria-hidden="true" title="Drag to reorder">⠇</span>
          )}
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
      {!placeholder && <UptimeSparkline history={uptimeHistory} />}
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
})

export default ToolCard
