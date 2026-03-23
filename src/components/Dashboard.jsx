import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import ToolCard from './ToolCard'
import elementLogo from '../assets/elementlogo.png'
import './Dashboard.css'

const STATS_API = '/api/devices/stats'

const TOOLS = [
  {
    id: 'device-surveyor',
    title: 'Device Surveyor',
    description:
      'Scan and inventory all devices on the network. View hardware details, OS information, open ports, and track device history over time.',
    icon: '🔍',
    href: '/device-surveyor',
    badge: 'Surveyor',
  },
  {
    id: 'nmap-monitor',
    title: 'Nmap Monitor',
    description:
      'Run continuous or scheduled Nmap scans across your network. Detect new hosts, monitor port changes, and receive alerts on anomalies.',
    icon: '📡',
    href: '/nmap-monitor',
    badge: 'Monitor',
  },
]

export default function Dashboard({ onLogout }) {
  const [stats, setStats] = useState({ current_devices: null, change_events: null })
  const [statsError, setStatsError] = useState(false)

  useEffect(() => {
    fetch(STATS_API)
      .then((r) => {
        if (!r.ok) throw new Error('Non-2xx response')
        return r.json()
      })
      .then((data) => setStats({ current_devices: data.current_devices, change_events: data.change_events }))
      .catch(() => setStatsError(true))
  }, [])

  const statCards = [
    { label: 'Current Devices', value: stats.current_devices, icon: '🟢' },
    { label: 'Change Events', value: stats.change_events, icon: '🔄' },
  ]

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-inner">
          <img src={elementLogo} alt="Element logo" className="dashboard__logo-img" />
          <div>
            <h1 className="dashboard__title">Element Tooling Suite</h1>
            <p className="dashboard__subtitle">Network Monitoring &amp; Device Management</p>
          </div>
        </div>
        <div className="dashboard__header-right">
          <span className="dashboard__version">v1.0</span>
          <button className="logout-btn" onClick={onLogout} title="Sign out">Sign Out</button>
        </div>
      </header>

      <main className="dashboard__main">
        {/* Stats Row */}
        <section className="dashboard__section" aria-label="Overview statistics">
          <h2 className="dashboard__section-title">Overview</h2>
          <div className="stat-grid">
            {statsError
              ? <p className="stat-error">⚠️ Could not load stats</p>
              : statCards.map((s) => <StatCard key={s.label} {...s} />)
            }
          </div>
        </section>

        {/* Tools Row */}
        <section className="dashboard__section" aria-label="Available tools">
          <h2 className="dashboard__section-title">Tools</h2>
          <div className="tool-grid">
            {TOOLS.map((t) => (
              <ToolCard key={t.id} {...t} />
            ))}
          </div>
        </section>
      </main>

      <footer className="dashboard__footer">
        <p>ToolingSuite &copy; {new Date().getFullYear()} &mdash; Internal Network Tools</p>
      </footer>
    </div>
  )
}
