export default function AnnouncementBanner({ announcement, onDismiss }) {
  if (!announcement) return null;

  const date = new Date(announcement.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });

  return (
    <div className="announcement-banner" role="status" aria-live="polite">
      <span className="announcement-banner__icon" aria-hidden="true">📢</span>
      <p className="announcement-banner__message">{announcement.message}</p>
      <span className="announcement-banner__meta">
        {announcement.author} · {date}
      </span>
      <button
        className="announcement-banner__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss announcement"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
