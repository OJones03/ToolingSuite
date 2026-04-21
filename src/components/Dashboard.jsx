import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import StatCard from './StatCard'
import ToolCard from './ToolCard'
import Toast from './Toast'
import AnnouncementBanner from './AnnouncementBanner'
import elementLogo from '../assets/elementlogo.png'
import './Dashboard.css'

const STATS_API          = '/api/devices/stats'
const REFRESH_INTERVAL   = 30_000
const HEALTH_INTERVAL    = 60_000

const mkKey = (name, user) => `${name}:${user || '_'}`

function getInitialOrder(key) {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

function getInitialFavourites(key) {
  try {
    const saved = localStorage.getItem(key)
    // Trust all saved IDs; allTools.find + filter(Boolean) drops stale ones
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

function getInitialCollapsed(key) {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return new Set(JSON.parse(saved))
  } catch {}
  return new Set()
}

function getInitialTheme(key) {
  try {
    const saved = localStorage.getItem(key)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'dark'
}

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

export default function Dashboard({ token, onLogout, isAdmin, onManageUsers, onManageApps, onRequestTool, currentUser, toolsVersion }) {
  // Per-user localStorage keys — stable for the lifetime of the session
  const orderKey   = mkKey('dashboard-tool-order', currentUser)
  const favsKey    = mkKey('dashboard-favourites',  currentUser)
  const colKey     = mkKey('dashboard-collapsed',   currentUser)
  const themeKey   = mkKey('dashboard-theme',       currentUser)

  const [hiddenTools, setHiddenTools]   = useState([])
  const [defaultTools, setDefaultTools] = useState([])
  const [customTools, setCustomTools]   = useState([])
  const allToolsRef                     = useRef([])
  const [stats, setStats]               = useState({ current_devices: null, change_events: null })
  const [initialLoading, setInitial]    = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [toast, setToast]               = useState(null)
  const [lastUpdated, setLastUpdated]   = useState(null)
  const [timeAgoLabel, setTimeAgoLabel] = useState(null)
  const [search, setSearch]             = useState('')
  const [healthMap, setHealthMap]       = useState({})
  const [uptimeHistory, setUptimeHistory] = useState({})
  const [announcement, setAnnouncement]   = useState(null)
  const [dismissedAt, setDismissedAt]     = useState(() => localStorage.getItem('dismissed-announcement'))
  const [settingsOpen, setSettingsOpen]           = useState(false)
  const [toolOrder, setToolOrder]                 = useState(() => getInitialOrder(orderKey))
  const [favourites, setFavourites]               = useState(() => getInitialFavourites(favsKey))
  const [collapsedSections, setCollapsed]         = useState(() => getInitialCollapsed(colKey))
  const [theme, setTheme]                         = useState(() => getInitialTheme(themeKey))
  const [editMode, setEditMode]                   = useState(false)
  const [activeDragSection, setActiveDragSection] = useState(null)
  const [dragOverSection, setDragOverSection]     = useState(null)
  const [dragOverIndex, setDragOverIndex]         = useState(null)
  const settingsRef    = useRef(null)
  const dragSrcSection = useRef(null)
  const dragSrcIndex   = useRef(null)
  const dragSrcId      = useRef(null)
  const dragDstSection = useRef(null)
  const dragDstIndex   = useRef(null)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(themeKey, theme)
  }, [theme, themeKey])

  const keysRef = useRef({ orderKey, favsKey, colKey })

  // ── Fetch hidden tools for this user ───────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !token) return
    fetch(`/auth/users/${encodeURIComponent(currentUser)}/tools`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setHiddenTools(data.hiddenTools ?? []) })
      .catch(() => {})
  }, [currentUser, token])

  // ── Fetch default tools (server-managed, from server) ───────────────────
  const fetchDefaultTools = useCallback(() => {
    if (!token) return
    fetch('/auth/default-tools', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDefaultTools(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [token])

  useEffect(() => { fetchDefaultTools() }, [fetchDefaultTools, toolsVersion])

  // ── Fetch custom tools (global, from server) ─────────────────────────────
  const fetchCustomTools = useCallback(() => {
    if (!token) return
    fetch('/auth/custom-tools', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCustomTools(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [token])

  useEffect(() => { fetchCustomTools() }, [fetchCustomTools, toolsVersion])

  // ── Fetch announcement ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch('/auth/announcement', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setAnnouncement(data) })
      .catch(() => {})
  }, [token])

  // ── Sync toolOrder / healthMap when any tools change ───────────────────────
  useEffect(() => {
    const combined = [...defaultTools, ...customTools]
    allToolsRef.current = combined
    const allIds = combined.map((t) => t.id)
    setToolOrder((prev) => {
      const missing = allIds.filter((id) => !prev.includes(id))
      if (!missing.length) return prev
      const updated = [...prev, ...missing]
      localStorage.setItem(keysRef.current.orderKey, JSON.stringify(updated))
      return updated
    })
    setHealthMap((prev) => {
      const additions = Object.fromEntries(
        combined.filter((t) => !(t.id in prev)).map((t) => [t.id, 'checking'])
      )
      return Object.keys(additions).length ? { ...prev, ...additions } : prev
    })
  }, [defaultTools, customTools])

  // Close settings dropdown when clicking outside
  useEffect(() => {
    if (!settingsOpen) return
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [settingsOpen])

  // ── Stats fetching ──────────────────────────────────────────────────────────
  const fetchStats = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true)
    fetch(STATS_API, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        if (r.status === 401 || r.status === 403) { onLogout(); return null }
        if (!r.ok) throw new Error('stats-error')
        return r.json()
      })
      .then((data) => {
        if (!data) return
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
  }, [token, onLogout])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    const id = setInterval(() => fetchStats(false), REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchStats])

  // ── Last-updated ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setTimeAgoLabel(timeAgo(lastUpdated))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [lastUpdated])

  // ── Tool health checks ──────────────────────────────────────────────────────
  const checkHealth = useCallback(() => {
    allToolsRef.current.filter((tool) => !tool.placeholder && tool.href && !hiddenTools.includes(tool.id)).forEach((tool, index) => {
      setTimeout(() => {
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
          setUptimeHistory((prev) => ({ ...prev, [tool.id]: [...(prev[tool.id] ?? []).slice(-47), true] }))
        })
        .catch((err) => {
          clearTimeout(timer)
          if (err.name !== 'AbortError') {
            setHealthMap((prev) => ({ ...prev, [tool.id]: 'offline' }))
            setUptimeHistory((prev) => ({ ...prev, [tool.id]: [...(prev[tool.id] ?? []).slice(-47), false] }))
          }
        })
      }, index * 300) // stagger each check 300ms apart to avoid network bursts
    })
  }, [hiddenTools])

  useEffect(() => {
    checkHealth()
    const id = setInterval(checkHealth, HEALTH_INTERVAL)
    return () => clearInterval(id)
  }, [checkHealth])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const dismissToast = useCallback(() => setToast(null), [])

  const handleDismissAnnouncement = useCallback(() => {
    if (!announcement) return
    localStorage.setItem('dismissed-announcement', announcement.createdAt)
    setDismissedAt(announcement.createdAt)
  }, [announcement])

  const showAnnouncement = announcement && dismissedAt !== announcement.createdAt

  const handleDragStart = useCallback((section, index, id) => {
    dragSrcSection.current = section
    dragSrcIndex.current   = index
    dragSrcId.current      = id
    setActiveDragSection(section)
  }, [])

  const handleDragEnter = useCallback((section, index) => {
    dragDstSection.current = section
    dragDstIndex.current   = index
    setDragOverSection(section)
    setDragOverIndex(typeof index === 'number' ? index : null)
  }, [])

  const handleDragEnd = useCallback(() => {
    const srcSection = dragSrcSection.current
    const srcIndex   = dragSrcIndex.current
    const srcId      = dragSrcId.current
    const dstSection = dragDstSection.current
    const dstIndex   = dragDstIndex.current

    if (srcSection && dstSection) {
      if (srcSection === 'favourites' && dstSection === 'favourites') {
        if (srcIndex !== dstIndex) {
          setFavourites((prev) => {
            const updated = [...prev]
            const [removed] = updated.splice(srcIndex, 1)
            updated.splice(dstIndex, 0, removed)
            localStorage.setItem(keysRef.current.favsKey, JSON.stringify(updated))
            return updated
          })
        }
      } else if (srcSection !== 'favourites' && dstSection === 'favourites') {
        setFavourites((prev) => {
          if (prev.includes(srcId)) return prev
          const updated  = [...prev]
          const insertAt = typeof dstIndex === 'number' ? dstIndex : updated.length
          updated.splice(insertAt, 0, srcId)
          localStorage.setItem(keysRef.current.favsKey, JSON.stringify(updated))
          return updated
        })
      } else if (srcSection === dstSection && srcSection !== 'favourites') {
        if (srcIndex !== dstIndex && srcId) {
          setToolOrder((prev) => {
            const sectionIds = prev.filter((id) => {
              const t = allToolsRef.current.find((tt) => tt.id === id)
              return t && t.category === srcSection
            })
            const toId = sectionIds[dstIndex]
            if (!toId || toId === srcId) return prev
            const updated   = [...prev]
            const fromIdx   = updated.indexOf(srcId)
            if (fromIdx === -1) return prev
            const [removed] = updated.splice(fromIdx, 1)
            const toIdx     = updated.indexOf(toId)
            updated.splice(toIdx >= 0 ? toIdx : updated.length, 0, removed)
            localStorage.setItem(keysRef.current.orderKey, JSON.stringify(updated))
            return updated
          })
        }
      } else if (srcSection === 'favourites' && dstSection !== 'favourites') {
        setFavourites((prev) => {
          const updated = prev.filter((id) => id !== srcId)
          localStorage.setItem(keysRef.current.favsKey, JSON.stringify(updated))
          return updated
        })
      }
    }

    dragSrcSection.current = null
    dragSrcIndex.current   = null
    dragSrcId.current      = null
    dragDstSection.current = null
    dragDstIndex.current   = null
    setActiveDragSection(null)
    setDragOverSection(null)
    setDragOverIndex(null)
  }, [])

  const toggleSection = useCallback((name) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      localStorage.setItem(keysRef.current.colKey, JSON.stringify([...next]))
      return next
    })
  }, [])

  const handleResetLayout = useCallback(() => {
    setToolOrder(allToolsRef.current.map((t) => t.id))
    setFavourites([])
    setCollapsed(new Set())
    localStorage.removeItem(keysRef.current.orderKey)
    localStorage.removeItem(keysRef.current.favsKey)
    localStorage.removeItem(keysRef.current.colKey)
    setSettingsOpen(false)
  }, [])

  const allTools = useMemo(() => [...defaultTools, ...customTools], [defaultTools, customTools])

  const orderedTools = useMemo(
    () => toolOrder.map((id) => allTools.find((t) => t.id === id)).filter(Boolean).filter((t) => !hiddenTools.includes(t.id)),
    [toolOrder, allTools, hiddenTools]
  )

  const favTools = useMemo(
    () => favourites.map((id) => allTools.find((t) => t.id === id)).filter(Boolean).filter((t) => !hiddenTools.includes(t.id)),
    [favourites, allTools, hiddenTools]
  )

  const nonFavTools = useMemo(
    () => orderedTools.filter((t) => !favourites.includes(t.id)),
    [orderedTools, favourites]
  )

  const filteredFav = useMemo(() => {
    if (!search) return favTools
    const q = search.toLowerCase()
    return favTools.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }, [search, favTools])

  const filteredNonFav = useMemo(() => {
    if (!search) return nonFavTools
    const q = search.toLowerCase()
    return nonFavTools.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }, [search, nonFavTools])

  const allCategories = useMemo(
    () => [...new Set(nonFavTools.map((t) => t.category))],
    [nonFavTools]
  )

  const filteredCategories = useMemo(
    () => search ? [...new Set(filteredNonFav.map((t) => t.category))] : allCategories,
    [search, filteredNonFav, allCategories]
  )

  const isCrossSection           = !!(activeDragSection && activeDragSection !== 'favourites')
  const isDraggingFromFavourites = activeDragSection === 'favourites'

  const statCards = useMemo(() => [
    { label: 'Current Devices', value: stats.current_devices, icon: '🟢' },
    { label: 'Change Events',   value: stats.change_events,   icon: '🔄' },
  ], [stats.current_devices, stats.change_events])

  return (
    <div className="dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}

      {/* ── Edge remove zones (visible only while dragging from Favourites) ── */}
      {isDraggingFromFavourites && (
        <>
          <div
            className={`dashboard__edge-zone dashboard__edge-zone--left${dragOverSection === '__remove__' ? ' dashboard__edge-zone--active' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => handleDragEnter('__remove__', null)}
            onDrop={handleDragEnd}
          >
            <span className="dashboard__edge-zone-label">✕ Remove</span>
          </div>
          <div
            className={`dashboard__edge-zone dashboard__edge-zone--right${dragOverSection === '__remove__' ? ' dashboard__edge-zone--active' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => handleDragEnter('__remove__', null)}
            onDrop={handleDragEnd}
          >
            <span className="dashboard__edge-zone-label">✕ Remove</span>
          </div>
        </>
      )}

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
          <div className="settings-menu" ref={settingsRef}>
            <button
              className="settings-btn"
              onClick={() => setSettingsOpen((o) => !o)}
              title="Settings"
              aria-label="Settings"
              aria-expanded={settingsOpen}
            >
              ⚙
            </button>
            {settingsOpen && (
              <div className="settings-dropdown">
                {isAdmin && (
                  <>
                    <button
                      className="settings-manage-users-btn"
                      onClick={() => { setSettingsOpen(false); onManageUsers(); }}
                    >
                      👤 Manage Users
                    </button>
                    <button
                      className="settings-manage-users-btn"
                      onClick={() => { setSettingsOpen(false); onManageApps?.(); }}
                    >
                      🔧 Manage Apps
                    </button>
                    <div className="settings-divider" />
                  </>
                )}
                <button
                  className="settings-reset-btn"
                  onClick={handleResetLayout}
                >
                  ↺ Reset Layout
                </button>
                <div className="settings-divider" />
                <button
                  className="settings-theme-btn"
                  onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode'}
                </button>
                <div className="settings-divider" />
                <button
                  className="settings-logout-btn"
                  onClick={() => { setSettingsOpen(false); onLogout(); }}
                >
                  ↪ Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showAnnouncement && (
        <AnnouncementBanner
          announcement={announcement}
          onDismiss={handleDismissAnnouncement}
        />
      )}

      <main className="dashboard__main">

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        <section className="dashboard__section" aria-label="Overview statistics">
          <button
            className="dashboard__subsection-toggle"
            onClick={() => toggleSection('__overview__')}
            aria-expanded={!collapsedSections.has('__overview__')}
          >
            <span className={`dashboard__chevron${collapsedSections.has('__overview__') ? '' : ' dashboard__chevron--open'}`} aria-hidden="true">▶</span>
            <span className="dashboard__subsection-label">Overview</span>
          </button>
          {!collapsedSections.has('__overview__') && (
            <div className="stat-grid">
              {statCards.map((s) => (
                <StatCard key={s.label} {...s} loading={initialLoading} />
              ))}
            </div>
          )}
        </section>

        {/* ── Favourites ───────────────────────────────────────────────────── */}
        {(favTools.length > 0 || editMode) && (
          <section
            className={`dashboard__section${isCrossSection && dragOverSection === 'favourites' ? ' dashboard__section--drop-active' : ''}`}
            aria-label="Favourite tools"
            onDragOver={editMode ? (e) => e.preventDefault() : undefined}
            onDragEnter={editMode ? () => handleDragEnter('favourites', favTools.length) : undefined}
          >
            <button
              className="dashboard__subsection-toggle"
              onClick={() => toggleSection('__favourites__')}
              aria-expanded={!collapsedSections.has('__favourites__')}
            >
              <span className={`dashboard__chevron${collapsedSections.has('__favourites__') ? '' : ' dashboard__chevron--open'}`} aria-hidden="true">▶</span>
              <span className="dashboard__subsection-label">★ Favourites</span>
              {favTools.length > 0 && (
                <span className="dashboard__subsection-count">{favTools.length}</span>
              )}
            </button>
            {!collapsedSections.has('__favourites__') && (
              <>
                {editMode && favTools.length === 0 && (
                  <p className="dashboard__fav-drop-hint">Drag tiles here to add them to Favourites</p>
                )}
                {favTools.length > 0 && (
                  <div className="tool-grid">
                    {favTools.map((t, index) => (
                      <div
                        key={t.id}
                        className={`tool-card-drag-wrapper${dragOverSection === 'favourites' && dragOverIndex === index ? ' tool-card-drag-wrapper--over' : ''}`}
                        draggable={editMode}
                        onDragStart={editMode ? () => handleDragStart('favourites', index, t.id) : undefined}
                        onDragEnter={editMode ? (e) => { e.stopPropagation(); handleDragEnter('favourites', index) } : undefined}
                        onDragOver={editMode ? (e) => e.preventDefault() : undefined}
                        onDragEnd={editMode ? handleDragEnd : undefined}
                      >
                <ToolCard
                          {...t}
                          status={healthMap[t.id]}
                          uptimeHistory={uptimeHistory[t.id]}
                          editMode={editMode}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Tools ────────────────────────────────────────────────────────── */}
        <section className="dashboard__section" aria-label="Available tools">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">Tools</h2>
            <div className="dashboard__section-actions">
              {!search && (
                <>
                  <button
                    className={`dashboard__edit-btn${editMode ? ' dashboard__edit-btn--active' : ''}`}
                    onClick={() => setEditMode((e) => !e)}
                    title={editMode ? 'Done editing layout' : 'Edit layout'}
                  >
                    {editMode ? '✓ Done' : '✏ Edit Layout'}
                  </button>
                  <button
                    className="dashboard__request-btn"
                    onClick={onRequestTool}
                    title="Request a new tool to be added"
                  >
                    + Request Tool
                  </button>
                </>
              )}
              <div className="dashboard__search-wrapper">
                <span className="dashboard__search-icon" aria-hidden="true">🔎</span>
                <input
                  className="dashboard__search"
                  type="search"
                  placeholder="Search tools…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); if (editMode) setEditMode(false) }}
                  aria-label="Search tools"
                />
              </div>
            </div>
          </div>
          {editMode && (
            <p className="dashboard__edit-hint">Drag tiles to reorder. Drag into <strong>★ Favourites</strong> to pin. Drag a favourite to a category or <strong>either side of the screen</strong> to remove it.</p>
          )}

          {filteredCategories.length === 0 && filteredFav.length === 0 && search ? (
            <p className="dashboard__no-results">No tools match &ldquo;{search}&rdquo;</p>
          ) : (
            filteredCategories.map((cat) => {
              const catTools   = filteredNonFav.filter((t) => t.category === cat)
              const isCollapsed = collapsedSections.has(cat)
              return (
                <div
                  key={cat}
                  className={`dashboard__category${editMode && isDraggingFromFavourites && dragOverSection === cat ? ' dashboard__category--drop-active' : ''}`}
                  onDragOver={editMode && isDraggingFromFavourites ? (e) => e.preventDefault() : undefined}
                  onDragEnter={editMode && isDraggingFromFavourites ? () => handleDragEnter(cat, null) : undefined}
                >
                  <button
                    className="dashboard__subsection-toggle"
                    onClick={() => toggleSection(cat)}
                    aria-expanded={!isCollapsed}
                  >
                    <span className={`dashboard__chevron${isCollapsed ? '' : ' dashboard__chevron--open'}`} aria-hidden="true">▶</span>
                    <span className="dashboard__subsection-label">{cat}</span>
                    <span className="dashboard__subsection-count">{catTools.length}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="tool-grid">
                      {catTools.map((t, index) => (
                        <div
                          key={t.id}
                          className={`tool-card-drag-wrapper${dragOverSection === cat && dragOverIndex === index ? ' tool-card-drag-wrapper--over' : ''}`}
                          draggable={editMode}
                          onDragStart={editMode ? () => handleDragStart(cat, index, t.id) : undefined}
                          onDragEnter={editMode ? (e) => { e.stopPropagation(); handleDragEnter(cat, activeDragSection === 'favourites' ? null : index) } : undefined}
                          onDragOver={editMode ? (e) => e.preventDefault() : undefined}
                          onDragEnd={editMode ? handleDragEnd : undefined}
                        >
                          <ToolCard
                            {...t}
                            status={healthMap[t.id]}
                            uptimeHistory={uptimeHistory[t.id]}
                            editMode={editMode}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
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
