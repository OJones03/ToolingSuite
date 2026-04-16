import { useState, useEffect } from 'react';

const EMPTY_FORM = { title: '', icon: '🔧', description: '', href: '', badge: '', category: '' };

export default function AppManager({ token, onClose, onToolsChanged }) {
  const [tools, setTools] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  async function fetchTools() {
    setLoadError('');
    try {
      const res = await fetch('/auth/custom-tools', { headers: authHeader });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTools(await res.json());
    } catch (e) {
      setLoadError(e.message);
    }
  }

  useEffect(() => { fetchTools(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(''); setFormSuccess(''); setSubmitting(true);
    try {
      const res = await fetch('/auth/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          title: form.title,
          icon: form.icon || '🔧',
          description: form.description,
          href: form.href || null,
          badge: form.badge,
          category: form.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setFormSuccess(`"${data.title}" added.`);
      setForm(EMPTY_FORM);
      await fetchTools();
      onToolsChanged?.();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(tool) {
    setEditingId(tool.id);
    setEditForm({
      title: tool.title,
      icon: tool.icon,
      description: tool.description,
      href: tool.href || '',
      badge: tool.badge,
      category: tool.category,
    });
    setEditError('');
  }

  async function handleEdit(e) {
    e.preventDefault();
    setEditError(''); setEditSubmitting(true);
    try {
      const res = await fetch(`/auth/custom-tools/${encodeURIComponent(editingId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          title: editForm.title,
          icon: editForm.icon || '🔧',
          description: editForm.description,
          href: editForm.href || null,
          badge: editForm.badge,
          category: editForm.category,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setEditingId(null);
      await fetchTools();
      onToolsChanged?.();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/auth/custom-tools/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchTools();
      onToolsChanged?.();
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel user-manager-panel">
        <div className="modal-header">
          <span className="modal-title">Manage Apps</span>
          <div className="modal-header-actions">
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="modal-body">

          {/* ── Existing custom apps ── */}
          <section className="um-section">
            <h3 className="um-section-title">Custom Apps</h3>
            {loadError && <p className="um-error">{loadError}</p>}
            {!loadError && tools.length === 0 && <p className="um-hint">No custom apps yet. Add one below.</p>}
            <ul className="um-user-list">
              {tools.map((t) => (
                <li key={t.id} className="um-user-row am-tool-row">
                  {editingId === t.id ? (
                    <form className="am-edit-form" onSubmit={handleEdit} autoComplete="off">
                      <div className="am-field-grid">
                        <input
                          className="um-input"
                          placeholder="Name *"
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          required
                        />
                        <input
                          className="um-input am-input-icon"
                          placeholder="Icon"
                          value={editForm.icon}
                          onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                          maxLength={10}
                        />
                        <input
                          className="um-input"
                          placeholder="Badge *"
                          value={editForm.badge}
                          onChange={(e) => setEditForm((f) => ({ ...f, badge: e.target.value }))}
                          required
                        />
                        <input
                          className="um-input"
                          placeholder="Category *"
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                          required
                        />
                      </div>
                      <input
                        className="um-input am-input-full"
                        placeholder="Link URL (leave empty for Coming Soon)"
                        value={editForm.href}
                        onChange={(e) => setEditForm((f) => ({ ...f, href: e.target.value }))}
                      />
                      <textarea
                        className="um-input am-input-full am-textarea"
                        placeholder="Description *"
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        required
                        rows={2}
                      />
                      {editError && <p className="um-error um-inline-msg">{editError}</p>}
                      <div className="am-edit-actions">
                        <button type="submit" className="um-pw-btn" disabled={editSubmitting}>
                          {editSubmitting ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" className="um-delete-btn" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="am-tool-info">
                        <span className="am-tool-icon" aria-hidden="true">{t.icon}</span>
                        <div className="am-tool-meta">
                          <span className="um-username">{t.title}</span>
                          <span className="am-tool-desc">{t.description}</span>
                        </div>
                        <div className="am-tool-badges">
                          <span className="um-role-badge um-role-user">{t.badge}</span>
                          <span className="am-category-badge">{t.category}</span>
                          {t.href
                            ? <span className="am-status-badge am-status-live">🔗 link</span>
                            : <span className="am-status-badge am-status-soon">Coming Soon</span>
                          }
                        </div>
                      </div>
                      <div className="am-tool-actions">
                        <button className="um-pw-btn" onClick={() => startEdit(t)}>Edit</button>
                        <button className="um-delete-btn" onClick={() => handleDelete(t.id, t.title)}>Delete</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Add new app ── */}
          <section className="um-section">
            <h3 className="um-section-title">Add New App</h3>
            <form className="um-form" onSubmit={handleCreate} autoComplete="off">
              <div className="am-field-grid">
                <input
                  className="um-input"
                  placeholder="Name *"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
                <input
                  className="um-input am-input-icon"
                  placeholder="Icon"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  maxLength={10}
                />
                <input
                  className="um-input"
                  placeholder="Badge (e.g. API) *"
                  value={form.badge}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  required
                />
                <input
                  className="um-input"
                  placeholder="Category *"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                />
              </div>
              <input
                className="um-input am-input-full"
                placeholder="Link URL (leave empty for Coming Soon)"
                value={form.href}
                onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
              />
              <textarea
                className="um-input am-input-full am-textarea"
                placeholder="Description *"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                rows={2}
              />
              {formError && <p className="um-error">{formError}</p>}
              {formSuccess && <p className="um-success">{formSuccess}</p>}
              <button type="submit" className="um-create-btn am-create-btn" disabled={submitting}>
                {submitting ? 'Adding…' : '+ Add App'}
              </button>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}
