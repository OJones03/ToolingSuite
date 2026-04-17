import { memo } from 'react'
import './StatCard.css'

const StatCard = memo(function StatCard({ label, value, icon, loading }) {
  if (loading) {
    return (
      <div className="stat-card stat-card--skeleton" aria-hidden="true">
        <div className="skeleton skeleton--icon" />
        <div className="stat-card__body">
          <div className="skeleton skeleton--value" />
          <div className="skeleton skeleton--label" />
        </div>
      </div>
    )
  }

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
})

export default StatCard
