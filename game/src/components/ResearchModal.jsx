import { useState, useEffect, useRef } from 'react';
import { useResearchStore } from '../store/useResearchStore';
import { RESEARCH_TREE, RESEARCH_SAVE_KEY } from '../game/researchTree.js';
import { gameEngine } from '../game/GameEngine.js';

// Set by loadState() when a study finished while the modal was closed; consumed once on mount.
let _loadTimeCompleted = null;

// ── Layout constants ─────────────────────────────────────────────────────────
const NODE_W = 120;
const NODE_H = 80;
const COL_GAP = 20;
const ROW_GAP = 28;
const GRID_H = 12 * NODE_H + 11 * ROW_GAP;

function tlPos([col, row]) {
  return { x: col * (NODE_W + COL_GAP), y: row * (NODE_H + ROW_GAP) };
}
function centerPos(pos) {
  const { x, y } = tlPos(pos);
  return { x: x + NODE_W / 2, y: y + NODE_H / 2 };
}
function connPath(fromPos, toPos) {
  const f = centerPos(fromPos);
  const t = centerPos(toPos);
  const fy = f.y + NODE_H / 2;
  const ty = t.y - NODE_H / 2;
  const mid = (fy + ty) / 2;
  return `M ${f.x} ${fy} C ${f.x} ${mid}, ${t.x} ${mid}, ${t.x} ${ty}`;
}

function fmtTime(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}
function fmtRemaining(ms) {
  const s = Math.ceil(ms / 1000);
  if (s <= 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(RESEARCH_SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Complete any study that finished while the modal was closed
      if (data.activeStudy) {
        const node = RESEARCH_TREE.find(n => n.id === data.activeStudy.id);
        if (node && Date.now() - data.activeStudy.startedAt >= node.studyTime * 1000) {
          _loadTimeCompleted = node.name;
          const next = { studied: [...data.studied, data.activeStudy.id], activeStudy: null };
          persist(next.studied, null);
          return next;
        }
      }
      return data;
    }
  } catch { }
  return { studied: [], activeStudy: null, _now: 0 };
}
function persist(studied, activeStudy) {
  localStorage.setItem(RESEARCH_SAVE_KEY, JSON.stringify({ studied, activeStudy }));
}

function getStatus(node, studied, activeStudy, timesPrestiged) {
  if (studied.includes(node.id)) return 'completed';
  if (activeStudy?.id === node.id) return 'studying';
  if (
    node.requires.every(id => studied.includes(id)) &&
    timesPrestiged >= node.worldsRequired
  ) return 'available';
  return 'locked';
}

// ── Node card ─────────────────────────────────────────────────────────────────
function NodeCard({ node, status, timesPrestiged, activeStudy, canStartNew, now, onStudy }) {
  const { x, y } = tlPos(node.pos);
  const clickable = status === 'available' && canStartNew;

  const borderColor = {
    completed: '#5ecfb0',
    studying: '#7c6ff7',
    available: 'rgba(94,207,176,0.28)',
    locked: 'rgba(255,255,255,0.06)',
  }[status];

  const bg = {
    completed: 'rgba(94,207,176,0.05)',
    studying: 'rgba(124,111,247,0.07)',
    available: 'var(--color-surface)',
    locked: 'var(--color-surface)',
  }[status];

  const nameColor = {
    completed: '#5ecfb0',
    studying: '#a88fff',
    available: 'var(--color-text)',
    locked: 'var(--color-muted)',
  }[status];

  let progress = 0;
  let remaining = '';
  if (status === 'studying' && activeStudy && now > 0) {
    const elapsed = now - activeStudy.startedAt;
    const total = node.studyTime * 1000;
    progress = Math.min(elapsed / total, 1);
    remaining = fmtRemaining(Math.max(0, total - elapsed));
  }

  return (
    <div
      onClick={clickable ? onStudy : undefined}
      onMouseEnter={clickable ? (e) => { e.currentTarget.style.borderColor = 'rgba(94,207,176,0.6)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(94,207,176,0.1)'; } : undefined}
      onMouseLeave={clickable ? (e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; } : undefined}
      style={{
        position: 'absolute', left: x, top: y,
        width: NODE_W, minHeight: NODE_H,
        zIndex: 1, boxSizing: 'border-box',
        borderRadius: 10, border: `1px solid ${borderColor}`, background: bg,
        padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 3,
        opacity: status === 'locked' ? 0.5 : 1,
        cursor: clickable ? 'pointer' : 'default',
        boxShadow: status === 'completed' ? '0 0 14px rgba(94,207,176,0.08)'
          : status === 'studying' ? '0 0 18px rgba(124,111,247,0.12)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: nameColor, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 4 }}>
        {node.name}
        {status === 'completed' && <span style={{ fontSize: 9, opacity: 0.75 }}>✓</span>}
      </div>

      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 1.35, flex: 1 }}>
        {node.description}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
        <span style={{ color: 'var(--color-muted)' }}>⏱ {fmtTime(node.studyTime)}</span>
        <span style={{ color: timesPrestiged >= node.worldsRequired ? 'var(--color-muted)' : '#e07070' }}>
          ◎ {node.worldsRequired}w
        </span>
      </div>

      {status === 'studying' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(124,111,247,0.2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: '#7c6ff7', borderRadius: 99, transition: 'width 0.5s linear' }} />
          </div>
          <div style={{ fontSize: 10, color: '#a88fff', textAlign: 'right', lineHeight: 1 }}>{remaining}</div>
        </div>
      )}

    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function ResearchModal({ timesPrestiged, onClose }) {
  const [state, setState] = useState(loadState);

  const { studied, activeStudy } = state;

  // Sync engine on mount (covers load-time completions) and fire pending toast
  useEffect(() => {
    gameEngine.setResearchStudied(state.studied);
    if (_loadTimeCompleted) {
      useResearchStore.getState().showToast(_loadTimeCompleted);
      _loadTimeCompleted = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync engine and fire toast whenever a study completes while the modal is open
  const prevStudiedLen = useRef(state.studied.length);
  useEffect(() => {
    const len = state.studied.length;
    if (len > prevStudiedLen.current) {
      gameEngine.setResearchStudied(state.studied);
      const completedId = state.studied[len - 1];
      const node = RESEARCH_TREE.find(n => n.id === completedId);
      if (node) useResearchStore.getState().showToast(node.name);
    }
    prevStudiedLen.current = len;
  }, [state.studied]);

  useEffect(() => {
    if (!activeStudy) return;
    const id = setInterval(() => {
      setState(prev => {
        if (!prev.activeStudy) return prev;
        const now = Date.now();
        const node = RESEARCH_TREE.find(n => n.id === prev.activeStudy.id);
        if (node && now - prev.activeStudy.startedAt >= node.studyTime * 1000) {
          const next = { ...prev, studied: [...prev.studied, prev.activeStudy.id], activeStudy: null, _now: now };
          persist(next.studied, null);
          return next;
        }
        return { ...prev, _now: now };
      });
    }, 500);
    return () => clearInterval(id);
  }, [activeStudy?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function startStudy(node) {
    if (activeStudy) return;
    setState(prev => {
      if (prev.activeStudy) return prev;
      const as = { id: node.id, startedAt: Date.now() };
      const next = { ...prev, activeStudy: as };
      persist(next.studied, as);
      return next;
    });
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
          maxWidth: 750,
          maxHeight: '85vh',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-base font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #5ecfb0, #2a9d8f)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Temporal Studies
            </h2>
            <div
              className="flex items-center gap-1.5"
              style={{
                padding: '2px 8px',
                borderRadius: 99,
                background: 'rgba(94,207,176,0.08)',
                border: '1px solid rgba(94,207,176,0.2)',
              }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#5ecfb0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                <path d="M3 13.5 Q12 18 21 13.5" />
                <circle cx="12" cy="12" r="4.5" fill="var(--color-surface)" />
                <path d="M3 13.5 Q12 9 21 13.5" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#5ecfb0', opacity: 0.8 }}>
                {timesPrestiged}
              </span>
            </div>
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

        {/* Scrollable tree */}
        <div
          className="custom-scrollbar"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.5rem' }}
        >
          <div style={{ position: 'relative', width: '100%', height: GRID_H }}>
            <svg
              width="100%"
              height={GRID_H}
              style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'visible' }}
            >
              {RESEARCH_TREE.flatMap(node =>
                node.requires.map(reqId => {
                  const parent = RESEARCH_TREE.find(n => n.id === reqId);
                  if (!parent) return null;
                  const parentDone = studied.includes(reqId);
                  const childStatus = getStatus(node, studied, activeStudy, timesPrestiged);
                  const color = parentDone && childStatus === 'completed' ? '#5ecfb0'
                    : parentDone && childStatus !== 'locked' ? '#2a9d8f'
                      : 'rgba(255,255,255,0.07)';
                  return (
                    <path
                      key={`${reqId}->${node.id}`}
                      d={connPath(parent.pos, node.pos)}
                      stroke={color}
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray={childStatus === 'locked' ? '4 3' : undefined}
                      style={{ transition: 'stroke 0.3s' }}
                    />
                  );
                })
              )}
            </svg>

            {RESEARCH_TREE.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                status={getStatus(node, studied, activeStudy, timesPrestiged)}
                timesPrestiged={timesPrestiged}
                activeStudy={activeStudy}
                canStartNew={!activeStudy}
                now={state._now}
                onStudy={() => startStudy(node)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
