/* =============================================================
   parser.js — Excel workbook parser
   Reads a SheetJS workbook and returns a normalized DATA object.
   Used by both the dashboard and the simulator.

   Required sheets:
     - Supply_Demand    (Week, Forecasted_Demand, Projected_Supply)
     - Committed_Lead_time  (Station_ID, Committed_LT_Days)
     - Daily_Lot_Data   (Lot_ID, Date, Factory_Line, Wafer_Quality_Grade,
                         Station_ID, Actual_LT_Days, Cummulative_Yield_Percentage)
   ============================================================= */

function validateWorkbook(wb) {
  const required = ['Supply_Demand', 'Committed_Lead_time', 'Daily_Lot_Data'];
  for (const s of required) {
    if (!wb.Sheets[s]) {
      throw new Error(`Missing required sheet "${s}". Found: ${wb.SheetNames.join(', ')}`);
    }
  }
}

function checkSchemaCompatibility(d) {
  // Sanity check that the parsed object has the conventions the
  // hardcoded simulator/dashboard widgets expect.
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

function parseWorkbook(wb) {
  validateWorkbook(wb);
  const supplyRows = XLSX.utils.sheet_to_json(wb.Sheets['Supply_Demand']);
  const ltRows = XLSX.utils.sheet_to_json(wb.Sheets['Committed_Lead_time']);
  const lotRows = XLSX.utils.sheet_to_json(wb.Sheets['Daily_Lot_Data']);

  // ---- Weekly arrays (W1..Wn)
  const weeks = supplyRows.map(r => String(r.Week));
  const demand_weekly = supplyRows.map(r => Number(r.Forecasted_Demand));
  const supply_weekly = supplyRows.map(r => Number(r.Projected_Supply));
  const demand_w6 = demand_weekly[demand_weekly.length - 1];
  const supply_w6 = supply_weekly[supply_weekly.length - 1];
  const latest_week_label = weeks[weeks.length - 1];

  // ---- Stations and committed LT
  const stations = ltRows.map(r => String(r.Station_ID));
  const committed_ct = {};
  ltRows.forEach(r => { committed_ct[r.Station_ID] = Number(r.Committed_LT_Days); });

  // ---- Lines & grades inventory
  const linesSet = new Set();
  const gradesSet = new Set();
  lotRows.forEach(r => {
    linesSet.add(String(r.Factory_Line));
    gradesSet.add(String(r.Wafer_Quality_Grade));
  });
  const lines = [...linesSet].sort();
  const grades = [...gradesSet].sort();
  const n_lines = lines.length;

  // ---- Per-station LT distributions
  const station_ct_values = {};
  stations.forEach(s => {
    const vals = lotRows
      .filter(r => String(r.Station_ID) === s)
      .map(r => Number(r.Actual_LT_Days));
    station_ct_values[s] = vals;
  });

  // ---- Per-station median, mean, min, max, n
  function median(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  const station_ct_median = {};
  const station_ct_mean = {};
  const station_ct_min = {};
  const station_ct_max = {};
  const station_ct_n = {};
  stations.forEach(s => {
    const vals = station_ct_values[s];
    station_ct_median[s] = median(vals);
    station_ct_mean[s] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    station_ct_min[s] = vals.length ? Math.min(...vals) : 0;
    station_ct_max[s] = vals.length ? Math.max(...vals) : 0;
    station_ct_n[s] = vals.length;
  });

  // Mean actual CT per station (for simulator compatibility)
  const actual_ct = {};
  stations.forEach(s => { actual_ct[s] = station_ct_mean[s]; });

  // ---- Final yield per lot (S6 cumulative)
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

  // ---- Defensive yield normalization: always store finalYield as 0–1 fraction.
  // If values look like percentages (max > 1.5), divide by 100.
  const allFinalYields = Object.values(lotMeta).map(m => m.finalYield).filter(y => y !== null);
  if (allFinalYields.length > 0) {
    const maxObserved = Math.max(...allFinalYields);
    if (maxObserved > 1.5) {
      Object.values(lotMeta).forEach(m => {
        if (m.finalYield !== null) m.finalYield = m.finalYield / 100;
      });
    }
  }

  // ---- Yield by line × grade
  const yield_line_grade = {};
  const yield_line_grade_n = {};
  lines.forEach(l => {
    yield_line_grade[l] = {};
    yield_line_grade_n[l] = {};
    grades.forEach(g => {
      const ys = Object.values(lotMeta)
        .filter(m => m.line === l && m.grade === g && m.finalYield !== null)
        .map(m => m.finalYield);
      yield_line_grade[l][g] = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
      yield_line_grade_n[l][g] = ys.length;
    });
  });

  // ---- Mix
  const totalLots = Object.keys(lotMeta).length;
  const mix = {};
  grades.forEach(g => {
    mix[g] = Object.values(lotMeta).filter(m => m.grade === g).length / totalLots;
  });

  // ---- Yield by grade overall
  const yield_by_grade = {};
  grades.forEach(g => {
    const ys = Object.values(lotMeta)
      .filter(m => m.grade === g && m.finalYield !== null)
      .map(m => m.finalYield);
    yield_by_grade[g] = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
  });

  // ---- Best yield = max yield achieved (typically G1)
  const best_yield = Math.max(...Object.values(yield_by_grade));
  const mix_yield = grades.reduce((sum, g) => sum + (mix[g] * yield_by_grade[g]), 0);
  const current_mix_yield = mix_yield; // alias

  // ---- Bottleneck CT inferred from S1 cadence
  const firstStation = stations[0];
  const s1Rows = lotRows.filter(r => String(r.Station_ID) === firstStation);
  const dates = s1Rows.map(r => new Date(r.Date)).sort((a, b) => a - b);
  const dayDiff = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24) + 1;
  const lotsPerLine = s1Rows.length / n_lines;
  const bottleneck_ct_days = dayDiff / lotsPerLine; // ~1 day in case data

  // ---- Lots per week
  const lots_per_week_per_line = (7 / bottleneck_ct_days);
  const lots_per_week_total = lots_per_week_per_line * n_lines;

  // ---- Base chips per lot inferred from observed supply
  const base_chips_per_lot = Math.round(supply_w6 / (lots_per_week_total * mix_yield));

  // ---- Peak supply at n lines, best yield, no slippage
  const peak_supply = lots_per_week_total * base_chips_per_lot * best_yield;

  // ---- Lots observed per line over window
  const lots_per_line_observed = {};
  lines.forEach(l => {
    lots_per_line_observed[l] = Object.values(lotMeta).filter(m => m.line === l).length;
  });
  const obs_weeks = dayDiff / 7;
  const lots_per_week_per_line_obs = {};
  lines.forEach(l => {
    lots_per_week_per_line_obs[l] = lots_per_line_observed[l] / obs_weeks;
  });

  // ---- Line B Grade 3 lots per week (used by simulator P2)
  const lineB_g3_lots_per_week = lines.length >= 2 && grades.length >= 3
    ? Object.values(lotMeta).filter(m => m.line === lines[1] && m.grade === grades[grades.length - 1]).length / dayDiff * 7
    : 0;

  return {
    // Weekly time-series
    weeks,
    demand_weekly,
    supply_weekly,
    demand_w6,
    supply_w6,
    latest_week_label,
    // Lines / capacity
    n_lines,
    bottleneck_ct_days,
    lots_per_week_per_line,
    lots_per_week_per_line_obs,
    base_chips_per_lot,
    peak_supply,
    // Yield
    best_yield,
    mix_yield,
    current_mix_yield,
    yield_by_grade,
    yield_line_grade,
    yield_line_grade_n,
    mix,
    // Stations
    stations,
    committed_ct,
    actual_ct,
    station_ct_values,
    station_ct_median,
    station_ct_mean,
    station_ct_min,
    station_ct_max,
    station_ct_n,
    // Misc
    lineB_g3_lots_per_week,
    grades,
    lines,
    obs_weeks
  };
}
