export function AscendModal({ singularities, singularityGain, canAscend, onAscend, onClose }) {
  const totalAfter = singularities + singularityGain;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg flex flex-col gap-6 rounded-2xl"
        style={{
          padding: '2rem',
          background: '#0d0d18',
          border: '1px solid rgba(240,192,96,0.3)',
          boxShadow: '0 0 80px rgba(240,192,96,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #ffe580, #f0c060)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            TEMPORAL ASCENSION
          </h2>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-muted)' }}>
            Beyond the loop
          </p>
        </div>

        {/* Explanation */}
        <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          You have bent time to its absolute limit. Ascending shatters this age entirely —
          all clocks, upgrades, prestige points, and prestige upgrades are consumed.
          What remains are{' '}
          <span style={{ color: '#f0c060' }}>Singularities</span>, crystallised remnants
          of entropy that persist across every ascension.
        </p>
        <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--color-muted)', opacity: 0.65 }}>
          Singularities unlock powers that no prestige upgrade can reach.
        </p>

        {/* Conversion stats */}
        <div
          className="flex justify-between rounded-xl"
          style={{
            padding: '1rem 1.5rem',
            background: 'rgba(240,192,96,0.05)',
            border: '1px solid rgba(240,192,96,0.15)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Entropy
            </span>
            <span className="text-xl font-bold" style={{ color: '#e74c3c' }}>
              100%
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Gain
            </span>
            <span className="text-xl font-bold" style={{ color: '#f0c060' }}>
              +{singularityGain} ✦
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Total
            </span>
            <span className="text-xl font-bold" style={{ color: '#ffe580' }}>
              {totalAfter} ✦
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg text-sm font-semibold transition-colors duration-150"
            style={{
              padding: '0.625rem',
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
            onClick={canAscend ? onAscend : undefined}
            disabled={!canAscend}
            className="flex-1 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              padding: '0.625rem',
              background: canAscend
                ? 'linear-gradient(135deg, #f0c060cc, #e6a830)'
                : 'var(--color-border)',
              color: canAscend ? '#0a0a0f' : 'var(--color-muted)',
              cursor: canAscend ? 'pointer' : 'not-allowed',
              border: 'none',
              fontWeight: 700,
              boxShadow: canAscend ? '0 4px 24px rgba(240,192,96,0.3)' : 'none',
            }}
            onMouseEnter={(e) => { if (canAscend) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            ✦ Ascend (+{singularityGain})
          </button>
        </div>
      </div>
    </div>
  );
}
