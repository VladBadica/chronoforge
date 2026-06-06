import { useState, useRef } from 'react';

function formatInGameTime(totalRevolutions) {
  const totalMinutes = Math.floor(totalRevolutions);
  const days    = Math.floor(totalMinutes / 1440);
  const hours   = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0)    parts.push(`${days}d`);
  if (hours > 0)   parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

const TAB_STYLE = (active) => ({
  padding: '6px 16px',
  borderRadius: '6px 6px 0 0',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  border: 'none',
  background: active ? 'var(--color-surface)' : 'transparent',
  color: active ? 'var(--color-text)' : 'var(--color-muted)',
  borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
});

export function SettingsModal({ totalRevolutions, speedMultiplier, totalClicks, timesPrestiged, totalPPEarned, maxSpeedReached, timesAscended, singularities, onSave, onClose, onDebugUnlock }) {
  const [tab, setTab] = useState('stats');
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);
  const singularityClicks = useRef(0);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.quit;

  function handleSave() {
    onSave();
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full flex flex-col rounded-2xl"
        style={{
          maxWidth: 420,
          height: '80vh',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '1rem 1.25rem 0', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex gap-1">
            <button style={TAB_STYLE(tab === 'stats')} onClick={() => setTab('stats')}>Stats</button>
            <button style={TAB_STYLE(tab === 'options')} onClick={() => setTab('options')}>Options</button>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: 18, lineHeight: 1 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; }}
          >
            ✕
          </button>
        </div>

        {/* Tab content */}
        <div style={{ padding: '1.5rem 1.25rem' }}>

          {tab === 'stats' && (
            <div className="flex flex-col gap-5">
              <Row label="In-Game Time"           value={formatInGameTime(totalRevolutions)} />
              <Row label="Current Speed"           value={`${(speedMultiplier * 100).toFixed(0)}%`} sub={`${speedMultiplier.toFixed(2)}×`} />
              <Row label="Max Speed Reached"       value={`${(maxSpeedReached * 100).toFixed(0)}%`} sub={`${maxSpeedReached.toFixed(2)}×`} />
              <Row label="Clicks Made"             value={totalClicks.toLocaleString()} />
              <Row label="Times Prestiged"         value={timesPrestiged.toLocaleString()} />
              <Row label="Total PP Accumulated"    value={totalPPEarned.toLocaleString()} />
              <Row label="Times Ascended"          value={timesAscended.toLocaleString()} />
              <Row
                label="Singularities"
                value={singularities.toLocaleString()}
                onClick={() => {
                  singularityClicks.current += 1;
                  if (singularityClicks.current >= 5) onDebugUnlock?.();
                }}
              />
            </div>
          )}

          {tab === 'options' && (
            <div className="flex flex-col gap-3">
              <ActionButton
                label="Save Game"
                description={saved ? '✓ Saved successfully' : 'Write current progress to storage'}
                color={saved ? '#5ecfb0' : '#5ecfb0'}
                dimmed={saved}
                onClick={handleSave}
              />
              {isElectron && (
                <ActionButton
                  label="Exit Game"
                  description="Close the application"
                  color="#e74c3c"
                  onClick={() => window.electronAPI.quit()}
                />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Row({ label, value, sub, onClick }) {
  return (
    <div
      className="flex items-center justify-between"
      onClick={onClick}
      style={{ cursor: onClick ? 'default' : undefined }}
    >
      <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>{label}</span>
      <div className="flex flex-col items-end">
        <span className="text-sm font-semibold stat-value" style={{ color: 'var(--color-text)' }}>{value}</span>
        {sub && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{sub}</span>}
      </div>
    </div>
  );
}

function ActionButton({ label, description, color, onClick, dimmed = false }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-xl transition-all duration-150"
      style={{
        padding: '0.75rem 1rem',
        background: dimmed ? `${color}0d` : 'transparent',
        border: `1px solid ${dimmed ? color : 'var(--color-border)'}`,
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}0d`; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = dimmed ? color : 'var(--color-border)';
        e.currentTarget.style.background = dimmed ? `${color}0d` : 'transparent';
      }}
    >
      <div>
        <div className="text-sm font-semibold" style={{ color }}>{label}</div>
        <div className="text-xs" style={{ color: dimmed ? color : 'var(--color-muted)', transition: 'color 0.2s' }}>{description}</div>
      </div>
      <span style={{ color, fontSize: 16 }}>{dimmed ? '✓' : '›'}</span>
    </button>
  );
}
