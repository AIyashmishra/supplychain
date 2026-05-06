/* =============================================================
   dashboard.js — Data dashboard rendering
   Renders Section 1 (Summary), Section 2 (Manufacturing performance),
   Section 3 (Supply shortfall), Section 4 (Findings).
   Calls render functions from window.DATA and writes to known DOM ids.
   ============================================================= */

const SVG_W = 600;

/* ============================================================
   SECTION 1 — SUMMARY METRICS
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
   SECTION 2 — MANUFACTURING PERFORMANCE
   ============================================================ */
function renderSection2() {
  const D = window.DATA;

  const html = `
    ${chartCard_DemandSupply(D)}
    ${chartCard_StationCT(D)}
    ${heatmap_YieldLineGrade(D)}
    ${tile_LotsPerLine(D)}
  `;
  document.getElementById('mfg-content').innerHTML = html;
}

// ---- Chart 2.1: Demand vs. Supply line chart ----
function chartCard_DemandSupply(D) {
  const W = SVG_W, H = 240;
  const m = { t: 20, r: 30, b: 30, l: 50 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;

  const xVals = D.weeks;
  const maxY = Math.max(...D.demand_weekly, ...D.supply_weekly) * 1.1;
  const xStep = innerW / (xVals.length - 1);
  const yScale = v => m.t + innerH - (v / maxY) * innerH;

  const demandPath = D.demand_weekly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m.l + i * xStep} ${yScale(v)}`).join(' ');
  const supplyPath = D.supply_weekly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m.l + i * xStep} ${yScale(v)}`).join(' ');

  // Y-axis ticks at nice intervals
  const tickStep = Math.ceil(maxY / 5 / 10000) * 10000;
  let ticks = [];
  for (let y = 0; y <= maxY; y += tickStep) ticks.push(y);

  const gridlines = ticks.map(t => `<line class="chart-grid" x1="${m.l}" x2="${m.l + innerW}" y1="${yScale(t)}" y2="${yScale(t)}" />`).join('');
  const yLabels = ticks.map(t => `<text class="chart-axis-text" x="${m.l - 8}" y="${yScale(t) + 3}" text-anchor="end">${(t/1000)}K</text>`).join('');
  const xLabels = xVals.map((w, i) => `<text class="chart-axis-text" x="${m.l + i * xStep}" y="${m.t + innerH + 18}" text-anchor="middle">${w}</text>`).join('');

  // End-point labels for last week
  const lastIdx = xVals.length - 1;
  const lastDemandY = yScale(D.demand_weekly[lastIdx]);
  const lastSupplyY = yScale(D.supply_weekly[lastIdx]);
  const gapAtLast = D.demand_weekly[lastIdx] - D.supply_weekly[lastIdx];

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
    </div>
  `;
}

// ---- Section 2.2: Lead time by station (table) ----
function chartCard_StationCT(D) {
  const stations = D.stations;

  // Determine if all stations have the same n and same spec (so we can simplify)
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
    </div>
  `;
}

// ---- Chart 2.3: Yield by line × grade heatmap ----
function heatmap_YieldLineGrade(D) {
  // Compute the actual data range across all line × grade combinations
  const allYields = [];
  D.lines.forEach(l => D.grades.forEach(g => allYields.push(D.yield_line_grade[l][g])));
  const dataMin = Math.min(...allYields);
  const dataMax = Math.max(...allYields);
  // Pad slightly so the worst cell isn't pure red and best isn't pure green
  const pad = Math.max(0.5, (dataMax - dataMin) * 0.1);
  const lo = Math.max(0, dataMin - pad);
  const hi = Math.min(100, dataMax + pad);

  // Interpolate between three reference colors based on relative yield position
  // 0 → warn (low), 0.5 → blue (mid), 1 → green (high)
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgbStr(r, g, b, a) { return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`; }
  const colorFor = v => {
    const t = hi === lo ? 0.5 : Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    // Warn (BA7517) at t=0, Accent (185FA5) at t=0.5, Good (0F6E56) at t=1
    let r, g, b;
    if (t < 0.5) {
      const u = t * 2;
      r = lerp(186, 24, u);
      g = lerp(117, 95, u);
      b = lerp(23, 165, u);
    } else {
      const u = (t - 0.5) * 2;
      r = lerp(24, 15, u);
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
    </div>
  `;
}

// ---- Tile 2.4: Capacity utilization by line ----
function tile_LotsPerLine(D) {
  const expected = D.lots_per_week_per_line;
  const tiles = D.lines.map(l => {
    const obs = D.lots_per_week_per_line_obs[l];
    const utilPct = obs / expected * 100;
    const utilDisplay = utilPct.toFixed(0) + '%';
    // Color the utilization value if it's meaningfully under capacity
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
    </div>
  `;
}

/* ============================================================
   SECTION 3 — SUPPLY SHORTFALL
   ============================================================ */
function renderSection3() {
  const D = window.DATA;
  const W = SVG_W, H = 280;
  const m = { t: 30, r: 70, b: 36, l: 55 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;

  const xVals = D.weeks;
  const maxY = Math.max(...D.demand_weekly, D.peak_supply) * 1.1;
  const xStep = innerW / (xVals.length - 1);
  const yScale = v => m.t + innerH - (v / maxY) * innerH;

  // Paths
  const demandPath = D.demand_weekly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m.l + i * xStep} ${yScale(v)}`).join(' ');
  const supplyPath = D.supply_weekly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m.l + i * xStep} ${yScale(v)}`).join(' ');
  const peakY = yScale(D.peak_supply);
  const peakPath = `M ${m.l} ${peakY} L ${m.l + innerW} ${peakY}`;

  // Shaded areas
  // Performance gap: between supply and peak (gray)
  const perfArea = [
    `M ${m.l} ${peakY}`,
    `L ${m.l + innerW} ${peakY}`,
    ...D.supply_weekly.slice().reverse().map((v, i) => {
      const realIdx = D.supply_weekly.length - 1 - i;
      return `L ${m.l + realIdx * xStep} ${yScale(v)}`;
    }),
    'Z'
  ].join(' ');

  // Capacity gap: between peak and demand, only where demand > peak
  let capPath = '';
  // Find first week where demand > peak
  let startIdx = D.demand_weekly.findIndex(v => v > D.peak_supply);
  if (startIdx >= 0) {
    const segDemand = D.demand_weekly.slice(startIdx);
    capPath = [
      `M ${m.l + startIdx * xStep} ${peakY}`,
      `L ${m.l + innerW} ${peakY}`,
      ...segDemand.slice().reverse().map((v, i) => {
        const realIdx = D.demand_weekly.length - 1 - i;
        return `L ${m.l + realIdx * xStep} ${yScale(v)}`;
      }),
      'Z'
    ].join(' ');
  }

  // Y axis ticks
  const tickStep = Math.ceil(maxY / 5 / 10000) * 10000;
  let ticks = [];
  for (let y = 0; y <= maxY; y += tickStep) ticks.push(y);
  const gridlines = ticks.map(t => `<line class="chart-grid" x1="${m.l}" x2="${m.l + innerW}" y1="${yScale(t)}" y2="${yScale(t)}" />`).join('');
  const yLabels = ticks.map(t => `<text class="chart-axis-text" x="${m.l - 8}" y="${yScale(t) + 3}" text-anchor="end">${(t/1000)}K</text>`).join('');
  const xLabels = xVals.map((w, i) => `<text class="chart-axis-text" x="${m.l + i * xStep}" y="${m.t + innerH + 18}" text-anchor="middle">${w}</text>`).join('');

  // Crossover annotation: where peak crosses demand
  let crossover = '';
  if (startIdx > 0) {
    // Find exact crossover x
    const v0 = D.demand_weekly[startIdx - 1];
    const v1 = D.demand_weekly[startIdx];
    const t = (D.peak_supply - v0) / (v1 - v0);
    const crossX = m.l + (startIdx - 1 + t) * xStep;
    crossover = `
      <line stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="2 2" x1="${crossX}" x2="${crossX}" y1="${peakY}" y2="${m.t + innerH}" />
      <text class="chart-tag" x="${crossX + 4}" y="${peakY - 6}">PEAK CEILING CROSSED</text>
    `;
  }

  // Peak label
  const peakLabel = `<text class="chart-axis-text" x="${m.l + innerW + 5}" y="${peakY + 3}" fill="var(--text-tertiary)">peak ${(D.peak_supply / 1000).toFixed(1)}K</text>`;

  const html = `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h3 class="chart-title">Demand vs. supply vs. peak ceiling</h3>
          <p class="chart-sub">Demand (blue), actual supply (black), peak supply ceiling (dashed). Gray area = recoverable. Blue area = structural.</p>
        </div>
        <button class="info-btn" title="The peak ceiling is the theoretical maximum output of the current factory at best-ever yield with no execution slip. The shaded gray area is the performance gap (recoverable). The shaded blue area is the capacity gap (structural — only closeable by adding lines).">ⓘ</button>
      </div>
      <div class="chart-svg-wrap">
        <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${gridlines}
          ${yLabels}
          ${xLabels}
          <path class="chart-area-perf" d="${perfArea}" />
          ${capPath ? `<path class="chart-area-cap" d="${capPath}" />` : ''}
          <path class="chart-line-peak" d="${peakPath}" />
          <path class="chart-line-supply" d="${supplyPath}" />
          <path class="chart-line-demand" d="${demandPath}" />
          ${peakLabel}
          ${crossover}
        </svg>
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="legend-swatch demand"></span>Demand</div>
        <div class="chart-legend-item"><span class="legend-swatch supply"></span>Actual supply</div>
        <div class="chart-legend-item"><span class="legend-swatch peak"></span>Peak ceiling</div>
        <div class="chart-legend-item"><span class="legend-block perf"></span>Performance gap (recoverable)</div>
        <div class="chart-legend-item"><span class="legend-block cap"></span>Capacity gap (structural)</div>
      </div>
    </div>
  `;
  document.getElementById('shortfall-content').innerHTML = html;
}

/* ============================================================
   SECTION 4 — KEY FINDINGS
   ============================================================ */
function renderSection4() {
  const D = window.DATA;

  // Compute capacity gap (structural)
  const cap_gap = Math.max(0, D.demand_w6 - D.peak_supply);
  const cap_pct = D.demand_w6 ? Math.round((cap_gap / (D.demand_w6 - D.supply_w6)) * 100) : 0;

  // Wafer mix drag
  const mixDrag = ((D.best_yield - D.mix_yield) / 100) * (D.lots_per_week_per_line * D.n_lines * D.base_chips_per_lot);
  const g3Share = D.mix.Grade3 || 0;

  // Line B Grade 3 gap
  let lineGradeGap = 0;
  let worstLineGrade = null;
  D.grades.forEach(g => {
    if (D.lines.length < 2) return;
    const ya = D.yield_line_grade[D.lines[0]][g];
    const yb = D.yield_line_grade[D.lines[1]][g];
    const delta = Math.abs(ya - yb);
    if (delta > lineGradeGap) {
      lineGradeGap = delta;
      worstLineGrade = {
        worseLine: ya > yb ? D.lines[1] : D.lines[0],
        betterLine: ya > yb ? D.lines[0] : D.lines[1],
        grade: g,
        worseY: Math.min(ya, yb),
        betterY: Math.max(ya, yb)
      };
    }
  });

  const findings = [
    {
      num: '01',
      headline: `${cap_pct}% of the gap is structural.`,
      body: `Two lines, running flawlessly at our best-ever yield (${D.best_yield.toFixed(2)}%), produce ${fmt(Math.round(D.peak_supply))} chips/week. The remaining ${fmt(cap_gap)}/week cannot be made on existing capacity, regardless of execution.`
    },
    {
      num: '02',
      headline: `Wafer mix is costing ${fmt(Math.round(mixDrag))} chips/week.`,
      body: `We are receiving ${fmtPct(g3Share, 0)} Grade 3 wafers from ChipFab. Grade 3 yields ${(D.yield_by_grade.Grade3 || 0).toFixed(0)}% versus Grade 1 at ${(D.yield_by_grade.Grade1 || 0).toFixed(2)}%. Shifting the mix toward Grade 1 closes nearly the entire performance gap.`
    },
    {
      num: '03',
      headline: lineGradeGap > 1
        ? `Line ${worstLineGrade.worseLine} underperforms only on ${worstLineGrade.grade}.`
        : `Lines match across all wafer grades.`,
      body: lineGradeGap > 1
        ? `Lines ${D.lines.join(' and ')} match to within 0.1 points on Grades 1 and 2 but diverge by ${lineGradeGap.toFixed(1)} points on ${worstLineGrade.grade}. Process gap, not equipment gap. Worth ~630 chips/week as a bridge fix.`
        : `No material line-vs-line yield divergence — no line-specific intervention needed.`
    }
  ];

  const html = findings.map(f => `
    <div class="finding">
      <div class="finding-row">
        <div class="finding-num">${f.num}</div>
        <div class="finding-body">
          <div class="finding-headline">${f.headline}</div>
          <p class="finding-context">${f.body}</p>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('findings-content').innerHTML = html;
}

/* ============================================================
   INIT — runs after DATA loaded
   ============================================================ */
function init() {
  if (!window.DATA) return;
  renderSection1();
  renderSection2();
  renderSection3();
  renderSection4();
}

