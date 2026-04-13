import { useEffect, useState, useCallback } from 'react'
import StatCard from './StatCard'
import ToolCard from './ToolCard'
import Toast from './Toast'
import elementLogo from '../assets/elementlogo.png'
import './Dashboard.css'

const STATS_API          = '/api/devices/stats'
const REFRESH_INTERVAL   = 30_000
const HEALTH_INTERVAL    = 60_000

const TOOLS = [
  {
    id: 'device-surveyor',
    title: 'Device Surveyor',
    description:
      'Scan and inventory all devices on the network. View hardware details, OS information, open ports, and track device history over time.',
    icon: '🔍',
    href: `${window.location.protocol}//${window.location.hostname}:3002`,
    target: '_blank',
    badge: 'Surveyor',
    category: 'Discovery',
  },
  {
    id: 'device-monitoring-api',
    title: 'Device Monitoring API',
    description:
      'REST API endpoint exposing live device statistics including current device count and change events tracked by the monitoring service.',
    icon: '🌐',
    href: '/api/devices/stats',
    target: '_blank',
    badge: 'API',
    category: 'Discovery',
  },
  {
    id: 'nmap-monitor',
    title: 'Nmap Monitor',
    description:
      'Run continuous or scheduled Nmap scans across your network. Detect new hosts, monitor port changes, and receive alerts on anomalies.',
    icon: '📡',
    href: `${window.location.protocol}//172.18.240.204:3001`,
    target: '_blank',
    badge: 'Monitor',
    category: 'Monitoring',
  },
  {
    id: 'rundeck',
    title: 'Rundeck',
    description:
      'Automate and schedule operational tasks across your infrastructure. Run jobs, manage workflows, and track execution history.',
    icon: '⚙️',
    href: null,
    target: null,
    badge: 'Automation',
    category: 'Automation',
    placeholder: true,
  },
]

function isCrossOrigin(href) {
  try {
    return new URL(href).origin !== window.location.origin
  } catch {
    return false // relative URL → same origin
  }
}

function timeAgo(date) {
  if (!date) return null
  const secs = Math.floor((Date.now() - date) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ago`
}

export default function Dashboard({ onLogout }) {
  const [stats, setStats]               = useState({ current_devices: null, change_events: null })
  const [initialLoading, setInitial]    = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [toast, setToast]               = useState(null)
  const [lastUpdated, setLastUpdated]   = useState(null)
  const [timeAgoLabel, setTimeAgoLabel] = useState(null)
  const [search, setSearch]             = useState('')
  const [healthMap, setHealthMap]       = useState(() =>
    Object.fromEntries(TOOLS.map((t) => [t.id, 'checking']))
  )

  // ── Stats fetching ──────────────────────────────────────────────────────────
  const fetchStats = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true)
    fetch(STATS_API)
      .then((r) => {
        if (!r.ok) throw new Error('stats-error')
        return r.json()
      })
      .then((data) => {
        setStats({ current_devices: data.current_devices, change_events: data.change_events })
        setLastUpdated(Date.now())
        setInitial(false)
        setRefreshing(false)
      })
      .catch(() => {
        setInitial(false)
        setRefreshing(false)
        setToast({ id: Date.now(), message: '⚠️ Could not load stats', type: 'error' })
      })
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    const id = setInterval(() => fetchStats(false), REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchStats])

  // ── Last-updated ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setTimeAgoLabel(timeAgo(lastUpdated))
    update()
    const id = setInterval(update, 10_000)
    return () => clearInterval(id)
  }, [lastUpdated])

  // ── Tool health checks ──────────────────────────────────────────────────────
  const checkHealth = useCallback(() => {
    TOOLS.forEach((tool) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      fetch(tool.href, {
        method: 'HEAD',
        signal: controller.signal,
        mode: isCrossOrigin(tool.href) ? 'no-cors' : 'same-origin',
        cache: 'no-store',
      })
        .then(() => {
          clearTimeout(timer)
          setHealthMap((prev) => ({ ...prev, [tool.id]: 'online' }))
        })
        .catch((err) => {
          clearTimeout(timer)
          if (err.name !== 'AbortError') {
            setHealthMap((prev) => ({ ...prev, [tool.id]: 'offline' }))
          }
        })
    })
  }, [])

  useEffect(() => {
    checkHealth()
    const id = setInterval(checkHealth, HEALTH_INTERVAL)
    return () => clearInterval(id)
  }, [checkHealth])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const dismissToast = useCallback(() => setToast(null), [])

  const filteredTools = search
    ? TOOLS.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
      )
    : TOOLS

  const categories = [...new Set(filteredTools.map((t) => t.category))]

  const statCards = [
    { label: 'Current Devices', value: stats.current_devices, icon: '🟢' },
    { label: 'Change Events',   value: stats.change_events,   icon: '🔄' },
  ]

  return (
    <div className="dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}

      <header className="dashboard__header">
        <div className="dashboard__header-inner">
          <img src={elementLogo} alt="Element logo" className="dashboard__logo-img" />
          <div>
            <h1 className="dashboard__title">Element Tooling Suite</h1>
            <p className="dashboard__subtitle">Network Monitoring &amp; Device Management</p>
          </div>
        </div>
        <div className="dashboard__header-right">
          {timeAgoLabel && (
            <span className="dashboard__last-updated">Updated {timeAgoLabel}</span>
          )}
          <button
            className={`dashboard__refresh-btn${refreshing ? ' dashboard__refresh-btn--spinning' : ''}`}
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            aria-label="Refresh stats"
            title="Refresh stats"
          >
            ↻
          </button>
          <span className="dashboard__version">v1.0</span>
          {onLogout && (
            <button
              className="logout-btn"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="dashboard__main">
        <section className="dashboard__section" aria-label="Overview statistics">
          <h2 className="dashboard__section-title">Overview</h2>
          <div className="stat-grid">
            {statCards.map((s) => (
              <StatCard key={s.label} {...s} loading={initialLoading} />
            ))}
          </div>
        </section>

        <section className="dashboard__section" aria-label="Available tools">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">Tools</h2>
            <div className="dashboard__search-wrapper">
              <span className="dashboard__search-icon" aria-hidden="true">🔎</span>
              <input
                className="dashboard__search"
                type="search"
                placeholder="Search tools…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search tools"
              />
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <p className="dashboard__no-results">No tools match &ldquo;{search}&rdquo;</p>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="dashboard__category">
                <h3 className="dashboard__category-label">{cat}</h3>
                <div className="tool-grid">
                  {filteredTools
                    .filter((t) => t.category === cat)
                    .map((t) => (
                      <ToolCard key={t.id} {...t} status={healthMap[t.id]} />
                    ))}
                </div>

              </div>
            ))
          )}
        </section>
      </main>

      <footer className="dashboard__footer">
        <p>
          ToolingSuite &copy; {new Date().getFullYear()} &mdash; Internal Network Tools
          {timeAgoLabel && (
            <span className="dashboard__footer-updated"> · Stats {timeAgoLabel}</span>
          )}
        </p>
      </footer>
    </div>
  )
}
