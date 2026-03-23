import './ToolCard.css'

export default function ToolCard({ title, description, icon, href, badge, target }) {
  return (
    <div className="tool-card">
      <div className="tool-card__header">
        <span className="tool-card__icon" aria-hidden="true">{icon}</span>
        <span className="tool-card__badge">{badge}</span>
      </div>
      <h3 className="tool-card__title">{title}</h3>
      <p className="tool-card__description">{description}</p>
      <a className="tool-card__link" href={href} target={target}>
        Open {title} <span aria-hidden="true">→</span>
      </a>
    </div>
  )
}
