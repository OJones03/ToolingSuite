import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import './App.css'

const TOKEN_KEY = 'app_jwt'

export default function App() {
  const [token, setToken]     = useState('')
  const [authReady, setReady] = useState(false)
  const [username, setUser]   = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // On mount: restore and validate any saved token
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) {
      fetch('/auth/protected', { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => {
          if (r.ok) setToken(saved)
          else localStorage.removeItem(TOKEN_KEY)
        })
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser('')
    setPass('')
    setError('')
  }

  if (!authReady) return null

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-dialog">
          <h1 className="login-title">Element Tooling Suite</h1>
          <p className="login-subtitle">Sign in to continue</p>
          <form onSubmit={handleLogin} className="login-form">
            <label className="login-label">
              Username
              <input
                className="login-input"
                value={username}
                onChange={e => setUser(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="login-label">
              Password
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={e => setPass(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
            {error && <p className="login-error">{error}</p>}
          </form>
        </div>
      </div>
    )
  }

  return <Dashboard onLogout={handleLogout} />
}
