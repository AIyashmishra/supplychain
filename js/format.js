/* =============================================================
   format.js — Number formatting helpers
   ============================================================= */

function fmt(n, decimals) {
  if (decimals === undefined) decimals = 0;
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function fmtPct(n, decimals) {
  if (decimals === undefined) decimals = 1;
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(decimals) + '%';
}
