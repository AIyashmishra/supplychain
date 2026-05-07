/* =============================================================
   dashboard.js — Data dashboard rendering
   New flow (story-first):
     01 SUMMARY                  — demand vs supply, total/perf/cap gap
     02 STRUCTURAL CEILING       — peak supply callout w/ formula
     03 NEW LINES                — projection chart at +1, +2 lines
     04 LEVERS                   — preview of additional improvements
     05 MANUFACTURING            — 4 charts, each with summary + rec
   ============================================================= */

const SVG_W = 600;

/* ============================================================
   Reusable: Summary + Recommendation widget pair
   ============================================================ */
function renderChartWidgets(summaryHtml, recHtml) {
  return `
    <div class="widget-pair">
      <div class="widget-summary">
        <span class="widget-tag">Summary</span>
        ${summaryHtml}
      </div>
      <div class="widget-recommendation">
        <span class="widget-tag">Recommendation</span>
        ${recHtml}
      </div>
    </div>
  `;
}

/* ============================================================
   SECTION 01 — SUMMARY METRICS
   ============================================================ */
function renderSection1() {
  const D = window.DATA;
  const total_gap = D.demand_w6 - D.supply_w6;
  const perf_gap = Math.max(0, D.peak_supply - D.supply_w6);
  const cap_gap  = Math.max(0, D.demand_w6 - D.peak_supply);
  const total = perf_gap + cap_gap;
  const perf_pct = total ? (perf_gap / total) : 0;
  const cap_pct  = total ? (cap_gap / total) : 0;

  const html = `
    <div class="summary-grid">
      <div class="tile">
        <div class="tile-row">
          <div class="tile-label"><span class="dfn" title="Forecasted weekly demand at peak (latest week in the data).">DEMAND</span></div>
          <button class="info-btn" title="Forecasted weekly demand at the latest week in the data — represents peak launch demand.">ⓘ</button>
        </div>
        <div class="tile-value">${fmt(D.demand_w6)}</div>
        <div class="tile-sub">chips/week · ${D.weeks[D.weeks.length - 1]} peak</div>
      </div>
      <div class="tile">
        <div class="tile-row">
          <div class="tile-label"><span class="dfn" title="Current observed weekly supply.">SUPPLY</span></div>
          <button class="info-btn" title="Current observed weekly output — what the factory is actually shipping.">ⓘ</button>
        </div>
        <div class="tile-value">${fmt(D.supply_w6)}</div>
        <div class="tile-sub">chips/week · ${D.weeks[D.weeks.length - 1]} actual</div>
      </div>
    </div>

    <div class="total-gap-block">
      <div class="tile-row">
        <div>
          <div class="tile-label"><span class="dfn" title="Headline shortfall — demand minus actual supply.">TOTAL GAP</span></div>
          <div class="tile-value warn">${fmt(total_gap)}</div>
          <div class="tile-sub">chips/week unmet at peak</div>
        </div>
        <button class="info-btn" title="Total weekly shortfall. Splits into a small recoverable piece (performance) and a large structural piece (capacity).">ⓘ</button>
      </div>
      <div class="gap-children">
        <div class="gap-child">
          <div class="tile-row">
            <div class="tile-label"><span class="dfn" title="Recoverable through process and procurement levers.">PERFORMANCE GAP</span></div>
            <button class="info-btn" title="Difference between current supply and the theoretical peak with current lines. Recoverable through cycle-time fixes and yield improvements.">ⓘ</button>
          </div>
          <div class="tile-value">${fmt(perf_gap)}</div>
          <div class="tile-sub">chips/week · ${fmtPct(perf_pct, 0)} of total gap</div>
        </div>
        <div class="gap-child">
          <div class="tile-row">
            <div class="tile-label"><span class="dfn" title="Structural — only closeable by adding factory capacity.">CAPACITY GAP</span></div>
            <button class="info-btn" title="Demand that exceeds the peak ceiling of the current factory. Cannot be closed by any execution lever — only by adding lines.">ⓘ</button>
          </div>
          <div class="tile-value accent">${fmt(cap_gap)}</div>
          <div class="tile-sub">chips/week · ${fmtPct(cap_pct, 0)} of total gap</div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('summary-content').innerHTML = html;
}

/* ============================================================
   SECTION 02 — STRUCTURAL CEILING (peak supply callout)
   ============================================================ */
function renderSection2_PeakCeiling() {
  const D = window.DATA;
  const peak = Math.round(D.peak_supply);
  const structural_gap = Math.max(0, D.demand_w6 - peak);
  const lots_per_week_total = D.lots_per_week_per_line * D.n_lines;
  const best_yield_pct = D.best_yield;
  const last_week = D.weeks[D.weeks.length - 1];

  const formula =
    `Peak supply = lots/week × chips/lot × best yield\n` +
    `            = ${lots_per_week_total.toFixed(1)} × ${fmt(D.base_chips_per_lot)} × ${best_yield_pct.toFixed(2)}%\n` +
    `            = ${fmt(peak)} chips/week\n\n` +
    `${last_week} demand                     = ${fmt(D.demand_w6)}\n` +
    `Structural gap (${fmt(D.demand_w6)} − ${fmt(peak)}) = ${fmt(structural_gap)} chips/week`;

  const gapK = Math.round(structural_gap / 1000);

  const html = `
    <div class="peak-ceiling">
      <h3 class="peak-ceiling-headline">Even at peak performance, we miss ${last_week} demand by ~${gapK}k chips/week.</h3>
      <p class="peak-ceiling-intro">If every station hit its committed SLA and every lot ran at best-ever yield, the current ${D.n_lines} lines top out here. This is the ceiling — not a target.</p>
      <div class="peak-ceiling-row">
        <div class="peak-ceiling-number">
          <div class="tile-label">PEAK SUPPLY · ${D.n_lines} LINES</div>
          <div class="tile-value">${fmt(peak)}</div>
          <div class="tile-sub">chips/week ceiling</div>
        </div>
        <div class="peak-ceiling-formula">${formula}</div>
      </div>
      <p class="peak-ceiling-close">This isn't a performance gap. It's a capacity gap. <strong>We need new lines.</strong></p>
    </div>
  `;
  document.getElementById('peak-ceiling-content').innerHTML = html;
}

/* ============================================================
   SECTION 03 — NEW LINES PROJECTION
   ============================================================ */
function renderSection3_LinesProjection() {
  const D = window.DATA;
  const W = SVG_W, H = 280;
  const m = { t: 30, r: 110, b: 36, l: 55 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;

  const peakPerLine = D.peak_supply / D.n_lines;
  const peak2 = D.peak_supply;          // current 2 lines
  const peak3 = peakPerLine * (D.n_lines + 1); // +1 line
  const peak4 = peakPerLine * (D.n_lines + 2); // +2 lines

  const xVals = D.weeks;
  const maxY = Math.max(...D.demand_weekly, peak4) * 1.1;
  const xStep = innerW / (xVals.length - 1);
  const yScale = v => m.t + innerH - (v / maxY) * innerH;

  const demandPath = D.demand_weekly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m.l + i * xStep} ${yScale(v)}`).join(' ');

  const flatLine = (v, dashClass) => {
    const y = yScale(v);
    return `<line x1="${m.l}" x2="${m.l + innerW}" y1="${y}" y2="${y}" class="${dashClass}" />`;
  };

  // Crossover for +2 lines vs demand
  let crossover = '';
  for (let i = 1; i < D.demand_weekly.length; i++) {
    const v0 = D.demand_weekly[i - 1];
    const v1 = D.demand_weekly[i];
    if (v0 <= peak4 && v1 > peak4) {
      const t = (peak4 - v0) / (v1 - v0);
      const crossX = m.l + (i - 1 + t) * xStep;
      const crossY = yScale(peak4);
      crossover = `
        <line stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="2 2" x1="${crossX}" x2="${crossX}" y1="${crossY}" y2="${m.t + innerH}" />
        <circle cx="${crossX}" cy="${crossY}" r="3" fill="var(--accent)" />
        <text class="chart-tag" x="${crossX + 4}" y="${crossY - 6}">+2 LINES CROSSES DEMAND</text>
      `;
      break;
    }
  }

  const tickStep = Math.ceil(maxY / 5 / 10000) * 10000;
  let ticks = [];
  for (let y = 0; y <= maxY; y += tickStep) ticks.push(y);
  const gridlines = ticks.map(t => `<line class="chart-grid" x1="${m.l}" x2="${m.l + innerW}" y1="${yScale(t)}" y2="${yScale(t)}" />`).join('');
  const yLabels = ticks.map(t => `<text class="chart-axis-text" x="${m.l - 8}" y="${yScale(t) + 3}" text-anchor="end">${(t/1000)}K</text>`).join('');
  const xLabels = xVals.map((w, i) => `<text class="chart-axis-text" x="${m.l + i * xStep}" y="${m.t + innerH + 18}" text-anchor="middle">${w}</text>`).join('');

  const rightLabel = (v, label, color) =>
    `<text class="chart-axis-text" x="${m.l + innerW + 5}" y="${yScale(v) + 3}" fill="${color}">${label}</text>`;

  const lastIdx = xVals.length - 1;
  const w_last_demand = D.demand_weekly[lastIdx];

  const peak3_gap_at_end = Math.max(0, w_last_demand - peak3);
  const peak4_headroom = peak4 - w_last_demand;

  // Find where peak3 stops covering demand
  let peak3_covers_until = xVals[lastIdx];
  for (let i = 0; i < D.demand_weekly.length; i++) {
    if (D.demand_weekly[i] > peak3) {
      peak3_covers_until = i > 0 ? xVals[i - 1] : 'before ' + xVals[0];
      break;
    }
  }

  const summaryHtml = `A third line lifts the ceiling to <strong>${fmt(Math.round(peak3))} chips/week</strong> — clears demand through ${peak3_covers_until} but falls <strong>${fmt(Math.round(peak3_gap_at_end))} short</strong> by ${xVals[lastIdx]}.`;
  const recHtml = `Stand up a fourth line — keeps supply above demand all ${xVals.length} weeks, with <strong>~${fmt(Math.round(peak4_headroom))} chips/week of headroom</strong> by ${xVals[lastIdx]}.`;

  const html = `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h3 class="chart-title">Peak supply with +1 and +2 lines vs. demand</h3>
          <p class="chart-sub">Each new line, running at peak performance, adds ~${fmt(Math.round(peakPerLine))} chips/week of ceiling. Demand (blue) is the actual ${xVals[0]}–${xVals[lastIdx]} forecast.</p>
        </div>
        <button class="info-btn" title="The three flat lines represent peak supply — the structural ceiling — at 2 lines (today), 3 lines (+1), and 4 lines (+2). Each is computed as lots/week × chips/lot × best yield, scaled by the line count. The blue rising line is forecasted demand. Where demand crosses any peak line, that scenario stops covering demand.">ⓘ</button>
      </div>
      <div class="chart-svg-wrap">
        <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${gridlines}
          ${yLabels}
          ${xLabels}
          ${flatLine(peak2, 'chart-line-peak')}
          ${flatLine(peak3, 'chart-line-peak')}
          <line x1="${m.l}" x2="${m.l + innerW}" y1="${yScale(peak4)}" y2="${yScale(peak4)}" stroke="var(--text-primary)" stroke-width="1.5" fill="none" />
          <path class="chart-line-demand" d="${demandPath}" />
          ${rightLabel(peak2, '2 lines · ' + (peak2/1000).toFixed(1) + 'K', 'var(--text-tertiary)')}
          ${rightLabel(peak3, '+1 line · ' + (peak3/1000).toFixed(1) + 'K', 'var(--text-tertiary)')}
          ${rightLabel(peak4, '+2 lines · ' + (peak4/1000).toFixed(1) + 'K', 'var(--text-primary)')}
          ${crossover}
        </svg>
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="legend-swatch demand"></span>Demand (forecast)</div>
        <div class="chart-legend-item"><span class="legend-swatch peak"></span>Peak supply · 2 lines &amp; +1 line</div>
        <div class="chart-legend-item"><span class="legend-swatch supply"></span>Peak supply · +2 lines</div>
      </div>
      ${renderChartWidgets(summaryHtml, recHtml)}
    </div>
  `;
  document.getElementById('lines-projection-content').innerHTML = html;
}

/* ============================================================
   SECTION 04 — LEVERS (preview of in-factory improvements)
   ============================================================ */
function computeLevers(D) {
  // Lever 1: worst-slip station
  let worstSlipStation = null;
  let worstSlipPct = 0;
  let worstSlipDays = 0;
  D.stations.forEach(s => {
    const mean = D.station_ct_mean[s];
    const spec = D.committed_ct[s];
    const slipDays = mean - spec;
    const slipPct = slipDays / spec * 100;
    if (slipPct > worstSlipPct) {
      worstSlipPct = slipPct;
      worstSlipStation = s;
      worstSlipDays = slipDays;
    }
  });
  const totalSlipDays = D.stations.reduce(
    (sum, s) => sum + Math.max(0, D.station_ct_mean[s] - D.committed_ct[s]),
    0
  );

  // Lever 2: worst line × grade yield cell
  let worstCell = null;
  let worstY = 100;
  D.lines.forEach(l => {
    D.grades.forEach(g => {
      const y = D.yield_line_grade[l][g];
      if (y > 0 && y < worstY) {
        worstY = y;
        worstCell = { line: l, grade: g, yield: y };
      }
    });
  });
  const otherYields = [];
  D.lines.forEach(l => D.grades.forEach(g => {
    if (!(l === worstCell.line && g === worstCell.grade)) {
      otherYields.push(D.yield_line_grade[l][g]);
    }
  }));
  const targetY = otherYields.reduce((a, b) => a + b, 0) / otherYields.length;
  const lots_per_week_total = D.lots_per_week_per_line * D.n_lines;
  const cellShare = (1 / D.n_lines) * (D.mix[worstCell.grade] || 0);
  const yieldDeltaPct = (targetY - worstY) / 100;
  const yieldUpside = lots_per_week_total * cellShare * D.base_chips_per_lot * yieldDeltaPct;

  // Lever 3: line with highest share of worst grade
  const worstGrade = Object.keys(D.yield_by_grade).reduce((a, b) =>
    D.yield_by_grade[a] < D.yield_by_grade[b] ? a : b);
  const lineGradeShares = {};
  D.lines.forEach(l => {
    let lineTotalLots = 0;
    let lineWorstGradeLots = 0;
    D.grades.forEach(g => {
      const n = D.yield_line_grade_n[l][g] || 0;
      lineTotalLots += n;
      if (g === worstGrade) lineWorstGradeLots = n;
    });
    lineGradeShares[l] = lineTotalLots ? lineWorstGradeLots / lineTotalLots : 0;
  });
  const worstMixLine = Object.keys(lineGradeShares).reduce((a, b) =>
    lineGradeShares[a] > lineGradeShares[b] ? a : b);
  const worstMixLineShare = lineGradeShares[worstMixLine];
  const otherLineShares = D.lines.filter(l => l !== worstMixLine).map(l => lineGradeShares[l]);
  const avgOtherShare = otherLineShares.length
    ? otherLineShares.reduce((a, b) => a + b, 0) / otherLineShares.length
    : 0;
  const shareReduction = Math.max(0, worstMixLineShare - avgOtherShare);
  const worstLineWorstGradeY = D.yield_line_grade[worstMixLine][worstGrade] || 0;
  const otherGradeYs = D.grades.filter(g => g !== worstGrade).map(g => D.yield_line_grade[worstMixLine][g] || 0);
  const meanOtherY = otherGradeYs.reduce((a, b) => a + b, 0) / otherGradeYs.length;
  const lineYieldGainPp = shareReduction * (meanOtherY - worstLineWorstGradeY);

  return {
    bottleneck: { station: worstSlipStation, slipDays: worstSlipDays, slipPct: worstSlipPct, totalSlipDays },
    yieldCell: { ...worstCell, target: targetY, upside: yieldUpside },
    mixShift: { line: worstMixLine, grade: worstGrade, share: worstMixLineShare, gainPp: lineYieldGainPp }
  };
}

function renderSection4_Levers() {
  const D = window.DATA;
  const L = computeLevers(D);

  const html = `
    <div class="lever-grid">
      <div class="lever-card">
        <div class="lever-card-tag">Lever 01 · Bottleneck</div>
        <div class="lever-card-name">Fix Station ${L.bottleneck.station} cycle time</div>
        <p class="lever-card-text">Station ${L.bottleneck.station} runs ${L.bottleneck.slipPct.toFixed(0)}% over its committed SLA — the worst slip across all stations.</p>
        <div class="lever-card-upside">~${L.bottleneck.totalSlipDays.toFixed(1)} days off end-to-end cycle</div>
      </div>
      <div class="lever-card">
        <div class="lever-card-tag">Lever 02 · Yield</div>
        <div class="lever-card-name">Lift Line ${L.yieldCell.line} × ${L.yieldCell.grade} yield</div>
        <p class="lever-card-text">Line ${L.yieldCell.line} × ${L.yieldCell.grade} yields only ${L.yieldCell.yield.toFixed(1)}% — every other line/grade combo is above ${(L.yieldCell.target - 1).toFixed(0)}%.</p>
        <div class="lever-card-upside">+${fmt(Math.round(L.yieldCell.upside))} chips/week</div>
      </div>
      <div class="lever-card">
        <div class="lever-card-tag">Lever 03 · Mix shift</div>
        <div class="lever-card-name">Rebalance Line ${L.mixShift.line} mix</div>
        <p class="lever-card-text">Line ${L.mixShift.line} runs ${(L.mixShift.share * 100).toFixed(0)}% of its volume as ${L.mixShift.grade} — the lowest-yielding grade. Rebalance toward higher grades.</p>
        <div class="lever-card-upside">+${L.mixShift.gainPp.toFixed(1)}pp on Line ${L.mixShift.line} yield</div>
      </div>
    </div>
  `;
  document.getElementById('levers-content').innerHTML = html;
}

/* ============================================================
   SECTION 05 — MANUFACTURING PERFORMANCE (existing 4 charts + widgets)
   ============================================================ */
function renderSection5_Manufacturing() {
  const D = window.DATA;
  const L = computeLevers(D);

  const html = `
    ${chartCard_DemandSupply(D, L)}
    ${chartCard_StationCT(D, L)}
    ${heatmap_YieldLineGrade(D, L)}
    ${tile_LotsPerLine(D, L)}
  `;
  document.getElementById('mfg-content').innerHTML = html;
}

// ---- Chart 5.1: Demand vs. Supply line chart ----
function chartCard_DemandSupply(D, L) {
  const W = SVG_W, H = 240;
  const m = { t: 20, r: 60, b: 30, l: 50 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;

  const xVals = D.weeks;
  const maxY = Math.max(...D.demand_weekly, ...D.supply_weekly) * 1.1;
  const xStep = innerW / (xVals.length - 1);
  const yScale = v => m.t + innerH - (v / maxY) * innerH;

  const demandPath = D.demand_weekly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m.l + i * xStep} ${yScale(v)}`).join(' ');
  const supplyPath = D.supply_weekly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m.l + i * xStep} ${yScale(v)}`).join(' ');

  const tickStep = Math.ceil(maxY / 5 / 10000) * 10000;
  let ticks = [];
  for (let y = 0; y <= maxY; y += tickStep) ticks.push(y);

  const gridlines = ticks.map(t => `<line class="chart-grid" x1="${m.l}" x2="${m.l + innerW}" y1="${yScale(t)}" y2="${yScale(t)}" />`).join('');
  const yLabels = ticks.map(t => `<text class="chart-axis-text" x="${m.l - 8}" y="${yScale(t) + 3}" text-anchor="end">${(t/1000)}K</text>`).join('');
  const xLabels = xVals.map((w, i) => `<text class="chart-axis-text" x="${m.l + i * xStep}" y="${m.t + innerH + 18}" text-anchor="middle">${w}</text>`).join('');

  const lastIdx = xVals.length - 1;
  const lastDemandY = yScale(D.demand_weekly[lastIdx]);
  const lastSupplyY = yScale(D.supply_weekly[lastIdx]);
  const gapAtLast = D.demand_weekly[lastIdx] - D.supply_weekly[lastIdx];

  const demandGrowth = (D.demand_weekly[lastIdx] - D.demand_weekly[0]) / lastIdx;
  const supplyGrowth = (D.supply_weekly[lastIdx] - D.supply_weekly[0]) / lastIdx;

  const summaryHtml = `Demand grows <strong>~${fmt(Math.round(demandGrowth))}/week</strong> while supply grows only <strong>~${fmt(Math.round(supplyGrowth))}/week</strong> — the gap widens every week.`;
  const recHtml = `Trajectory doesn't close on its own. <strong>Structural intervention required</strong> — see Sections 03 and 04.`;

  return `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h3 class="chart-title">Weekly demand vs. observed supply</h3>
          <p class="chart-sub">Demand rises from ${fmt(D.demand_weekly[0])} to ${fmt(D.demand_weekly[lastIdx])} over ${xVals.length} weeks; supply stays roughly flat.</p>
        </div>
        <button class="info-btn" title="Two lines: blue = forecasted weekly demand, black = observed weekly supply. The widening gap between them is the headline problem.">ⓘ</button>
      </div>
      <div class="chart-svg-wrap">
        <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${gridlines}
          ${yLabels}
          ${xLabels}
          <path class="chart-line-supply" d="${supplyPath}" />
          <path class="chart-line-demand" d="${demandPath}" />
          ${D.demand_weekly.map((v, i) => {
            const cx = m.l + i * xStep;
            const cy = yScale(v);
            const supVal = D.supply_weekly[i];
            const supY = yScale(supVal);
            const week = D.weeks[i];
            const gap = v - supVal;
            const tipHtml = `<div class="hover-tip-title">${week}</div>` +
              tipRow('Demand', fmt(v), true) +
              tipRow('Supply', fmt(supVal)) +
              tipRow('Gap', fmt(gap));
            const tipAttr = tipHtml.replace(/"/g, '&quot;');
            return `
              <circle cx="${cx}" cy="${cy}" r="3" fill="var(--accent)" style="pointer-events:none" />
              <circle cx="${cx}" cy="${supY}" r="3" fill="var(--text-primary)" style="pointer-events:none" />
              <rect class="chart-hover-zone" x="${cx - xStep/2}" y="${m.t}" width="${xStep}" height="${innerH}" data-tip="${tipAttr}" />
            `;
          }).join('')}
          <text class="chart-value-label" x="${m.l + lastIdx * xStep + 6}" y="${lastDemandY + 4}">${fmt(D.demand_weekly[lastIdx])}</text>
          <text class="chart-value-label" x="${m.l + lastIdx * xStep + 6}" y="${lastSupplyY + 4}">${fmt(D.supply_weekly[lastIdx])}</text>
        </svg>
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="legend-swatch demand"></span>Demand</div>
        <div class="chart-legend-item"><span class="legend-swatch supply"></span>Supply</div>
        <div class="chart-legend-item" style="margin-left:auto;color:var(--warn);">Gap at ${xVals[lastIdx]}: ${fmt(gapAtLast)}</div>
      </div>
      ${renderChartWidgets(summaryHtml, recHtml)}
    </div>
  `;
}

// ---- Chart 5.2: Lead time by station (table) ----
function chartCard_StationCT(D, L) {
  const stations = D.stations;

  const nVals = stations.map(s => D.station_ct_n[s]);
  const specVals = stations.map(s => D.committed_ct[s]);
  const nUniform = nVals.every(n => n === nVals[0]);
  const specUniform = specVals.every(s => s === specVals[0]);

  const subtitleParts = [];
  if (nUniform) subtitleParts.push(`Based on ${nVals[0]} observed lots per station`);
  if (specUniform) subtitleParts.push(`spec is ${specVals[0]} day per station`);
  const subtitle = subtitleParts.length > 0
    ? subtitleParts.join('; ') + '.'
    : 'Median, mean, and range of observed lead times per station.';

  const rows = stations.map(s => {
    const median = D.station_ct_median[s];
    const mean = D.station_ct_mean[s];
    const minV = D.station_ct_min[s];
    const maxV = D.station_ct_max[s];
    const spec = D.committed_ct[s];
    const slip = median > spec + 0.01;
    const slipPct = ((median - spec) / spec * 100);

    const statusLabel = slip
      ? `Slipping +${slipPct.toFixed(0)}%`
      : 'At spec';

    return `
      <tr>
        <td class="station">${s}</td>
        <td class="num">${median.toFixed(2)}</td>
        <td class="num">${mean.toFixed(2)}</td>
        <td class="num">${minV.toFixed(2)}</td>
        <td class="num">${maxV.toFixed(2)}</td>
        ${specUniform ? '' : `<td class="num">${spec.toFixed(1)}</td>`}
        <td><span class="status-pill ${slip ? 'slip' : ''}">${statusLabel}</span></td>
      </tr>
    `;
  }).join('');

  const specCol = specUniform ? '' : '<th class="num">SPEC (d)</th>';

  const summaryHtml = `<strong>Station ${L.bottleneck.station}</strong> runs <strong>+${L.bottleneck.slipPct.toFixed(0)}%</strong> over committed (${D.station_ct_mean[L.bottleneck.station].toFixed(1)} vs ${D.committed_ct[L.bottleneck.station]} days) — the worst slip of any station.`;
  const recHtml = `Fix Station ${L.bottleneck.station} first — closing all station slip saves <strong>~${L.bottleneck.totalSlipDays.toFixed(1)} days</strong> off end-to-end cycle time.`;

  return `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h3 class="chart-title">Lead time by station</h3>
          <p class="chart-sub">${subtitle}</p>
        </div>
        <button class="info-btn" title="Each row is one station. Median = the middle value of observed lead times. Mean = the arithmetic average. Min/Max = the range of observed values. SLIPPING tag if the median exceeds the committed spec.">ⓘ</button>
      </div>
      <table class="lt-table">
        <thead>
          <tr>
            <th>STATION</th>
            <th class="num">MEDIAN (d)</th>
            <th class="num">MEAN (d)</th>
            <th class="num">MIN (d)</th>
            <th class="num">MAX (d)</th>
            ${specCol}
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ${renderChartWidgets(summaryHtml, recHtml)}
    </div>
  `;
}

// ---- Chart 5.3: Yield by line × grade heatmap ----
function heatmap_YieldLineGrade(D, L) {
  const allYields = [];
  D.lines.forEach(l => D.grades.forEach(g => allYields.push(D.yield_line_grade[l][g])));
  const dataMin = Math.min(...allYields);
  const dataMax = Math.max(...allYields);
  const pad = Math.max(0.5, (dataMax - dataMin) * 0.1);
  const lo = Math.max(0, dataMin - pad);
  const hi = Math.min(100, dataMax + pad);

  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgbStr(r, g, b, a) { return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`; }
  const colorFor = v => {
    const t = hi === lo ? 0.5 : Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    let r, g, b;
    if (t < 0.5) {
      const u = t * 2;
      r = lerp(186, 24, u);
      g = lerp(117, 95, u);
      b = lerp(23, 165, u);
    } else {
      const u = (t - 0.5) * 2;
      r = lerp(24, 95, u);
      g = lerp(95, 110, u);
      b = lerp(165, 86, u);
    }
    return rgbStr(r, g, b, 0.32);
  };

  const cells = [];
  cells.push(`<div class="heatmap-row-label"></div>`);
  D.grades.forEach(g => {
    cells.push(`<div class="heatmap-col-label">${g.toUpperCase()}</div>`);
  });
  D.lines.forEach(l => {
    cells.push(`<div class="heatmap-row-label">Line ${l}</div>`);
    D.grades.forEach(g => {
      const v = D.yield_line_grade[l][g];
      const n = D.yield_line_grade_n[l][g];
      const tipHtml = `<div class="hover-tip-title">Line ${l} · ${g}</div>` +
        tipRow('Yield', v.toFixed(2) + '%', true) +
        tipRow('Sample size', n + ' lots') +
        tipRow('Range', dataMin.toFixed(2) + '%–' + dataMax.toFixed(2) + '%');
      const tipAttr = tipHtml.replace(/"/g, '&quot;');
      cells.push(`<div class="heatmap-cell" style="background:${colorFor(v)}" data-tip="${tipAttr}">${v.toFixed(2)}%</div>`);
    });
  });

  const summaryHtml = `<strong>Line ${L.yieldCell.line} × ${L.yieldCell.grade}</strong> sits at <strong>${L.yieldCell.yield.toFixed(1)}%</strong> — every other cell is above ${(L.yieldCell.target - 1).toFixed(0)}%.`;
  const recHtml = `Fix the Line ${L.yieldCell.line} × ${L.yieldCell.grade} process — <strong>+${fmt(Math.round(L.yieldCell.upside))} chips/week</strong> at current mix.`;

  return `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h3 class="chart-title">Yield by line × wafer grade</h3>
          <p class="chart-sub">Yield per line × grade combination. Cell color shades by yield level (range: ${dataMin.toFixed(1)}%–${dataMax.toFixed(1)}%).</p>
        </div>
        <button class="info-btn" title="Each cell is the yield (S6 cumulative) for that line × wafer-grade combination, averaged across all observed lots. Color shading is rescaled to the actual data range so differences pop. Hover a cell to see exact value and sample size.">ⓘ</button>
      </div>
      <div class="heatmap">${cells.join('')}</div>
      ${renderChartWidgets(summaryHtml, recHtml)}
    </div>
  `;
}

// ---- Chart 5.4: Capacity utilization by line ----
function tile_LotsPerLine(D, L) {
  const expected = D.lots_per_week_per_line;
  const lineUtils = D.lines.map(l => ({ l, util: D.lots_per_week_per_line_obs[l] / expected * 100 }));
  const tiles = D.lines.map(l => {
    const obs = D.lots_per_week_per_line_obs[l];
    const utilPct = obs / expected * 100;
    const utilDisplay = utilPct.toFixed(0) + '%';
    const valueClass = utilPct < 95 ? 'tile-value warn' : 'tile-value';
    return `
      <div class="tile">
        <div class="tile-row">
          <div class="tile-label">LINE ${l} · UTILIZATION</div>
          <button class="info-btn" title="Capacity utilization for Line ${l}: observed lots per week ÷ expected cadence (one lot per day per line). Lines below 95% have measurable downtime or scheduling drift.">ⓘ</button>
        </div>
        <div class="${valueClass}">${utilDisplay}</div>
        <div class="tile-sub">${obs.toFixed(1)} of ${expected.toFixed(1)} lots/week</div>
      </div>
    `;
  }).join('');

  const utilSpread = Math.max(...lineUtils.map(x => x.util)) - Math.min(...lineUtils.map(x => x.util));
  const balanced = utilSpread < 5;
  const summaryHtml = balanced
    ? `Lines ${D.lines.join(' and ')} run at <strong>matched cadence</strong> — utilization spread is only ${utilSpread.toFixed(1)} points.`
    : `Utilization spread is <strong>${utilSpread.toFixed(0)} points</strong> — lines are running unevenly.`;
  const recHtml = balanced
    ? `No action — line balance is healthy. <strong>Focus levers elsewhere</strong> (bottleneck, yield, mix).`
    : `Investigate the slower line for downtime or scheduling drift — equalizing buys back the throughput delta.`;

  return `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h3 class="chart-title">Capacity utilization by line</h3>
          <p class="chart-sub">Observed lots per week as a percentage of the expected cadence (one lot per day per line). Anything under 100% is capacity left on the table.</p>
        </div>
        <button class="info-btn" title="Each line's expected output is one lot per day, so 7 lots per week. Utilization = observed lots/week ÷ 7. A line at 100% is running at full theoretical cadence; anything less is a finding worth investigating.">ⓘ</button>
      </div>
      <div class="lots-grid">${tiles}</div>
      ${renderChartWidgets(summaryHtml, recHtml)}
    </div>
  `;
}

/* ============================================================
   INIT — runs after DATA loaded
   ============================================================ */
function init() {
  if (!window.DATA) return;
  renderSection1();
  renderSection2_PeakCeiling();
  renderSection3_LinesProjection();
  renderSection4_Levers();
  renderSection5_Manufacturing();
}