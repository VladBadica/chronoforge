// Lookup table of one-time "mechanic unlocked" notices, keyed by the same
// id the engine pushes onto `_pendingUnlockAlerts` (see GameEngine._checkMechanicUnlocks).
// Add an entry here whenever a new mechanic gets gated behind a progression milestone.
const UNLOCK_INFO = {
  fastTime: {
    title: 'Fast Time',
    accent: '#ffc850',
    body: [
      "From now on, whenever the second and minute hands meet on the main clock, time lurches: the clock leaps to 2× speed for a few seconds — a gold ⚡ glow.",
      "At high Time Entropy, that same alignment can curdle into a slowdown instead — a red 🔻 debuff that halves your speed for the same span. Watch the entropy bar to know which one you're due for.",
    ],
  },
  surge: {
    title: 'Temporal Surge',
    accent: '#a88fff',
    body: [
      "From now on, once every 720 revolutions, the second, minute, and hour hands sweep through 12 o'clock together — and when they align, the clock surges to 5× speed and 3× Time Energy for a full 30 seconds.",
      "A purple ✦ glow marks the surge. Crossing the alignment again while it's active resets the timer back to full, so a lucky run can chain surges back to back.",
    ],
  },
  runUpgrades: {
    title: 'New Upgrades',
    accent: '#5ecfb0',
    body: [
      "Your first reset has expanded what's possible. Three new upgrades are now available in the upgrade panel.",
      "Add Clock spins up an extra clock with unique effects. Boost Clocks increases their speed. Anchor Time reduces Time Entropy by improving your temporal stability.",
    ],
  },
  research: {
    title: 'Temporal Studies',
    accent: '#5ecfb0',
    body: [
      "You have lived through enough worlds to begin drawing conclusions. The Temporal Studies lab is now open.",
      "Spend your accumulated world-knowledge to research permanent upgrades — each study takes real time to complete, and some require a minimum number of worlds lived before they can begin.",
    ],
  },
};

export function UnlockAlertModal({ unlockKey, onClose }) {
  const info = UNLOCK_INFO[unlockKey];
  if (!info) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md flex flex-col gap-5 rounded-2xl"
        style={{
          padding: '2rem',
          background: '#0d0d18',
          border: `1px solid ${info.accent}4d`,
          boxShadow: `0 0 80px ${info.accent}1f`,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-muted)' }}>
            New Mechanic Unlocked
          </span>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: info.accent }}>
            {info.title}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {info.body.map((paragraph, i) => (
            <p key={i} className="text-sm text-center leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {paragraph}
            </p>
          ))}
        </div>

        <button
          onClick={onClose}
          className="rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            padding: '0.625rem',
            background: `linear-gradient(135deg, ${info.accent}cc, ${info.accent})`,
            border: 'none',
            color: '#0a0a0f',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
