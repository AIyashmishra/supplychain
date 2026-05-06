/* =============================================================
   simulator.js — Simulator widget rendering + handlers
   Implements P1-P3 (performance levers) and C1-C3 (capacity levers).
   Reads from window.DATA (set by data-loader.js).
 
   The original simulator code uses a bare `DATA` variable. We
   declare it as a top-level `var` so it's hoisted to window scope.
   data-loader.js calls window.syncSimulatorData() before init() to
   sync the value over.
   ============================================================= */
 
// Top-level DATA — accessible to all simulator functions
var DATA = null;
 
// Called by data-loader.js after parsing
window.syncSimulatorData = function(parsed) {
  DATA = parsed;
};
 
/* ============================================================
   DERIVED VALUES — computed from DATA, used everywhere
   ============================================================ */
function derive() {
  const D = DATA;
  D.lots_per_week = (7 / D.bottleneck_ct_days) * D.n_lines;
  D.best_yield = Math.max(...Object.values(D.yield_by_grade));
  D.current_mix_yield =
    D.mix.Grade1 * D.yield_by_grade.Grade1 +
    D.mix.Grade2 * D.yield_by_grade.Grade2 +
    D.mix.Grade3 * D.yield_by_grade.Grade3;
  D.max_possible_supply = Math.round(D.lots_per_week * D.base_chips_per_lot * D.best_yield);
  D.performance_gap = D.max_possible_supply - D.supply_w6;
  D.capacity_gap = D.demand_w6 - D.max_possible_supply;
}
 
/* ============================================================
   FORMATTERS
   ============================================================ */
const fmt = {
  int: n => Math.round(n).toLocaleString(),
  pct: (f, d=2) => (f * 100).toFixed(d) + '%',
  pctNum: (n, d=2) => n.toFixed(d) + '%',
  signed: n => (n >= 0 ? '+' : '') + Math.round(n).toLocaleString(),
  days: (n, d=2) => n.toFixed(d) + 'd'
};
 
/* ============================================================
   SECTION 1 — populate summary tiles + stack bar
   ============================================================ */
function renderSection1() {
  document.getElementById('t-demand').textContent = fmt.int(DATA.demand_w6);
  document.getElementById('t-supply').textContent = fmt.int(DATA.supply_w6);
  document.getElementById('t-perf').textContent = fmt.int(DATA.performance_gap);
  document.getElementById('t-cap').textContent = fmt.int(DATA.capacity_gap);
 
  document.getElementById('perf-gap-label').textContent = fmt.int(DATA.performance_gap);
  document.getElementById('cap-gap-label').textContent = fmt.int(DATA.capacity_gap);
 
  // Populate the expandable formula bodies
  document.getElementById('perf-formula-body').textContent =
`Performance Gap = Max Possible Supply − Actual Supply
 
Max Possible = lots/wk × base chips × best yield
            = ${DATA.lots_per_week} × ${DATA.base_chips_per_lot} × ${fmt.pct(DATA.best_yield)}
            = ${fmt.int(DATA.max_possible_supply)} chips/week
 
Actual = ${fmt.int(DATA.supply_w6)} chips/week
 
Gap = ${fmt.int(DATA.max_possible_supply)} − ${fmt.int(DATA.supply_w6)} = ${fmt.int(DATA.performance_gap)}`;
 
  document.getElementById('cap-formula-body').textContent =
`Capacity Gap = Demand − Max Possible Supply
 
Demand (W6 peak) = ${fmt.int(DATA.demand_w6)} chips/week
Max Possible    = ${fmt.int(DATA.max_possible_supply)} chips/week
 
Gap = ${fmt.int(DATA.demand_w6)} − ${fmt.int(DATA.max_possible_supply)} = ${fmt.int(DATA.capacity_gap)}
 
This is the structural piece. It exists no matter how
well we run the line. The only way to close it is to add
factory capacity (lines, faster bottleneck, or premium yield).`;
 
  const total = DATA.demand_w6;
  const pctSupply = (DATA.supply_w6 / total) * 100;
  const pctPerf = (DATA.performance_gap / total) * 100;
  const pctCap = (DATA.capacity_gap / total) * 100;
 
  const sSup = document.getElementById('stack-supply');
  const sPerf = document.getElementById('stack-perf');
  const sCap = document.getElementById('stack-cap');
 
  sSup.style.width = pctSupply + '%';
  sPerf.style.width = pctPerf + '%';
  sCap.style.width = pctCap + '%';
  sSup.textContent = 'SUPPLY ' + fmt.int(DATA.supply_w6);
  sPerf.textContent = '';
  sCap.textContent = 'CAPACITY GAP ' + fmt.int(DATA.capacity_gap);
  sSup.title = 'Actual supply: ' + fmt.int(DATA.supply_w6) + ' chips/week';
  sPerf.title = 'Performance gap: ' + fmt.int(DATA.performance_gap) + ' chips/week';
  sCap.title = 'Capacity gap: ' + fmt.int(DATA.capacity_gap) + ' chips/week';
}
 
function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (id === 'section-perf') {
    document.getElementById('tile-perf').classList.add('active');
    document.getElementById('tile-cap').classList.remove('active');
  } else {
    document.getElementById('tile-cap').classList.add('active');
    document.getElementById('tile-perf').classList.remove('active');
  }
}
 
function handleTileClick(event, sectionId, formulaId) {
  // If the click landed inside an open formula box, ignore it
  // (so the user can read the formula without the page jumping).
  if (event.target.closest('.tile-formula.open')) return;
  scrollToSection(sectionId);
}
 
function toggleFormula(id) {
  document.getElementById(id).classList.toggle('open');
}
 
/* ============================================================
   P1 — Wafer Quality Mix
   ============================================================ */
function initWafer() {
  const g1Slider = document.getElementById('g1');
  const g2Slider = document.getElementById('g2');
  g1Slider.value = Math.round(DATA.mix.Grade1 * 100);
  g2Slider.value = Math.round(DATA.mix.Grade2 * 100);
  g1Slider.addEventListener('input', updateWafer);
  g2Slider.addEventListener('input', updateWafer);
 
  document.getElementById('g1-bar-label').textContent = 'G1 ' + fmt.pct(DATA.yield_by_grade.Grade1, 2);
  document.getElementById('g2-bar-label').textContent = 'G2 ' + fmt.pct(DATA.yield_by_grade.Grade2, 2);
  document.getElementById('g3-bar-label').textContent = 'G3 ' + fmt.pct(DATA.yield_by_grade.Grade3, 2);
 
  document.getElementById('wafer-formula').textContent =
    `supply = ${DATA.lots_per_week} × ${DATA.base_chips_per_lot} × (g1×${fmt.pct(DATA.yield_by_grade.Grade1)} + g2×${fmt.pct(DATA.yield_by_grade.Grade2)} + g3×${fmt.pct(DATA.yield_by_grade.Grade3)})`;
 
  updateWafer();
}
 
function updateWafer() {
  let g1 = parseFloat(document.getElementById('g1').value);
  let g2 = parseFloat(document.getElementById('g2').value);
  let g3 = 100 - g1 - g2;
  if (g3 < 0) {
    g2 = 100 - g1;
    g3 = 0;
    document.getElementById('g2').value = g2;
  }
  document.getElementById('g1-out').textContent = g1.toFixed(0) + '%';
  document.getElementById('g2-out').textContent = g2.toFixed(0) + '%';
  document.getElementById('g3-out').textContent = g3.toFixed(0) + '%';
  document.getElementById('g1-bar').style.width = g1 + '%';
  document.getElementById('g2-bar').style.width = g2 + '%';
  document.getElementById('g3-bar').style.width = g3 + '%';
 
  const mixYield =
    (g1/100) * DATA.yield_by_grade.Grade1 +
    (g2/100) * DATA.yield_by_grade.Grade2 +
    (g3/100) * DATA.yield_by_grade.Grade3;
  const supply = Math.round(DATA.lots_per_week * DATA.base_chips_per_lot * mixYield);
  const delta = supply - DATA.supply_w6;
 
  document.getElementById('wafer-supply').textContent = fmt.int(supply);
  document.getElementById('wafer-yield').textContent = fmt.pctNum(mixYield * 100);
  const deltaEl = document.getElementById('wafer-delta');
  deltaEl.textContent = fmt.signed(delta) + ' vs today';
  deltaEl.className = 'output-value small ' + (delta > 0 ? 'delta-pos' : (delta < 0 ? 'delta-neg' : 'delta-zero'));
}
 
/* ============================================================
   P2 — Line × Grade Process Variation
   ============================================================ */
function initLineGrade() {
  const lg = DATA.yield_line_grade;
  document.getElementById('cell-ag1').textContent = fmt.pct(lg.A.Grade1);
  document.getElementById('cell-bg1').textContent = fmt.pct(lg.B.Grade1);
  document.getElementById('cell-ag2').textContent = fmt.pct(lg.A.Grade2);
  document.getElementById('cell-bg2').textContent = fmt.pct(lg.B.Grade2);
  document.getElementById('cell-ag3').textContent = fmt.pct(lg.A.Grade3);
  document.getElementById('cell-ag1').style.background = 'rgba(15, 110, 86, 0.10)';
  document.getElementById('cell-bg1').style.background = 'rgba(15, 110, 86, 0.10)';
  document.getElementById('cell-ag2').style.background = 'rgba(15, 110, 86, 0.08)';
  document.getElementById('cell-bg2').style.background = 'rgba(15, 110, 86, 0.08)';
  document.getElementById('cell-ag3').style.background = 'rgba(15, 110, 86, 0.04)';
 
  const lbG3 = lg.B.Grade3 * 100;
  const laG3 = lg.A.Grade3 * 100;
 
  const slider = document.getElementById('lineb-g3');
  slider.min = lbG3.toFixed(1);
  slider.max = laG3.toFixed(1);
  slider.value = lbG3.toFixed(1);
  slider.addEventListener('input', updateLineGrade);
 
  document.getElementById('lb-g3-today').textContent = fmt.pctNum(lbG3, 1);
  document.getElementById('la-g3-target').textContent = fmt.pctNum(laG3, 1);
 
  document.getElementById('linegrade-formula').textContent =
    `gain = ${DATA.lineB_g3_lots_per_week} lots/wk × ${DATA.base_chips_per_lot} chips × Δyield`;
 
  updateLineGrade();
}
 
function updateLineGrade() {
  const lbG3Now = parseFloat(document.getElementById('lineb-g3').value);
  const lbG3Today = DATA.yield_line_grade.B.Grade3 * 100;
  const laG3 = DATA.yield_line_grade.A.Grade3 * 100;
 
  document.getElementById('lineb-g3-out').textContent = fmt.pctNum(lbG3Now, 1);
  document.getElementById('cell-bg3').textContent = fmt.pctNum(lbG3Now);
 
  const intensity = Math.max(0, Math.min(1, (laG3 - lbG3Now) / (laG3 - lbG3Today)));
  document.getElementById('cell-bg3').style.background = `rgba(24, 95, 165, ${0.05 + intensity * 0.4})`;
 
  const yieldGain = (lbG3Now - lbG3Today) / 100;
  const supplyGain = Math.round(DATA.lineB_g3_lots_per_week * DATA.base_chips_per_lot * yieldGain);
 
  const gainEl = document.getElementById('linegrade-gain');
  gainEl.textContent = fmt.signed(supplyGain);
  gainEl.className = 'output-value ' + (supplyGain > 0 ? 'delta-pos' : 'delta-zero');
}
 
/* ============================================================
   P3 — Cycle Time Variance
   ============================================================ */
function initCT() {
  const container = document.getElementById('station-rows');
  container.innerHTML = '';
  DATA.stations.forEach(id => {
    const row = document.createElement('div');
    row.className = 'station-row';
    row.innerHTML = `
      <div>${id}<span id="btag-${id}" class="bottleneck-tag" style="display:none;">BOTTLENECK</span></div>
      <div class="station-bar-bg">
        <div id="ct-${id}-bar" class="station-bar"></div>
        <div id="ct-${id}-marker" class="station-marker" title="committed: ${DATA.committed_ct[id]}d"></div>
      </div>
      <div class="station-readout"><span id="ct-${id}-out">—</span></div>
    `;
    container.appendChild(row);
  });
 
  ['S1','S5','S6'].forEach(id => {
    const slider = document.getElementById('ct-' + id);
    slider.value = DATA.actual_ct[id];
    slider.addEventListener('input', updateCT);
  });
 
  updateCT();
}
 
function updateCT() {
  // Editable stations come from sliders; non-editable stations stay at DATA.actual_ct
  const editable = ['S1', 'S5', 'S6'];
  const ctValues = {};
  DATA.stations.forEach(id => {
    if (editable.includes(id)) {
      ctValues[id] = parseFloat(document.getElementById('ct-' + id).value);
    } else {
      ctValues[id] = DATA.actual_ct[id];
    }
  });
 
  // Find max bar scale (use 110% of largest committed/actual seen)
  const allValues = [...Object.values(DATA.committed_ct), ...Object.values(ctValues)];
  const barMax = Math.max(...allValues) * 1.1;
 
  let bottleneckId = DATA.stations[0];
  let maxCT = 0;
  DATA.stations.forEach(id => {
    if (ctValues[id] > maxCT) {
      maxCT = ctValues[id];
      bottleneckId = id;
    }
  });
 
  DATA.stations.forEach(id => {
    document.getElementById('ct-' + id + '-out').textContent = fmt.days(ctValues[id]);
    document.getElementById('ct-' + id + '-bar').style.width = (ctValues[id] / barMax * 100) + '%';
    document.getElementById('ct-' + id + '-marker').style.left = (DATA.committed_ct[id] / barMax * 100) + '%';
    const bar = document.getElementById('ct-' + id + '-bar');
    const tag = document.getElementById('btag-' + id);
    if (id === bottleneckId) {
      bar.style.background = 'var(--accent)';
      tag.style.display = 'inline-block';
    } else {
      bar.style.background = 'var(--text-tertiary)';
      tag.style.display = 'none';
    }
  });
 
  const bottleneckCT = ctValues[bottleneckId];
  const lotsPerWeek = (7 / bottleneckCT) * DATA.n_lines;
  const supply = Math.round(lotsPerWeek * DATA.base_chips_per_lot * DATA.current_mix_yield);
  const delta = supply - DATA.supply_w6;
 
  document.getElementById('ct-bottleneck-name').textContent = bottleneckId;
  document.getElementById('ct-supply').textContent = fmt.int(supply);
  const deltaEl = document.getElementById('ct-delta');
  deltaEl.textContent = fmt.signed(delta) + ' vs today';
  deltaEl.className = 'output-value small ' + (delta > 0 ? 'delta-pos' : (delta < 0 ? 'delta-neg' : 'delta-zero'));
 
  document.getElementById('ct-formula').textContent =
    `supply = (7 ÷ ${bottleneckCT.toFixed(2)}d) × ${DATA.n_lines} × ${DATA.base_chips_per_lot} × ${fmt.pct(DATA.current_mix_yield)}\nnon-bottleneck stations have slack — their CT does not affect supply`;
}
 
/* ============================================================
   C1 — Number of Lines (step chart + slider)
   ============================================================ */
function initLines() {
  const slider = document.getElementById('n-lines');
  slider.value = DATA.n_lines;
  slider.addEventListener('input', updateLines);
 
  // Compute Y-axis max for chart based on 6 lines at best yield
  const maxSupply = 7 * 6 * DATA.base_chips_per_lot * DATA.best_yield;
  const yMax = Math.ceil(maxSupply / 20000) * 20000;
  document.getElementById('lines-y-max').textContent = (yMax / 1000) + 'K';
  document.getElementById('lines-y-mid').textContent = (yMax / 2000) + 'K';
 
  drawLinesChart(yMax);
  updateLines();
 
  document.getElementById('lines-formula').textContent =
    `max supply = 7 × N_lines × ${DATA.base_chips_per_lot} × ${fmt.pct(DATA.best_yield)}`;
}
 
function drawLinesChart(yMax) {
  const svg = document.getElementById('lines-svg');
  svg.innerHTML = '';
  const xs = [40, 120, 200, 280, 360, 440];
 
  function yFor(supply) {
    return 180 - (supply / yMax) * 180;
  }
 
  const supplies = [];
  for (let n = 1; n <= 6; n++) {
    supplies.push(7 * n * DATA.base_chips_per_lot * DATA.best_yield);
  }
 
  // demand line
  const demandY = yFor(DATA.demand_w6);
  svg.innerHTML += `<line x1="0" y1="${demandY}" x2="480" y2="${demandY}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3"/>`;
  svg.innerHTML += `<text x="475" y="${demandY - 5}" text-anchor="end" font-size="10" fill="var(--accent)">demand ${fmt.int(DATA.demand_w6)}</text>`;
 
  // step polyline
  let pts = '';
  for (let i = 0; i < xs.length; i++) {
    const y = yFor(supplies[i]);
    if (i === 0) {
      pts += `${xs[i]},${y + 25} ${xs[i]},${y}`;
    } else {
      pts += ` ${xs[i]},${yFor(supplies[i-1])} ${xs[i]},${y}`;
    }
    if (i === xs.length - 1) pts += ` ${xs[i] + 30},${y}`;
  }
  svg.innerHTML += `<polyline points="${pts}" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"/>`;
 
  // dots
  for (let i = 0; i < xs.length; i++) {
    svg.innerHTML += `<circle id="line-dot-${i+1}" cx="${xs[i]}" cy="${yFor(supplies[i])}" r="3" fill="var(--text-tertiary)"/>`;
  }
 
  // x labels
  for (let i = 0; i < xs.length; i++) {
    svg.innerHTML += `<text x="${xs[i]}" y="195" text-anchor="middle" font-size="10" fill="var(--text-tertiary)">${i+1}</text>`;
  }
}
 
function updateLines() {
  const n = parseInt(document.getElementById('n-lines').value);
  document.getElementById('n-lines-out').textContent = n;
  const supply = Math.round(7 * n * DATA.base_chips_per_lot * DATA.best_yield);
  const gap = DATA.demand_w6 - supply;
 
  document.getElementById('lines-supply').textContent = fmt.int(supply);
  const gapEl = document.getElementById('lines-gap-val');
  gapEl.textContent = (gap > 0 ? '−' : '+') + Math.abs(Math.round(gap)).toLocaleString();
  gapEl.style.color = gap > 0 ? 'var(--accent)' : 'var(--good)';
  document.getElementById('lines-gap-label').textContent = gap > 0 ? 'short of demand' : 'surplus over demand';
 
  for (let i = 1; i <= 6; i++) {
    const dot = document.getElementById('line-dot-' + i);
    if (dot) {
      dot.setAttribute('fill', i === n ? 'var(--accent)' : 'var(--text-tertiary)');
      dot.setAttribute('r', i === n ? 5 : 3);
    }
  }
}
 
/* ============================================================
   C2 — Bottleneck Cycle Time (curve + slider)
   ============================================================ */
function initBottleneckCT() {
  const slider = document.getElementById('bn-ct');
  slider.value = DATA.bottleneck_ct_days;
  slider.addEventListener('input', updateBottleneckCT);
 
  // Y max: supply at smallest CT
  const maxSupply = (7 / 0.3) * DATA.n_lines * DATA.base_chips_per_lot * DATA.best_yield;
  const yMax = Math.ceil(maxSupply / 50000) * 50000;
  document.getElementById('bnct-y-max').textContent = (yMax / 1000) + 'K';
  document.getElementById('bnct-y-mid').textContent = (yMax / 2000) + 'K';
 
  drawBottleneckCTChart(yMax);
  updateBottleneckCT();
 
  document.getElementById('bnct-formula').textContent =
    `max supply = (7 ÷ bottleneck_CT) × ${DATA.n_lines} × ${DATA.base_chips_per_lot} × ${fmt.pct(DATA.best_yield)}`;
}
 
function drawBottleneckCTChart(yMax) {
  const svg = document.getElementById('bnct-svg');
  svg.innerHTML = '';
 
  const ctMin = 0.3, ctMax = 2.0;
  function yFor(supply) {
    return 160 - (supply / yMax) * 160;
  }
  function xFor(ct) {
    // invert: smaller CT → right side (higher supply at right)
    return 10 + (ct - ctMin) / (ctMax - ctMin) * 460;
  }
 
  // demand line
  const demandY = yFor(DATA.demand_w6);
  svg.innerHTML += `<line x1="0" y1="${demandY}" x2="480" y2="${demandY}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3"/>`;
  svg.innerHTML += `<text x="475" y="${demandY - 5}" text-anchor="end" font-size="10" fill="var(--accent)">demand ${fmt.int(DATA.demand_w6)}</text>`;
 
  // curve
  let path = '';
  let started = false;
  for (let ct = ctMin; ct <= ctMax + 0.01; ct += 0.05) {
    const supply = (7 / ct) * DATA.n_lines * DATA.base_chips_per_lot * DATA.best_yield;
    const x = xFor(ct);
    const y = yFor(supply);
    if (!started) { path = `M ${x.toFixed(1)},${y.toFixed(1)}`; started = true; }
    else { path += ` L ${x.toFixed(1)},${y.toFixed(1)}`; }
  }
  svg.innerHTML += `<path d="${path}" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"/>`;
 
  // marker for current CT
  const cx = xFor(DATA.bottleneck_ct_days);
  const cy = yFor((7 / DATA.bottleneck_ct_days) * DATA.n_lines * DATA.base_chips_per_lot * DATA.best_yield);
  svg.innerHTML += `<circle id="bnct-marker" cx="${cx}" cy="${cy}" r="5" fill="var(--accent)"/>`;
}
 
function updateBottleneckCT() {
  const ct = parseFloat(document.getElementById('bn-ct').value);
  document.getElementById('bn-ct-out').textContent = fmt.days(ct) + 'ays';
  const supply = Math.round((7 / ct) * DATA.n_lines * DATA.base_chips_per_lot * DATA.best_yield);
  const baseline = Math.round((7 / DATA.bottleneck_ct_days) * DATA.n_lines * DATA.base_chips_per_lot * DATA.best_yield);
  const delta = supply - baseline;
 
  document.getElementById('bnct-supply').textContent = fmt.int(supply);
  const deltaEl = document.getElementById('bnct-delta');
  deltaEl.textContent = fmt.signed(delta) + ' vs current ceiling';
  deltaEl.className = 'output-value small ' + (delta > 0 ? 'delta-pos' : (delta < 0 ? 'delta-neg' : 'delta-zero'));
 
  const ctMin = 0.3, ctMax = 2.0;
  const x = 10 + (ct - ctMin) / (ctMax - ctMin) * 460;
  const yMax = parseInt(document.getElementById('bnct-y-max').textContent) * 1000;
  const y = 160 - (supply / yMax) * 160;
  const m = document.getElementById('bnct-marker');
  if (m) { m.setAttribute('cx', x); m.setAttribute('cy', y); }
}
 
/* ============================================================
   C3 — Best Achievable Yield (grouped bars)
   ============================================================ */
function initBestYield() {
  const ySlider = document.getElementById('best-yield');
  const lSlider = document.getElementById('best-yield-lines');
  const bestPct = DATA.best_yield * 100;
 
  // Set yield slider range: from current best to a reasonable ceiling (best + 1pt, capped at 99.99)
  const yieldMax = Math.min(99.99, bestPct + 1.0);
  ySlider.min = bestPct.toFixed(2);
  ySlider.max = yieldMax.toFixed(2);
  ySlider.value = bestPct.toFixed(2);
  ySlider.addEventListener('input', updateBestYield);
 
  // Set line slider range: current to current+2 (e.g., 2 → 2,3,4)
  const lineMax = DATA.n_lines + 2;
  lSlider.min = DATA.n_lines;
  lSlider.max = lineMax;
  lSlider.value = DATA.n_lines;
  lSlider.addEventListener('input', updateBestYield);
 
  document.getElementById('c3-current-best').textContent = fmt.pctNum(bestPct);
 
  // Y max: max line count × 100% yield
  const maxSupply = 7 * lineMax * DATA.base_chips_per_lot * 1.0;
  const yMax = Math.ceil(maxSupply / 20000) * 20000;
  document.getElementById('by-y-max').textContent = (yMax / 1000) + 'K';
  document.getElementById('by-y-mid').textContent = (yMax / 2000) + 'K';
 
  drawBestYieldChart(yMax);
  updateBestYield();
 
  document.getElementById('by-formula').textContent =
    `supply = 7 × N_lines × ${DATA.base_chips_per_lot} × premium_yield\ngain compounds: same Δyield × more lines = more chips`;
}
 
function drawBestYieldChart(yMax) {
  const svg = document.getElementById('by-svg');
  svg.innerHTML = '';
 
  function yFor(supply) {
    return 160 - (supply / yMax) * 160;
  }
 
  // demand line
  const demandY = yFor(DATA.demand_w6);
  svg.innerHTML += `<line x1="0" y1="${demandY}" x2="480" y2="${demandY}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3"/>`;
  svg.innerHTML += `<text x="475" y="${demandY - 5}" text-anchor="end" font-size="10" fill="var(--accent)">demand ${fmt.int(DATA.demand_w6)}</text>`;
 
  // 3 line counts: current, current+1, current+2
  const counts = [DATA.n_lines, DATA.n_lines + 1, DATA.n_lines + 2];
  const xs = [60, 200, 340];
  for (let i = 0; i < 3; i++) {
    const n = counts[i];
    const baseSupply = 7 * n * DATA.base_chips_per_lot * DATA.best_yield;
    svg.innerHTML += `<rect id="by-bar-base-${n}" x="${xs[i]}" y="${yFor(baseSupply)}" width="40" height="${160 - yFor(baseSupply)}" fill="var(--text-tertiary)"/>`;
    svg.innerHTML += `<rect id="by-bar-new-${n}" x="${xs[i] + 45}" y="${yFor(baseSupply)}" width="40" height="${160 - yFor(baseSupply)}" fill="var(--accent)"/>`;
    svg.innerHTML += `<text x="${xs[i] + 43}" y="175" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${n} lines</text>`;
  }
}
 
function updateBestYield() {
  const yieldPct = parseFloat(document.getElementById('best-yield').value);
  const nLines = parseInt(document.getElementById('best-yield-lines').value);
  document.getElementById('best-yield-out').textContent = fmt.pctNum(yieldPct);
  document.getElementById('best-yield-lines-out').textContent = nLines;
 
  const yMax = parseInt(document.getElementById('by-y-max').textContent) * 1000;
  function yFor(supply) {
    return 160 - (supply / yMax) * 160;
  }
 
  const baseSupply = Math.round(7 * nLines * DATA.base_chips_per_lot * DATA.best_yield);
  const newSupply = Math.round(7 * nLines * DATA.base_chips_per_lot * yieldPct/100);
  const gain = newSupply - baseSupply;
 
  document.getElementById('by-supply').textContent = fmt.int(newSupply);
  const gainEl = document.getElementById('by-gain');
  gainEl.textContent = fmt.signed(gain);
  gainEl.className = 'output-value small ' + (gain > 0 ? 'delta-pos' : 'delta-zero');
 
  // update bar heights for the 3 dynamic line counts
  const counts = [DATA.n_lines, DATA.n_lines + 1, DATA.n_lines + 2];
  for (const n of counts) {
    const baseS = 7 * n * DATA.base_chips_per_lot * DATA.best_yield;
    const newS = 7 * n * DATA.base_chips_per_lot * yieldPct/100;
    const baseBar = document.getElementById('by-bar-base-' + n);
    const newBar = document.getElementById('by-bar-new-' + n);
    if (baseBar && newBar) {
      const baseY = yFor(baseS);
      const newY = yFor(newS);
      baseBar.setAttribute('y', baseY);
      baseBar.setAttribute('height', 160 - baseY);
      newBar.setAttribute('y', newY);
      newBar.setAttribute('height', 160 - newY);
    }
  }
}
 
/* ============================================================
   INIT — runs after DATA loaded (called by data-loader.js)
   ============================================================ */
function init() {
  if (!DATA) return;
  derive();
  renderSection1();
  initWafer();
  initLineGrade();
  initCT();
  initLines();
  initBottleneckCT();
  initBestYield();
}