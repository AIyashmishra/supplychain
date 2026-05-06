/* =============================================================
   data-loader.js — Excel file loading + UI wiring
   Handles: file picker, drag-drop, "Load sample data" button.
   On successful parse, calls window.init() (each page defines its
   own init that re-renders from window.DATA).
   ============================================================= */
 
function loadFromArrayBuffer(buf, sourceLabel) {
  try {
    var wb = XLSX.read(buf, { type: 'array', cellDates: true });
    var parsed = parseWorkbook(wb);
    if (typeof checkSchemaCompatibility === 'function') {
      checkSchemaCompatibility(parsed);
    }
    window.DATA = parsed;
    // Sync simulator's local DATA variable if it has a sync hook
    if (typeof window.syncSimulatorData === 'function') {
      window.syncSimulatorData(parsed);
    }
    if (typeof window.init === 'function') window.init();
    showStatus('success',
      'Loaded ' + sourceLabel + '.',
      Object.keys(parsed.yield_by_grade).length + ' grades · ' +
      parsed.n_lines + ' lines · ' +
      parsed.stations.length + ' stations.'
    );
  } catch (err) {
    showStatus('error', 'Could not load ' + sourceLabel + '.', err.message);
    console.error(err);
  }
}
 
function loadSampleData() {
  try {
    var binary = atob(SAMPLE_B64);
    var buf = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    loadFromArrayBuffer(buf.buffer, 'sample data');
  } catch (e) {
    showStatus('error', 'Could not load sample data', e.message);
    console.error(e);
  }
}
 
function showStatus(kind, msg, detail) {
  var el = document.getElementById('upload-status');
  if (!el) return;
  el.className = 'upload-status ' + kind;
  el.textContent = detail ? msg + ' ' + detail : msg;
  el.style.display = 'block';
}
 
function bootUploadUI() {
  var fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) { loadFromArrayBuffer(ev.target.result, file.name); };
      reader.readAsArrayBuffer(file);
    });
  }
 
  var uz = document.getElementById('upload-zone');
  if (uz) {
    ['dragenter', 'dragover'].forEach(function(evt) {
      uz.addEventListener(evt, function(e) {
        e.preventDefault();
        uz.style.borderColor = 'var(--accent)';
      });
    });
    ['dragleave', 'drop'].forEach(function(evt) {
      uz.addEventListener(evt, function(e) {
        e.preventDefault();
        uz.style.borderColor = '';
      });
    });
    uz.addEventListener('drop', function(e) {
      e.preventDefault();
      var file = e.dataTransfer.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) { loadFromArrayBuffer(ev.target.result, file.name); };
      reader.readAsArrayBuffer(file);
    });
  }
 
  // Auto-load sample data on first paint
  loadSampleData();
}
 
document.addEventListener('DOMContentLoaded', bootUploadUI);
 