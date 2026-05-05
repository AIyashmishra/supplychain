/* ============================================================
   DATA OBJECT — single source of truth for all numbers
   Populated by parseExcel() from a user-uploaded file.
   Until a file is loaded, DATA is null and the dashboard
   shows an empty state.

   Shape (after population):
     demand_w6           : peak weekly demand (chips)
     supply_w6           : current actual weekly supply (chips)
     latest_week_label   : e.g. "W6"
     n_lines             : number of factory lines
     bottleneck_ct_days  : observed lot release cadence per line
     base_chips_per_lot  : inferred from supply/(lots×yield)
     yield_by_grade      : { GradeN: fraction }
     mix                 : { GradeN: fraction }
     stations            : ['S1', 'S2', ...]
     committed_ct        : { S1: days, ... }
     actual_ct           : { S1: days, ... }
     yield_line_grade    : { LineX: { GradeN: fraction } }
     lineB_lots_per_week : { GradeN: lots/week } (per line)
   ============================================================ */
let DATA = null;

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

  // axis labels
  svg.innerHTML += `<text x="10" y="178" font-size="10" fill="var(--text-tertiary)">${ctMin}d (faster)</text>`;
  svg.innerHTML += `<text x="470" y="178" text-anchor="end" font-size="10" fill="var(--text-tertiary)">${ctMax}d (slower) →</text>`;
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
   EXCEL PARSING
   Reads a workbook and returns a populated DATA object.
   Throws an Error with a helpful message if validation fails.
   ============================================================ */

const REQUIRED_SHEETS = {
  Supply_Demand: ['Week', 'Forecasted_Demand', 'Projected_Supply'],
  Committed_Lead_time: ['Station_ID', 'Station_Name', 'Committed_LT_Days'],
  Daily_Lot_Data: ['Lot_ID', 'Date', 'Station_ID', 'Factory_Line', 'Wafer_Quality_Grade', 'Actual_LT_Days', 'Cummulative_Yield_Percentage']
};

function validateWorkbook(wb) {
  const errors = [];
  for (const [sheetName, requiredCols] of Object.entries(REQUIRED_SHEETS)) {
    if (!wb.Sheets[sheetName]) {
      errors.push(`Missing sheet: ${sheetName}`);
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
    if (rows.length === 0) {
      errors.push(`Sheet ${sheetName} is empty`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    for (const col of requiredCols) {
      if (!cols.includes(col)) {
        errors.push(`Sheet ${sheetName} is missing column: ${col}`);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function parseWorkbook(wb) {
  validateWorkbook(wb);

  const supplyRows = XLSX.utils.sheet_to_json(wb.Sheets['Supply_Demand']);
  const ltRows = XLSX.utils.sheet_to_json(wb.Sheets['Committed_Lead_time']);
  const lotRows = XLSX.utils.sheet_to_json(wb.Sheets['Daily_Lot_Data']);

  // ---- Supply / demand: take the last row as "current peak"
  const lastSupply = supplyRows[supplyRows.length - 1];
  const demand_w6 = Number(lastSupply.Forecasted_Demand);
  const supply_w6 = Number(lastSupply.Projected_Supply);
  const latest_week_label = String(lastSupply.Week);

  // ---- Stations and committed CTs
  const stations = ltRows.map(r => String(r.Station_ID));
  const committed_ct = {};
  ltRows.forEach(r => { committed_ct[r.Station_ID] = Number(r.Committed_LT_Days); });

  // ---- Lots: derive line count, lot release cadence, yield by grade,
  //      yield by line × grade, mix, actual CT per station, base chips per lot.
  const linesSet = new Set();
  const gradesSet = new Set();
  lotRows.forEach(r => {
    linesSet.add(String(r.Factory_Line));
    gradesSet.add(String(r.Wafer_Quality_Grade));
  });
  const lines = [...linesSet].sort();
  const grades = [...gradesSet].sort();
  const n_lines = lines.length;

  // Per-station mean actual LT
  const actual_ct = {};
  stations.forEach(s => {
    const vals = lotRows
      .filter(r => String(r.Station_ID) === s)
      .map(r => Number(r.Actual_LT_Days));
    actual_ct[s] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  // Final yield per lot = S6 cumulative yield (last station)
  const lastStation = stations[stations.length - 1];
  const lotMeta = {};
  lotRows.forEach(r => {
    const lid = String(r.Lot_ID);
    if (!lotMeta[lid]) {
      lotMeta[lid] = {
        line: String(r.Factory_Line),
        grade: String(r.Wafer_Quality_Grade),
        finalYield: null
      };
    }
    if (String(r.Station_ID) === lastStation) {
      lotMeta[lid].finalYield = Number(r.Cummulative_Yield_Percentage);
    }
  });

  // Bottleneck CT inferred from S1 lot release cadence:
  // If 34 lots released over 17 days × 2 lines, that's 1 lot/day/line.
  const firstStation = stations[0];
  const s1Rows = lotRows.filter(r => String(r.Station_ID) === firstStation);
  const dates = s1Rows.map(r => new Date(r.Date)).sort((a, b) => a - b);
  const dayDiff = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24) + 1;
  const lotsPerLine = s1Rows.length / n_lines;
  const bottleneck_ct_days = dayDiff / lotsPerLine; // ~ 1 day in case data

  // Mean yield by grade
  const yield_by_grade = {};
  grades.forEach(g => {
    const yields = Object.values(lotMeta)
      .filter(m => m.grade === g && m.finalYield !== null)
      .map(m => m.finalYield);
    yield_by_grade[g] = yields.length ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;
  });

  // Mix: fraction of lots at each grade
  const totalLots = Object.keys(lotMeta).length;
  const mix = {};
  grades.forEach(g => {
    mix[g] = Object.values(lotMeta).filter(m => m.grade === g).length / totalLots;
  });

  // Yield by line × grade
  const yield_line_grade = {};
  lines.forEach(l => {
    yield_line_grade[l] = {};
    grades.forEach(g => {
      const ys = Object.values(lotMeta)
        .filter(m => m.line === l && m.grade === g && m.finalYield !== null)
        .map(m => m.finalYield);
      yield_line_grade[l][g] = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
    });
  });

  // Current mix-weighted yield (used to back-out base chips per lot)
  const current_mix_yield = grades.reduce((sum, g) => sum + (mix[g] * yield_by_grade[g]), 0);

  // Lots per week from cadence
  const lots_per_week_total = (7 / bottleneck_ct_days) * n_lines;

  // Infer base chips per lot from observed supply
  const base_chips_per_lot = Math.round(supply_w6 / (lots_per_week_total * current_mix_yield));

  // For Line × Grade widget: lots/week per line, by grade
  // (used in the supply gain calc for that widget)
  const lineB_g3_lots_per_week =
    Object.values(lotMeta).filter(m => m.line === lines[1] && m.grade === grades[grades.length - 1]).length /
    dayDiff * 7;

  return {
    demand_w6,
    supply_w6,
    latest_week_label,
    n_lines,
    bottleneck_ct_days,
    base_chips_per_lot,
    yield_by_grade,
    mix,
    stations,
    committed_ct,
    actual_ct,
    yield_line_grade,
    lineB_g3_lots_per_week,
    // For convenience in other code that uses Grade1/2/3 names:
    grades,
    lines
  };
}

/* ============================================================
   COMPATIBILITY SHIM — many widgets refer to fixed names like
   yield_by_grade.Grade1. The case data uses these names, so as
   long as the upload follows the same convention, no shim is
   needed. If grade names differ, throw a clear error.
   ============================================================ */
function checkSchemaCompatibility(d) {
  const expectedGrades = ['Grade1', 'Grade2', 'Grade3'];
  const expectedLines = ['A', 'B'];
  for (const g of expectedGrades) {
    if (!(g in d.yield_by_grade)) {
      throw new Error(`Expected wafer grade "${g}" in data, found: ${Object.keys(d.yield_by_grade).join(', ')}`);
    }
  }
  for (const l of expectedLines) {
    if (!(l in d.yield_line_grade)) {
      throw new Error(`Expected factory line "${l}" in data, found: ${Object.keys(d.yield_line_grade).join(', ')}`);
    }
  }
}

/* ============================================================
   FILE LOADING — wires upload events, parses, populates DATA,
   re-runs init(), and shows status messages.
   ============================================================ */
function loadFromArrayBuffer(buf, sourceLabel) {
  try {
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const parsed = parseWorkbook(wb);
    checkSchemaCompatibility(parsed);
    DATA = parsed;
    init();
    showStatus('success', `Loaded ${sourceLabel}. ${Object.keys(parsed.yield_by_grade).length} grades, ${parsed.n_lines} lines, ${parsed.stations.length} stations.`);
  } catch (err) {
    showStatus('error', `Could not load ${sourceLabel}.`, err.message);
    console.error(err);
  }
}

function showStatus(kind, msg, detail) {
  const el = document.getElementById('upload-status');
  el.style.display = 'block';
  el.className = 'upload-status ' + kind;
  el.innerHTML = msg + (detail ? `<pre>${detail.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>` : '');
}

function handleFileInput(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => loadFromArrayBuffer(e.target.result, file.name);
  reader.onerror = () => showStatus('error', 'File read failed.');
  reader.readAsArrayBuffer(file);
}

/* Sample data is base64-encoded inside the file so it works fully offline. */
const SAMPLE_B64 = "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";

function loadSampleData() {
  try {
    const binary = atob(SAMPLE_B64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    loadFromArrayBuffer(bytes.buffer, 'sample data (HeliosCore_PMCase_Data.xlsx)');
  } catch (err) {
    showStatus('error', 'Could not decode sample data.', err.message);
  }
}

/* ============================================================
   BOOT
   ============================================================ */
function init() {
  if (!DATA) return; // empty state — nothing to render until a file loads
  derive();
  renderSection1();
  initWafer();
  initLineGrade();
  initCT();
  initLines();
  initBottleneckCT();
  initBestYield();
}

function bootUploadUI() {
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('upload-zone');

  fileInput.addEventListener('change', (e) => handleFileInput(e.target.files[0]));

  // Drag-and-drop
  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });
  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileInput(e.dataTransfer.files[0]);
    }
  });

  // Auto-load sample on first boot so the dashboard shows something.
  // (User can re-load with their own file at any time.)
  loadSampleData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootUploadUI);
} else {
  bootUploadUI();
}
