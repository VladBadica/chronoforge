const UPGRADES = [
  {
    key: 'speed',
    label: 'Boost Accelerate Time',
    desc: 'Start each run with Accelerate Time +1 lv',
    costKey: 'prestigeSpeedCost',
    levelKey: 'prestigeSpeedLevel',
    buyKey: 'buyPrestigeSpeed',
  },
  {
    key: 'energy',
    label: 'Boost Improve Time',
    desc: 'Start each run with Improve Time +1 lv',
    costKey: 'prestigeEnergyCost',
    levelKey: 'prestigeEnergyLevel',
    buyKey: 'buyPrestigeEnergy',
  },
  {
    key: 'clock',
    label: 'Boost Add Clock',
    desc: 'Start each run with Add Clock +1 lv',
    costKey: 'prestigeClockCost',
    levelKey: 'prestigeClockLevel',
    buyKey: 'buyPrestigeClock',
    atMaxKey: 'prestigeClockAtMax',
  },
  {
    key: 'boost',
    label: 'Boost Clocks',
    desc: 'Start each run with Boost Clocks +1 lv',
    costKey: 'prestigeBoostCost',
    levelKey: 'prestigeBoostLevel',
    buyKey: 'buyPrestigeBoost',
    atMaxKey: 'prestigeBoostAtMax',
  },
  {
    key: 'anchor',
    label: 'Boost Anchor Time',
    desc: 'Start each run with Anchor Time +1 lv',
    costKey: 'prestigeAnchorCost',
    levelKey: 'prestigeAnchorLevel',
    buyKey: 'buyPrestigeAnchor',
  },
  {
    key: 'mirror',
    label: 'Mirror Clocks',
    desc: 'Adds a backward-moving hand (+1 clock per level)',
    costKey: 'prestigeMirrorCost',
    levelKey: 'prestigeMirrorLevel',
    buyKey: 'buyPrestigeMirror',
  },
];

export function PrestigeModal({
  timeDust,
  prestigePoints,
  canPrestige,
  onPrestige,
  onClose,
  prestigeSpeedLevel, prestigeSpeedCost, buyPrestigeSpeed,
  prestigeEnergyLevel, prestigeEnergyCost, buyPrestigeEnergy,
  prestigeClockLevel, prestigeClockCost, buyPrestigeClock, prestigeClockAtMax,
  prestigeBoostLevel, prestigeBoostCost, buyPrestigeBoost, prestigeBoostAtMax,
  prestigeAnchorLevel, prestigeAnchorCost, buyPrestigeAnchor,
  prestigeMirrorLevel, prestigeMirrorCost, buyPrestigeMirror,
}) {
  const ppGain = Math.floor(timeDust);
  const totalAfter = prestigePoints + ppGain;

  const levels = { prestigeSpeedLevel, prestigeEnergyLevel, prestigeClockLevel, prestigeBoostLevel, prestigeAnchorLevel, prestigeMirrorLevel };
  const costs = { prestigeSpeedCost, prestigeEnergyCost, prestigeClockCost, prestigeBoostCost, prestigeAnchorCost, prestigeMirrorCost };
  const actions = { buyPrestigeSpeed, buyPrestigeEnergy, buyPrestigeClock, buyPrestigeBoost, buyPrestigeAnchor, buyPrestigeMirror };
  const atMaxMap = { prestigeClockAtMax, prestigeBoostAtMax };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md flex flex-col gap-6 rounded-2xl overflow-y-auto"
        style={{
          padding: '1rem',
          maxHeight: '90vh',
          background: 'var(--color-surface)',
          border: '1px solid rgba(168,143,255,0.3)',
          boxShadow: '0 0 60px rgba(124,111,247,0.2)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #c0b8ff, #7c6ff7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            TEMPORAL PRESTIGE
          </h2>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-muted)' }}>
            Transcend the age
          </p>
        </div>

        {/* Explanation */}
        <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Sacrifice your progress to transcend time itself. Prestige resets all clocks, upgrades,
          and Time Energy — but your{' '}
          <span style={{ color: '#c0b8ff' }}>Prestige Points</span> and{' '}
          <span style={{ color: '#c0b8ff' }}>Prestige Upgrades</span> persist across every age.
          Requires <span style={{ color: '#5ecfb0' }}>10 TD</span> to prestige.
        </p>

        {/* Stats */}
        <div
          className="flex justify-between rounded-xl px-6 py-4"
          style={{ background: 'rgba(124,111,247,0.06)', border: '1px solid rgba(124,111,247,0.15)', padding: '5px' }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Time Dust
            </span>
            <span className="text-xl font-bold" style={{ color: '#5ecfb0' }}>
              {timeDust.toFixed(1)} TD
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              PP Gain
            </span>
            <span className="text-xl font-bold" style={{ color: '#c0b8ff' }}>
              +{ppGain} PP
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Total PP
            </span>
            <span className="text-xl font-bold" style={{ color: '#a88fff' }}>
              {totalAfter} PP
            </span>
          </div>
        </div>

        {/* Prestige Upgrades */}
        <div className="flex flex-col gap-2">
          <h3
            className="text-xs font-semibold uppercase tracking-widest text-center"
            style={{ color: 'var(--color-muted)' }}
          >
            Prestige Upgrades
          </h3>
          <div className="flex flex-col gap-2">
            {UPGRADES.map((u) => {
              const level = levels[u.levelKey];
              const cost = costs[u.costKey];
              const maxed = u.atMaxKey ? atMaxMap[u.atMaxKey] : false;
              const canAfford = !maxed && prestigePoints >= cost;
              return (
                <div
                  key={u.key}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(124,111,247,0.04)',
                    border: '1px solid rgba(124,111,247,0.12)',
                    padding: '5px'
                  }}
                >
                  <div className="flex flex-col gap-0.5" >
                    <span className="text-sm font-semibold" style={{ color: '#c0b8ff' }}>
                      {u.label}
                      {level > 0 && (
                        <span className="ml-2 text-xs font-normal" style={{ color: '#a88fff', paddingLeft: '4px' }}>
                          lv {level}
                        </span>
                      )}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {u.desc}
                    </span>
                  </div>
                  <button
                    onClick={canAfford ? actions[u.buyKey] : undefined}
                    disabled={!canAfford}
                    className="ml-4 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{
                      background: canAfford ? 'linear-gradient(135deg, #9d8fffcc, #7c6ff7)' : 'var(--color-border)',
                      color: canAfford ? '#fff' : 'var(--color-muted)',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      border: 'none',
                      whiteSpace: 'nowrap',
                      padding: '5px'
                    }}
                  >
                    {maxed ? 'MAX' : `${cost} PP`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-muted)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            Cancel
          </button>

          <button
            onClick={canPrestige ? onPrestige : undefined}
            disabled={!canPrestige}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: canPrestige
                ? 'linear-gradient(135deg, #9d8fffcc, #7c6ff7)'
                : 'var(--color-border)',
              color: canPrestige ? '#fff' : 'var(--color-muted)',
              cursor: canPrestige ? 'pointer' : 'not-allowed',
              border: 'none',
              boxShadow: canPrestige ? '0 4px 20px rgba(124,111,247,0.35)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (canPrestige) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ✦ Prestige ({ppGain} PP)
          </button>
        </div>
      </div>
    </div>
  );
}
