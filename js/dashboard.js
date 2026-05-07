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
          <p class="gap-child-explainer">The gap between today's actual supply and what the current factory <em>could</em> produce at peak performance. Closeable by fixing yield and cycle-time slippage.</p>
        </div>
        <div class="gap-child">
          <div class="tile-row">
            <div class="tile-label"><span class="dfn" title="Structural — only closeable by adding factory capacity.">CAPACITY GAP</span></div>
            <button class="info-btn" title="Demand that exceeds the peak ceiling of the current factory. Cannot be closed by any execution lever — only by adding lines.">ⓘ</button>
          </div>
          <div class="tile-value accent">${fmt(cap_gap)}</div>
          <div class="tile-sub">chips/week · ${fmtPct(cap_pct, 0)} of total gap</div>
          <p class="gap-child-explainer">Demand that exceeds the factory's ceiling — even at flawless performance. Only closeable by adding new production lines.</p>
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
  const W = SVG_W, H = 320;
  const m = { t: 30, r: 90, b: 50, l: 55 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;

  // Peak supply at 2/3/4 lines (steady-state, same every week)
  const peakPerLine = D.peak_supply / D.n_lines;
  const peak2 = D.peak_supply;
  const peak3 = peakPerLine * (D.n_lines + 1);
  const peak4 = peakPerLine * (D.n_lines + 2);

  const xVals = D.weeks;
  const lastIdx = xVals.length - 1;
  const w_last_demand = D.demand_weekly[lastIdx];

  // Y scale — needs to fit highest of demand or peak4
  const maxY = Math.max(...D.demand_weekly, peak4) * 1.1;
  const yScale = v => m.t + innerH - (v / maxY) * innerH;

  // X layout: each week is a "group" containing 3 thin bars side-by-side
  const groupW = innerW / xVals.length;        // total width per week
  const groupPad = groupW * 0.18;              // padding around the 3-bar cluster
  const barAreaW = groupW - 2 * groupPad;
  const barW = barAreaW / 3 * 0.85;            // each bar's width (with small gap)
  const barGap = (barAreaW - 3 * barW) / 2;
  const groupX = i => m.l + i * groupW + groupPad;

  // Draw 3 bars per week
  const barColors = {
    p2: 'var(--text-tertiary)',     // grey — today's baseline
    p3: '#7aa9d6',                  // light accent — better
    p4: 'var(--accent)'             // solid accent — the answer
  };

  const bars = xVals.map((week, i) => {
    const baseX = groupX(i);
    const yBottom = m.t + innerH;
    const drawBar = (xOffset, value, color, key) => {
      const x = baseX + xOffset;
      const y = yScale(value);
      const h = yBottom - y;
      const tipHtml = `<div class="hover-tip-title">${week} · ${key}</div>` +
        tipRow(key, fmt(Math.round(value)), true) +
        tipRow('Demand', fmt(D.demand_weekly[i])) +
        tipRow('Gap', fmt(D.demand_weekly[i] - Math.round(value)));
      const tipAttr = tipHtml.replace(/"/g, '&quot;');
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" data-tip="${tipAttr}" rx="1" />`;
    };
    return [
      drawBar(0, peak2, barColors.p2, '2 lines'),
      drawBar(barW + barGap, peak3, barColors.p3, '+1 line (3 lines)'),
      drawBar(2 * (barW + barGap), peak4, barColors.p4, '+2 lines (4 lines)')
    ].join('');
  }).join('');

  // Demand reference: one continuous stepped line across all weeks (each week
  // is a horizontal segment at that week's demand value, vertical risers between
  // weeks). Single value label at the right edge so the chart isn't crowded.
  let demandPath = '';
  xVals.forEach((week, i) => {
    const baseX = groupX(i) - groupPad * 0.4;
    const segW = groupW - groupPad * 0.2;
    const y = yScale(D.demand_weekly[i]);
    if (i === 0) {
      demandPath += `M ${baseX} ${y} `;
    } else {
      // Riser from previous week's level up/down to current week's level
      demandPath += `L ${baseX} ${y} `;
    }
    demandPath += `L ${baseX + segW} ${y} `;
  });
  const demandLine = `<path d="${demandPath}" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="4 3" fill="none" />`;
  // Single end-of-line value label
  const lastDemandY = yScale(D.demand_weekly[lastIdx]);
  const lastDemandX = groupX(lastIdx) + (groupW - groupPad * 0.2) - groupPad * 0.4;
  const demandEndLabel = `<text class="chart-axis-text" x="${lastDemandX + 6}" y="${lastDemandY + 3}" fill="var(--accent)" font-weight="500">demand ${fmt(D.demand_weekly[lastIdx])}</text>`;
  // Small dot at start of demand line for visual anchor
  const firstDemandY = yScale(D.demand_weekly[0]);
  const firstDemandX = groupX(0) - groupPad * 0.4;
  const demandStartLabel = `<text class="chart-axis-text" x="${firstDemandX - 4}" y="${firstDemandY + 3}" text-anchor="end" fill="var(--accent)" font-weight="500">${fmt(D.demand_weekly[0])}</text>`;

  // Y-axis ticks
  const tickStep = Math.ceil(maxY / 5 / 10000) * 10000;
  let ticks = [];
  for (let y = 0; y <= maxY; y += tickStep) ticks.push(y);
  const gridlines = ticks.map(t => `<line class="chart-grid" x1="${m.l}" x2="${m.l + innerW}" y1="${yScale(t)}" y2="${yScale(t)}" />`).join('');
  const yLabels = ticks.map(t => `<text class="chart-axis-text" x="${m.l - 8}" y="${yScale(t) + 3}" text-anchor="end">${(t/1000)}K</text>`).join('');

  // Week labels at bottom (centered under each group)
  const xLabels = xVals.map((w, i) =>
    `<text class="chart-axis-text" x="${groupX(i) + barAreaW / 2}" y="${m.t + innerH + 18}" text-anchor="middle">${w}</text>`
  ).join('');

  // Story numbers for the summary widget
  // Find first week where demand exceeds peak3
  let peak3_covers_until = xVals[lastIdx];
  for (let i = 0; i < D.demand_weekly.length; i++) {
    if (D.demand_weekly[i] > peak3) {
      peak3_covers_until = i > 0 ? xVals[i - 1] : 'before ' + xVals[0];
      break;
    }
  }
  const peak3_gap_at_end = Math.max(0, w_last_demand - peak3);
  const peak4_headroom = peak4 - w_last_demand;

  const summaryHtml = `A third line lifts supply to <strong>${fmt(Math.round(peak3))} chips/week</strong> — clears demand through ${peak3_covers_until} but falls <strong>${fmt(Math.round(peak3_gap_at_end))} short</strong> by ${xVals[lastIdx]}.`;
  const recHtml = `Stand up a fourth line — keeps supply above demand all ${xVals.length} weeks, with <strong>~${fmt(Math.round(peak4_headroom))} chips/week of headroom</strong> by ${xVals[lastIdx]}.`;

  // Formula transparency box
  const lots_per_week_per_line = D.lots_per_week_per_line;
  const formulaBox = `
    <div class="projection-formula">
      <div class="projection-formula-label">How each bar is calculated</div>
      <div class="projection-formula-body">Peak supply = lots/week per line × chips/lot × best yield × number of lines
            = ${lots_per_week_per_line.toFixed(1)} × ${fmt(D.base_chips_per_lot)} × ${D.best_yield.toFixed(2)}% × N

  N = ${D.n_lines} (today)  →  ${fmt(Math.round(peak2))} chips/week
  N = ${D.n_lines + 1}      →  ${fmt(Math.round(peak3))} chips/week
  N = ${D.n_lines + 2}      →  ${fmt(Math.round(peak4))} chips/week</div>
    </div>
  `;

  const html = `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h3 class="chart-title">Weekly supply at 2, 3, and 4 lines vs. demand</h3>
          <p class="chart-sub">Three bars per week — supply at 2 lines (today), +1 line, +2 lines. The dashed blue line is the actual demand forecast for that week.</p>
        </div>
        <button class="info-btn" title="Each week shows three vertical bars — peak supply at 2, 3, and 4 lines. Peak supply doesn't change week to week (it's a structural ceiling), so the bars are the same height across all weeks. The dashed blue reference line shows demand for that week. As demand rises week over week, watch which bars stop reaching it.">ⓘ</button>
      </div>
      <div class="chart-svg-wrap">
        <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${gridlines}
          ${yLabels}
          ${xLabels}
          ${bars}
          ${demandLine}
          ${demandStartLabel}
          ${demandEndLabel}
        </svg>
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="legend-swatch" style="background:var(--text-tertiary);width:14px;height:10px;"></span>2 lines · ${(peak2/1000).toFixed(1)}K</div>
        <div class="chart-legend-item"><span class="legend-swatch" style="background:#7aa9d6;width:14px;height:10px;"></span>+1 line · ${(peak3/1000).toFixed(1)}K</div>
        <div class="chart-legend-item"><span class="legend-swatch" style="background:var(--accent);width:14px;height:10px;"></span>+2 lines · ${(peak4/1000).toFixed(1)}K</div>
        <div class="chart-legend-item"><span class="legend-swatch demand"></span>Demand (per week)</div>
      </div>
      ${formulaBox}
      ${renderChartWidgets(summaryHtml, recHtml)}
    </div>
  `;
  document.getElementById('lines-projection-content').innerHTML = html;
}

/* ============================================================
   SECTION 04 — LEVERS (preview of in-factory improvements)
   ============================================================ */
function computeLevers(D) {
  // Defensive scale check: if yields look fractional (≤ 1.5), scale to %
  const allYields = [];
  D.lines.forEach(l => D.grades.forEach(g => allYields.push(D.yield_line_grade[l][g])));
  const needsScaling = allYields.length && Math.max(...allYields) <= 1.5;
  const scaleY = v => needsScaling ? v * 100 : v;

  // Lever: worst line × grade yield cell (scaled)
  let worstCell = null;
  let worstY = 100;
  D.lines.forEach(l => {
    D.grades.forEach(g => {
      const y = scaleY(D.yield_line_grade[l][g]);
      if (y > 0 && y < worstY) {
        worstY = y;
        worstCell = { line: l, grade: g, yield: y };
      }
    });
  });
  const otherYields = [];
  D.lines.forEach(l => D.grades.forEach(g => {
    if (!(l === worstCell.line && g === worstCell.grade)) {
      otherYields.push(scaleY(D.yield_line_grade[l][g]));
    }
  }));
  const targetY = otherYields.reduce((a, b) => a + b, 0) / otherYields.length;
  const lots_per_week_total = D.lots_per_week_per_line * D.n_lines;
  const cellShare = (1 / D.n_lines) * (D.mix[worstCell.grade] || 0);
  const yieldDeltaPct = (targetY - worstY) / 100;
  const yieldUpside = lots_per_week_total * cellShare * D.base_chips_per_lot * yieldDeltaPct;

  // Lever: line with highest share of worst grade (mix shift)
  // Identify worst grade using scaled values for consistency
  const yieldsByGrade = {};
  D.grades.forEach(g => {
    const ys = D.lines.map(l => scaleY(D.yield_line_grade[l][g]));
    yieldsByGrade[g] = ys.reduce((a, b) => a + b, 0) / ys.length;
  });
  const worstGrade = Object.keys(yieldsByGrade).reduce((a, b) =>
    yieldsByGrade[a] < yieldsByGrade[b] ? a : b);
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
  const worstLineWorstGradeY = scaleY(D.yield_line_grade[worstMixLine][worstGrade] || 0);
  const otherGradeYs = D.grades.filter(g => g !== worstGrade).map(g => scaleY(D.yield_line_grade[worstMixLine][g] || 0));
  const meanOtherY = otherGradeYs.reduce((a, b) => a + b, 0) / otherGradeYs.length;
  const lineYieldGainPp = shareReduction * (meanOtherY - worstLineWorstGradeY);
  // Convert pp gain on Line worstMixLine to chips/week
  // Line throughput share = 1/n_lines; gain applies only to that line's volume
  const mixUpside = (lots_per_week_total / D.n_lines) * D.base_chips_per_lot * (lineYieldGainPp / 100);

  // Bottleneck (kept for the lead-time chart's summary widget — NOT a chips/week lever)
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

  return {
    yieldCell: { ...worstCell, target: targetY, upside: yieldUpside },
    mixShift: { line: worstMixLine, grade: worstGrade, share: worstMixLineShare, gainPp: lineYieldGainPp, upside: mixUpside },
    bottleneck: { station: worstSlipStation, slipDays: worstSlipDays, slipPct: worstSlipPct, totalSlipDays },
    combinedSqueeze: yieldUpside + mixUpside
  };
}

function renderSection4_Levers() {
  const D = window.DATA;
  const L = computeLevers(D);

  const html = `
    <div class="lever-grid lever-grid-2">
      <div class="lever-card">
        <div class="lever-card-tag">Lever 01 · Yield</div>
        <div class="lever-card-name">Lift Line ${L.yieldCell.line} × ${L.yieldCell.grade} yield</div>
        <p class="lever-card-text">Line ${L.yieldCell.line} × ${L.yieldCell.grade} yields only ${L.yieldCell.yield.toFixed(1)}% — every other line/grade combo is above ${(L.yieldCell.target - 1).toFixed(0)}%.</p>
        <div class="lever-card-upside">+${fmt(Math.round(L.yieldCell.upside))} chips/week</div>
      </div>
      <div class="lever-card">
        <div class="lever-card-tag">Lever 02 · Mix shift</div>
        <div class="lever-card-name">Rebalance Line ${L.mixShift.line} mix</div>
        <p class="lever-card-text">Line ${L.mixShift.line} runs ${(L.mixShift.share * 100).toFixed(0)}% of its volume as ${L.mixShift.grade} — the lowest-yielding grade. Rebalance toward higher grades.</p>
        <div class="lever-card-upside">+${fmt(Math.round(L.mixShift.upside))} chips/week</div>
      </div>
    </div>
    <p class="lever-total">Combined squeeze: <strong>~${fmt(Math.round(L.combinedSqueeze))} chips/week</strong>. A useful buffer — but it's a fraction of the ${fmt(Math.round(D.demand_w6 - D.peak_supply))} chips/week we still owe demand. New lines remain the answer.</p>
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

  const summaryHtml = `<strong>Station ${L.bottleneck.station}</strong> runs <strong>+${L.bottleneck.slipPct.toFixed(0)}%</strong> over committed (${D.station_ct_mean[L.bottleneck.station].toFixed(1)} vs ${D.committed_ct[L.bottleneck.station]} days). Total slip across all stations adds <strong>${L.bottleneck.totalSlipDays.toFixed(1)} days</strong> to a ${Object.values(D.committed_ct).reduce((a,b)=>a+b,0)}-day end-to-end cycle.`;
  const recHtml = `Fix S${L.bottleneck.station.replace('S','')} first — saves <strong>~${(D.station_ct_mean[L.bottleneck.station] - D.committed_ct[L.bottleneck.station]).toFixed(1)} days</strong>. <em>No direct chips/week impact</em> (S1 sets cadence) — the win is faster time-to-market and lower WIP inventory.`;

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
  // Defensive scale check: if any cell is ≤ 1.5, the values are still on
  // the 0-1 fractional scale — convert to 0-100 percentage at render time.
  const allYields = [];
  D.lines.forEach(l => D.grades.forEach(g => allYields.push(D.yield_line_grade[l][g])));
  const needsScaling = Math.max(...allYields) <= 1.5;
  const scale = v => needsScaling ? v * 100 : v;

  const scaledYields = allYields.map(scale);
  const dataMin = Math.min(...scaledYields);
  const dataMax = Math.max(...scaledYields);
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
      const v = scale(D.yield_line_grade[l][g]);
      const n = D.yield_line_grade_n[l][g];
      const tipHtml = `<div class="hover-tip-title">Line ${l} · ${g}</div>` +
        tipRow('Yield', v.toFixed(2) + '%', true) +
        tipRow('Sample size', n + ' lots') +
        tipRow('Range', dataMin.toFixed(2) + '%–' + dataMax.toFixed(2) + '%');
      const tipAttr = tipHtml.replace(/"/g, '&quot;');
      cells.push(`<div class="heatmap-cell" style="background:${colorFor(v)}" data-tip="${tipAttr}">${v.toFixed(2)}%</div>`);
    });
  });

  // Recompute the yield-cell summary numbers using the scaled value, so the
  // widget copy doesn't say things like "0.88% — every other cell is above -0%".
  const scaledYieldCell = scale(L.yieldCell.yield);
  const scaledTarget = scale(L.yieldCell.target);
  // Recompute upside in chips/week using the (possibly scaled) numbers.
  const cellShare = (1 / D.n_lines) * (D.mix[L.yieldCell.grade] || 0);
  const lots_per_week_total = D.lots_per_week_per_line * D.n_lines;
  const yieldDeltaPct = (scaledTarget - scaledYieldCell) / 100;
  const recomputedUpside = lots_per_week_total * cellShare * D.base_chips_per_lot * yieldDeltaPct;

  const summaryHtml = `<strong>Line ${L.yieldCell.line} × ${L.yieldCell.grade}</strong> sits at <strong>${scaledYieldCell.toFixed(1)}%</strong> — every other cell is above ${(scaledTarget - 1).toFixed(0)}%.`;
  const recHtml = `Fix the Line ${L.yieldCell.line} × ${L.yieldCell.grade} process — <strong>+${fmt(Math.round(recomputedUpside))} chips/week</strong> at current mix.`;

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
    ? `No action — line balance is healthy. <strong>Focus levers elsewhere</strong> (cadence, yield, mix).`
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