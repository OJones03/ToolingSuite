import './StatCard.css'

export default function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <span className="stat-card__icon" aria-hidden="true">{icon}</span>
      <div className="stat-card__body">
        <span className="stat-card__value">
          {value === null ? '—' : value.toLocaleString()}
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
    </div>
  )
}
