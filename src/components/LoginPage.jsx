import { useState } from 'react'
import elementLogo from '../assets/elementlogo.png'
import './LoginPage.css'

// Credentials are checked client-side for this internal tool.
// Replace with a real API call if a backend is introduced.
const VALID_USERNAME = 'admin'
const VALID_PASSWORD = 'element'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      sessionStorage.setItem('ets_auth', '1')
      onLogin()
    } else {
      setError('Invalid username or password.')
      setPassword('')
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-icon">
          <img src={elementLogo} alt="Element logo" />
        </div>
        <h1 className="login-title">Element Tooling Suite</h1>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setError(''); setUsername(e.target.value) }}
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setError(''); setPassword(e.target.value) }}
              required
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" type="submit">Sign In</button>
        </form>
      </div>
    </div>
  )
}
