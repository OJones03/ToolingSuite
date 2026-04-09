import { useState } from 'react'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'
import './App.css'

function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ets_auth') === '1')

  function handleLogout() {
    sessionStorage.removeItem('ets_auth')
    setAuthed(false)
  }

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />
  }

  return <Dashboard onLogout={handleLogout} />
}

export default App
