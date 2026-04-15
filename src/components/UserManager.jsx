import { useState, useEffect } from 'react';

export default function UserManager({ token, currentUser, onClose }) {
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [changePw, setChangePw] = useState({}); // { [username]: { value, error, success } }

  const authHeader = { Authorization: `Bearer ${token}` };

  async function fetchUsers() {
    setLoadError('');
    try {
      const res = await fetch('/auth/users', { headers: authHeader });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(await res.json());
    } catch (e) {
      setLoadError(e.message);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setFormSuccess(`User "${data.username}" created.`);
      setForm({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(username) {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/auth/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      fetchUsers();
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }

  async function handleChangePw(username) {
    const pw = changePw[username]?.value ?? '';
    setChangePw((prev) => ({ ...prev, [username]: { ...prev[username], error: '', success: '' } }));
    try {
      const res = await fetch(`/auth/users/${encodeURIComponent(username)}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setChangePw((prev) => ({ ...prev, [username]: { value: '', success: 'Password updated.', error: '' } }));
    } catch (e) {
      setChangePw((prev) => ({ ...prev, [username]: { ...prev[username], error: e.message, success: '' } }));
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel user-manager-panel">
        <div className="modal-header">
          <span className="modal-title">Manage Users</span>
          <div className="modal-header-actions">
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="modal-body">

          {/* ── User list ── */}
          <section className="um-section">
            <h3 className="um-section-title">Existing Users</h3>
            {loadError && <p className="um-error">{loadError}</p>}
            {!loadError && users.length === 0 && <p className="um-hint">No users found.</p>}
            <ul className="um-user-list">
              {users.map((u) => (
                <li key={u.username} className="um-user-row">
                  <div className="um-user-info">
                    <span className="um-username">{u.username}</span>
                    <span className={`um-role-badge um-role-${u.role}`}>{u.role}</span>
                    {u.username === currentUser && <span className="um-you-badge">you</span>}
                  </div>
                  <div className="um-user-actions">
                    <div className="um-pw-row">
                      <input
                        type="password"
                        className="um-pw-input"
                        placeholder="New password"
                        value={changePw[u.username]?.value ?? ''}
                        onChange={(e) =>
                          setChangePw((prev) => ({
                            ...prev,
                            [u.username]: { ...prev[u.username], value: e.target.value, error: '', success: '' },
                          }))
                        }
                        autoComplete="new-password"
                      />
                      <button
                        className="um-pw-btn"
                        onClick={() => handleChangePw(u.username)}
                        disabled={!changePw[u.username]?.value}
                      >
                        Set
                      </button>
                    </div>
                    {changePw[u.username]?.error && (
                      <p className="um-error um-inline-msg">{changePw[u.username].error}</p>
                    )}
                    {changePw[u.username]?.success && (
                      <p className="um-success um-inline-msg">{changePw[u.username].success}</p>
                    )}
                    {u.username !== currentUser && (
                      <button className="um-delete-btn" onClick={() => handleDelete(u.username)}>
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Create user ── */}
          <section className="um-section">
            <h3 className="um-section-title">Add New User</h3>
            <form className="um-form" onSubmit={handleCreate} autoComplete="off">
              <div className="um-form-row">
                <input
                  type="text"
                  className="um-input"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  autoComplete="off"
                  required
                />
                <input
                  type="password"
                  className="um-input"
                  placeholder="Password (min 8 chars)"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                  required
                />
                <select
                  className="um-select"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <button type="submit" className="um-create-btn" disabled={submitting}>
                  {submitting ? 'Adding…' : 'Add User'}
                </button>
              </div>
              {formError && <p className="um-error">{formError}</p>}
              {formSuccess && <p className="um-success">{formSuccess}</p>}
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}
