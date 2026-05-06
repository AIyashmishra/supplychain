/* =============================================================
   hover-tip.js — Global hover tooltip
   Wires up delegated mouseover/move/out listeners. Any element
   with a [data-tip] attribute will display its content as a
   tooltip on hover. The tooltip element must exist in the DOM
   with id="hover-tip" (rendered as an empty div in shared layout).
   ============================================================= */

const _tip = function() { return document.getElementById('hover-tip'); };

function showTip(html, evt) {
  var t = _tip();
  if (!t) return;
  t.innerHTML = html;
  t.classList.add('visible');
  positionTip(evt);
}

function hideTip() {
  var t = _tip();
  if (t) t.classList.remove('visible');
}

function positionTip(evt) {
  var t = _tip();
  if (!t) return;
  var rect = t.getBoundingClientRect();
  var pad = 14;
  var x = evt.clientX + pad;
  var y = evt.clientY - rect.height - pad;
  if (x + rect.width > window.innerWidth - 8) {
    x = evt.clientX - rect.width - pad;
  }
  if (y < 8) {
    y = evt.clientY + pad;
  }
  t.style.left = x + 'px';
  t.style.top = y + 'px';
}

function tipRow(k, v, accent) {
  return '<div class="hover-tip-row' + (accent ? ' accent' : '') + '">' +
    '<span class="k">' + k + '</span>' +
    '<span class="v">' + v + '</span></div>';
}

// Delegated hover: any element with [data-tip] triggers tooltip
document.addEventListener('mouseover', function(e) {
  var el = e.target.closest('[data-tip]');
  if (el) showTip(el.getAttribute('data-tip'), e);
});
document.addEventListener('mousemove', function(e) {
  var el = e.target.closest('[data-tip]');
  if (el) positionTip(e);
});
document.addEventListener('mouseout', function(e) {
  var el = e.target.closest('[data-tip]');
  if (el && (!e.relatedTarget || !e.relatedTarget.closest('[data-tip]'))) {
    hideTip();
  }
});
