import { useState, useRef } from 'react';

function formatInGameTime(totalRevolutions) {
  const totalMinutes = Math.floor(totalRevolutions);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

const TUTORIAL_PAGES = [
  {
    title: 'The Clock',
    body: [
      'Time flows through the clock face. Every full revolution of the second hand generates Time Energy (TE) — the fuel for everything you build. Click the clock to nudge it forward by one second, and spend TE on upgrades that speed it up, raise its yield, or hold back its decay.',
      'Fast Time — when the second and minute hands meet, the clock leaps to double speed for a few seconds. (At high entropy this can backfire into a slowdown instead)',
      'Time Dust & Time Fracture — when the minute and hour hands meet, roughly once every 65 revolutions, you may earn Time Dust, a rare resource spent on Prestige. (At high entropy, that same alignment can instead fracture the clock and burn away a portion of your stored TE.)',
      'Temporal Surge — once every 720 revolutions, all three hands sweep through 12 o’clock together. When they align, the clock surges to 5× speed and 3× Time Energy for a full 30 seconds.',
    ],
  },
  {
    title: 'Time Entropy',
    body: [
      'Speed has a price. The faster the clock spins, the more it destabilizes — measured as Time Entropy, shown as a bar beneath the clock. It sits at zero near base speed and climbs the harder you push.',
      "High entropy turns your own events against you: Fast Time's buff can curdle into a debuff that halves your speed instead of doubling it, Time Fractures start eating into your stored TE, and the clock may suddenly lurch backwards on its own — Reverse Time.",
    ],
  },
  {
    title: 'Extra Clocks',
    body: [
      'Spend enough TE to add extra clocks beside the main one. Each spins on its own and banks a unique, permanently accumulating bonus every revolution — extra speed, bonus TE, or reduced entropy.',
      "Click an extra clock's face to pause or resume it. A stopped clock earns nothing, but it also costs nothing.",
      'Running clocks drain TE as upkeep, and the drain grows with how much bonus they have already banked. Let the cost outpace your income for too long, and the clock will stop itself.',
    ],
  },
  {
    title: 'Prestige',
    body: [
      'When the minute and hour hands align on the main clock, you may earn Time Dust (TD) — a rare resource. Spend it to Prestige: your run resets, but you keep the Prestige Points (PP) you earn to spend on permanent upgrades.',
      'PP gained scales with both the Time Dust spent and how high your entropy was at the moment you prestige — running hot before you reset pays off.',
      'Permanent upgrades reach further than simple boosts: a mirrored hand that doubles your TE, ways to turn chaos itself into extra yield, and — eventually — paths toward something beyond an ordinary run.',
    ],
  },
  {
    title: '???',
    body: [
      '...the dial does not stop at one hundred.',
      'Some say that when entropy consumes the clock entirely — when it reads whole, complete, total — something on the other side of the dial begins to stir.',
      'They call it the Singularity. Beyond it lies a threshold of speed scarcely worth naming... and, for those who reach it, a way to begin again — carrying forward a fragment of what came before.',
      "No one who has done it has ever fully explained why they keep going back for more.",
    ],
  },
];

const NAV_ARROW_STYLE = {
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  width: 32,
  height: 32,
  fontSize: 16,
  color: 'var(--color-text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const NAV_ARROW_DISABLED_STYLE = {
  ...NAV_ARROW_STYLE,
  color: 'var(--color-muted)',
  opacity: 0.35,
  cursor: 'default',
};

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
  const [tutorialPage, setTutorialPage] = useState(0);
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
            <button style={TAB_STYLE(tab === 'tutorial')} onClick={() => setTab('tutorial')}>Tutorial</button>
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
        <div className="flex flex-col" style={{ padding: '1.5rem 1.25rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {tab === 'stats' && (
            <div className="flex flex-col gap-5">
              <Row label="In-Game Time" value={formatInGameTime(totalRevolutions)} />
              <Row label="Current Speed" value={`${(speedMultiplier * 100).toFixed(0)}%`} sub={`${speedMultiplier.toFixed(2)}×`} />
              <Row label="Max Speed Reached" value={`${(maxSpeedReached * 100).toFixed(0)}%`} sub={`${maxSpeedReached.toFixed(2)}×`} />
              <Row label="Clicks Made" value={totalClicks.toLocaleString()} />
              <Row label="Times Prestiged" value={timesPrestiged.toLocaleString()} />
              <Row label="Total PP Accumulated" value={totalPPEarned.toLocaleString()} />
              <Row label="Times Ascended" value={timesAscended.toLocaleString()} />
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

          {tab === 'tutorial' && (() => {
            const total = TUTORIAL_PAGES.length;
            const page = TUTORIAL_PAGES[tutorialPage];
            return (
              <div className="flex flex-col" style={{ flex: 1, minHeight: 0 }}>
                <h3
                  className="text-xs font-semibold uppercase"
                  style={{ color: 'var(--color-accent)', letterSpacing: '0.12em', marginBottom: '0.75rem', flexShrink: 0 }}
                >
                  {page.title}
                </h3>

                {/* Scrollable text area — grows to fill the gap so the nav
                    below always sits at the very bottom of the tab, regardless
                    of how much a given page's text fills the space. */}
                <div className="custom-scrollbar flex flex-col gap-3" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                  {page.body.map((paragraph, i) => (
                    <p key={i} className="text-sm" style={{ color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div
                  className="flex items-center justify-between"
                  style={{ flexShrink: 0, marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}
                >
                  <button
                    style={tutorialPage === 0 ? NAV_ARROW_DISABLED_STYLE : NAV_ARROW_STYLE}
                    onClick={() => setTutorialPage((p) => Math.max(0, p - 1))}
                    disabled={tutorialPage === 0}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>

                  <div className="flex items-center gap-2">
                    {TUTORIAL_PAGES.map((_, i) => (
                      <span
                        key={i}
                        onClick={() => setTutorialPage(i)}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          cursor: 'pointer',
                          background: i === tutorialPage ? 'var(--color-accent)' : 'var(--color-border)',
                          transition: 'background 0.2s ease',
                        }}
                      />
                    ))}
                  </div>

                  <button
                    style={tutorialPage === total - 1 ? NAV_ARROW_DISABLED_STYLE : NAV_ARROW_STYLE}
                    onClick={() => setTutorialPage((p) => Math.min(total - 1, p + 1))}
                    disabled={tutorialPage === total - 1}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>

                <div className="text-xs text-center" style={{ flexShrink: 0, color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                  {tutorialPage + 1} / {total}
                </div>
              </div>
            );
          })()}

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
