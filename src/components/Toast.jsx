import { useEffect } from 'react'
import './Toast.css'

export default function Toast({ message, type = 'error', onDismiss, duration = 5000 }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [onDismiss, duration])

  return (
    <div className={`toast toast--${type}`} role="alert">
      <span>{message}</span>
      <button className="toast__close" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
