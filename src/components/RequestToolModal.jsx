import { useState } from 'react';

const EMPTY = { title: '', description: '', href: '', category: '' };

export default function RequestToolModal({ token, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const res = await fetch('/auth/tool-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          href: form.href || null,
          category: form.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSuccess('Request submitted — an admin will review it.');
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel user-manager-panel">
        <div className="modal-header">
          <span className="modal-title">Request a Tool</span>
          <div className="modal-header-actions">
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="modal-body">
          <p className="um-hint" style={{ marginBottom: '1rem' }}>
            Suggest a tool to be added to the dashboard. An admin will review and approve it.
          </p>
          <form className="um-form" onSubmit={handleSubmit} autoComplete="off">
            <div className="um-form-row">
              <input
                className="um-input"
                placeholder="Tool name *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
              placeholder="Link URL (optional)"
              value={form.href}
              onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
            />
            <textarea
              className="um-input am-input-full am-textarea"
              placeholder="What does this tool do and why is it useful? *"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
              rows={3}
            />
            {error && <p className="um-error">{error}</p>}
            {success && <p className="um-success">{success}</p>}
            <button type="submit" className="um-create-btn am-create-btn" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
