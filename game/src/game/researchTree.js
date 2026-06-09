export const RESEARCH_SAVE_KEY = 'chronoforge_research_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Research tree — edit this array to change nodes, layout, costs, and branches.
//
// pos: [col, row]  — 0-indexed position in a 4-col grid.
// requires: []     — ids that must be completed before this node unlocks.
// studyTime        — real seconds of study required.
// worldsRequired   — minimum timesPrestiged before study can begin.
// effect           — what the node does when studied:
//   { type: 'te_multiplier', value: N }   — additive bonus: (N-1) added to research TE mult
//   { type: 'starting_te',  value: N }    — flat TE granted at run start (not yet applied)
//   { type: 'ability_unlock', ability }   — unlocks a player-triggered ability (not yet applied)
//   { type: 'feature_unlock', feature }   — unlocks a game feature (not yet applied)
// ─────────────────────────────────────────────────────────────────────────────
export const RESEARCH_TREE = [
  // ── Row 0 ──────────────────────────────────────────────────────────────────
  { id: 'r20', name: 'TE Upgrade', description: 'Improve TE gain 1.5x', pos: [2, 0], requires: [], studyTime: 30, worldsRequired: 2, effect: { type: 'te_multiplier', value: 1.5 } },
  // ── Row 1 ──────────────────────────────────────────────────────────────────
  { id: 'r01', name: 'Ability 1', description: 'Unlock \'Essence Flow\'. 3x TE for 15s', pos: [0, 1], requires: ['r20'], studyTime: 300, worldsRequired: 3, effect: { type: 'ability_unlock', ability: 'essenceFlow' } },
  { id: 'r11', name: 'Ability 2', description: 'Unlock \'Entropy Defense\'. 0.5x Entropy for 30s', pos: [1, 1], requires: ['r20'], studyTime: 300, worldsRequired: 3, effect: { type: 'ability_unlock', ability: 'entropyDefense' } },
  { id: 'r31', name: 'Ability 3', description: 'Unlock \'\'.', pos: [3, 1], requires: ['r20'], studyTime: 300, worldsRequired: 3, effect: { type: 'ability_unlock', ability: 'ability3' } },
  { id: 'r41', name: 'Base TE', description: 'Start run with +1000 TE', pos: [4, 1], requires: ['r20'], studyTime: 60, worldsRequired: 3, effect: { type: 'starting_te', value: 1000 } },
  // ── Row 2 ──────────────────────────────────────────────────────────────────
  { id: 'r02', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [0, 2], requires: ['r01'], studyTime: 600, worldsRequired: 4, effect: { type: 'te_multiplier', value: 1.2 } },
  { id: 'r12', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [1, 2], requires: ['r11'], studyTime: 600, worldsRequired: 4, effect: { type: 'te_multiplier', value: 1.2 } },
  { id: 'r32', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [3, 2], requires: ['r31'], studyTime: 600, worldsRequired: 4, effect: { type: 'te_multiplier', value: 1.2 } },
  { id: 'r42', name: 'Base TE', description: 'Start run with +1000 TE', pos: [4, 2], requires: ['r41'], studyTime: 120, worldsRequired: 3, effect: { type: 'starting_te', value: 1000 } },
  // ── Row 3 ──────────────────────────────────────────────────────────────────
  { id: 'r03', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [0, 3], requires: ['r02'], studyTime: 1200, worldsRequired: 4, effect: { type: 'te_multiplier', value: 1.2 } },
  { id: 'r13', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [1, 3], requires: ['r12'], studyTime: 1200, worldsRequired: 4, effect: { type: 'te_multiplier', value: 1.2 } },
  { id: 'r33', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [3, 3], requires: ['r32'], studyTime: 1200, worldsRequired: 4, effect: { type: 'te_multiplier', value: 1.2 } },
  { id: 'r43', name: 'Base TE', description: 'Start run with +1000 TE', pos: [4, 3], requires: ['r42'], studyTime: 180, worldsRequired: 4, effect: { type: 'starting_te', value: 1000 } },
  // ── Row 4 ──────────────────────────────────────────────────────────────────
  { id: 'r24', name: 'Singularity', description: 'Unlock Singularities', pos: [2, 4], requires: ['r03', 'r13', 'r33', 'r43'], studyTime: 7200, worldsRequired: 6, effect: { type: 'feature_unlock', feature: 'singularities' } },
  // ── Row 5 ──────────────────────────────────────────────────────────────────
  { id: 'r15', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [1, 5], requires: ['r24'], studyTime: 3600, worldsRequired: 7, effect: { type: 'te_multiplier', value: 1.2 } },
  { id: 'r35', name: 'TE Upgrade', description: 'Improve TE gain 1.2x', pos: [3, 5], requires: ['r24'], studyTime: 3600, worldsRequired: 7, effect: { type: 'te_multiplier', value: 1.2 } },
  // ── Row 6 ──────────────────────────────────────────────────────────────────
  { id: 'r46', name: 'TE Upgrade', description: 'Improve TE gain 10x', pos: [4, 6], requires: ['r35'], studyTime: 172800, worldsRequired: 10, effect: { type: 'te_multiplier', value: 10 } },
  // ── Row 7 ──────────────────────────────────────────────────────────────────
  { id: 'r47', name: 'TE Upgrade', description: 'Improve TE gain 10x', pos: [4, 7], requires: ['r46'], studyTime: 345600, worldsRequired: 14, effect: { type: 'te_multiplier', value: 10 } },
];
