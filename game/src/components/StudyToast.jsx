import { useResearchStore } from '../store/useResearchStore';

export function StudyToast() {
  const { toast, clearToast } = useResearchStore();
  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 200,
        background: '#0d0d18',
        border: '1px solid #5ecfb0',
        borderRadius: 12,
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 0 30px rgba(94,207,176,0.15)',
        minWidth: 220,
      }}
    >
      <span style={{ color: '#5ecfb0', fontSize: 20, lineHeight: 1 }}>⧗</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
          Study Complete
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
          {toast}
        </div>
      </div>
      <button
        onClick={clearToast}
        style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; }}
      >
        ✕
      </button>
    </div>
  );
}
