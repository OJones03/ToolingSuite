import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'
import './App.css'

const TOKEN_KEY = 'ets_jwt'

function App() {
  const [token, setToken] = useState(null)
  const [checking, setChecking] = useState(true)

  // On mount: validate any saved token before rendering anything.
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (!saved) { setChecking(false); return }

    fetch('/auth/verify', { headers: { Authorization: `Bearer ${saved}` } })
      .then((r) => { if (r.ok) setToken(saved); else clearAuth() })
      .catch(() => clearAuth())
      .finally(() => setChecking(false))
  }, [])

  function handleLogin(newToken) {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }

  if (checking) return null

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <Dashboard token={token} onLogout={clearAuth} />
}

export default App
