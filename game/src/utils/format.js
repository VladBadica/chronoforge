import Decimal from 'decimal.js';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const THRESHOLDS = SUFFIXES.map((_, i) => new Decimal(1000).pow(i));

/**
 * Format a number for display in the game UI.
 * Uses suffix notation up to Dc (10^36), then falls back to scientific notation.
 *
 * @param {number} n
 * @param {number} decimals - decimal places (default 2)
 */
export function fmt(n, decimals = 2) {
  if (n == null || !isFinite(n) || isNaN(n)) return '0';
  if (n < 0) return '-' + fmt(-n, decimals);

  const d = new Decimal(n);

  if (d.lt(1)) return d.toFixed(decimals);

  for (let i = SUFFIXES.length - 1; i >= 1; i--) {
    if (d.gte(THRESHOLDS[i])) {
      return d.div(THRESHOLDS[i]).toFixed(decimals) + SUFFIXES[i];
    }
  }

  // < 1000 — show as integer unless decimals explicitly requested
  return d.toFixed(decimals);
}
