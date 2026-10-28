// Draws the dashboard for whichever country the page asks for.
// The page only needs <div id="dashboard" data-country="nz">; the numbers come from /data/nz.json.
(function () {
  'use strict';

  var script = document.currentScript;
  var DATA_BASE = new URL('../data/', script.src); // works at any web address or sub-folder
  var SITE = window.SITE || { name: 'YourSiteName', url: 'yoursite.com' };

  var root = document.getElementById('dashboard');
  var country = root.getAttribute('data-country');
  var SVGNS = 'http://www.w3.org/2000/svg';

  // ---------- small helpers ----------
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function parseDay(iso) { return Date.parse(iso + 'T00:00:00Z'); }

  var fmtDay = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  var fmtMonth = new Intl.DateTimeFormat('en-NZ', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  var fmtChecked = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' });

  function number(v, decimals) {
    return new Intl.NumberFormat('en-NZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
  }
  function valueText(e, v) { return (e.prefix || '') + number(v, e.decimals) + (e.suffix || ''); }
  function dateText(e, iso) {
    var t = parseDay(iso);
    return e.period === 'quarter' ? fmtMonth.format(t) + ' quarter' : fmtDay.format(t);
  }

  // ---------- navigation between countries ----------
  function buildNav(countries) {
    var nav = document.getElementById('country-nav');
    var brand = document.getElementById('brand');
    if (brand) {
      brand.textContent = SITE.name;
      brand.href = new URL('../', DATA_BASE).href;
    }
    if (!nav) return;
    countries.forEach(function (c) {
      if (c.live) {
        var a = el('a', { href: new URL('../' + c.id + '/', DATA_BASE).href }, c.name);
        if (c.id === country) a.setAttribute('aria-current', 'page');
        nav.appendChild(a);
      } else {
        nav.appendChild(el('span', { title: 'Coming soon' }, c.name + ' (soon)'));
      }
    });
  }

  // ---------- the small trend chart ----------
  function sparkline(e) {
    var W = 320, H = 96, P = 6;
    var pts = e.series.map(function (p) { return { t: parseDay(p[0]), v: p[1], d: p[0] }; });
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    var lo = Math.min.apply(null, pts.map(function (p) { return p.v; }));
    var hi = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.02 || 1;
    lo -= pad; hi += pad;
    var x = function (t) { return P + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (W - 2 * P); };
    var y = function (v) { return H - P - ((v - lo) / (hi - lo)) * (H - 2 * P); };

    var d = 'M' + x(pts[0].t).toFixed(1) + ',' + y(pts[0].v).toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      d += e.shape === 'step'
        ? ' H' + x(pts[i].t).toFixed(1) + ' V' + y(pts[i].v).toFixed(1)
        : ' L' + x(pts[i].t).toFixed(1) + ',' + y(pts[i].v).toFixed(1);
    }
    var first = pts[0], last = pts[pts.length - 1];
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': e.label + ' from ' + dateText(e, first.d) + ' to ' + dateText(e, last.d) + ', now ' + valueText(e, e.value) });
    s.appendChild(svg('path', { d: d + ' L' + x(t1).toFixed(1) + ',' + (H - P) + ' L' + x(t0).toFixed(1) + ',' + (H - P) + ' Z', 'class': 'spark-area' }));
    s.appendChild(svg('path', { d: d, 'class': 'spark-line' }));
    var dot = svg('circle', { cx: x(t1), cy: y(last.v), r: 3.5, 'class': 'spark-dot' });
    var vline = svg('line', { y1: P, y2: H - P, 'class': 'hover-line', visibility: 'hidden' });
    s.appendChild(vline);
    s.appendChild(dot);

    var wrap = el('div', { 'class': 'chart' });
    wrap.appendChild(s);
    var tip = el('div', { 'class': 'tip', hidden: '' });
    wrap.appendChild(tip);

    function show(ev) {
      var r = s.getBoundingClientRect();
      var fx = ((ev.clientX - r.left) / r.width) * W;
      var best = pts[0];
      pts.forEach(function (p) { if (Math.abs(x(p.t) - fx) < Math.abs(x(best.t) - fx)) best = p; });
      vline.setAttribute('x1', x(best.t)); vline.setAttribute('x2', x(best.t));
      vline.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x(best.t)); dot.setAttribute('cy', y(best.v));
      tip.textContent = dateText(e, best.d) + ': ' + valueText(e, best.v);
      tip.style.left = Math.min(Math.max((x(best.t) / W) * 100, 15), 85) + '%';
      tip.hidden = false;
    }
    function hide() {
      vline.setAttribute('visibility', 'hidden');
      dot.setAttribute('cx', x(t1)); dot.setAttribute('cy', y(last.v));
      tip.hidden = true;
    }
    s.addEventListener('pointermove', show);
    s.addEventListener('pointerdown', show);
    s.addEventListener('pointerleave', hide);
    return wrap;
  }

  // ---------- downloadable chart image (PNG with the site name on it) ----------
  function downloadPng(e) {
    var W = 1200, H = 675;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    var font = function (w, px) { return w + ' ' + px + 'px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'; };

    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0b63c4'; g.fillRect(0, 0, W, 10);

    g.textBaseline = 'alphabetic';
    g.fillStyle = '#14181f'; g.font = font('700', 40);
    g.fillText(e.label, 60, 80);
    g.fillStyle = '#5a6473'; g.font = font('400', 24);
    g.fillText(dateText(e, e.asOf) + (e.sample ? '  ·  SAMPLE DATA' : ''), 60, 118);
    g.fillStyle = '#14181f'; g.font = font('700', 84);
    g.fillText(valueText(e, e.value), 60, 215);
    g.fillStyle = '#5a6473'; g.font = font('400', 26);
    g.fillText(e.change.text, 60, 256);

    var L = 120, R = W - 60, T = 300, B = 540;
    var pts = e.series.map(function (p) { return { t: parseDay(p[0]), v: p[1] }; });
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    var lo = Math.min.apply(null, pts.map(function (p) { return p.v; }));
    var hi = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.02 || 1;
    lo -= pad; hi += pad;
    var x = function (t) { return L + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (R - L); };
    var y = function (v) { return B - ((v - lo) / (hi - lo)) * (B - T); };

    g.font = font('400', 20); g.strokeStyle = '#e2e6ed'; g.lineWidth = 1; g.fillStyle = '#5a6473';
    for (var i = 0; i <= 4; i++) {
      var gv = lo + ((hi - lo) * i) / 4, gy = y(gv);
      g.beginPath(); g.moveTo(L, gy); g.lineTo(R, gy); g.stroke();
      g.textAlign = 'right'; g.fillText(number(gv, e.decimals), L - 12, gy + 7);
    }
    g.textAlign = 'left'; g.fillText(fmtMonth.format(t0), L, B + 34);
    g.textAlign = 'right'; g.fillText(fmtMonth.format(t1), R, B + 34);

    g.beginPath();
    pts.forEach(function (p, i) {
      if (i === 0) g.moveTo(x(p.t), y(p.v));
      else if (e.shape === 'step') { g.lineTo(x(p.t), y(pts[i - 1].v)); g.lineTo(x(p.t), y(p.v)); }
      else g.lineTo(x(p.t), y(p.v));
    });
    g.strokeStyle = '#0b63c4'; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
    g.beginPath(); g.arc(x(t1), y(pts[pts.length - 1].v), 7, 0, Math.PI * 2); g.fillStyle = '#0b63c4'; g.fill();

    g.strokeStyle = '#e2e6ed'; g.beginPath(); g.moveTo(60, 596); g.lineTo(W - 60, 596); g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#5a6473'; g.font = font('400', 20);
    g.fillText('Source: ' + e.source.name, 60, 635);
    g.textAlign = 'right'; g.fillStyle = '#0b63c4'; g.font = font('700', 26);
    g.fillText(SITE.name + '  ·  ' + SITE.url, W - 60, 637);

    c.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = country + '-' + e.id + '-' + e.asOf + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, 'image/png');
  }

  // ---------- one card ----------
  function card(e) {
    var a = el('article', { 'class': 'card' });
    var head = el('div', { 'class': 'card-head' });
    head.appendChild(el('h2', null, e.label));
    if (e.sample) head.appendChild(el('span', { 'class': 'tag' }, 'Sample'));
    else if (e.stale) head.appendChild(el('span', { 'class': 'tag', title: 'This figure has not been refreshed recently' }, 'May be out of date'));
    a.appendChild(head);
    a.appendChild(el('p', { 'class': 'value' }, valueText(e, e.value)));
    a.appendChild(el('p', { 'class': 'change' }, e.change.text));
    a.appendChild(sparkline(e));
    a.appendChild(el('p', { 'class': 'asof' }, 'Latest data: ' + dateText(e, e.asOf)));
    a.appendChild(el('p', { 'class': 'blurb' }, e.blurb));
    var foot = el('div', { 'class': 'card-foot' });
    var src = el('a', { href: e.source.url, rel: 'noopener' }, 'Source: ' + e.source.name);
    foot.appendChild(src);
    var btn = el('button', { type: 'button' }, 'Download chart (PNG)');
    btn.addEventListener('click', function () { downloadPng(e); });
    foot.appendChild(btn);
    a.appendChild(foot);
    return a;
  }

  // ---------- load everything ----------
  fetch(new URL(country + '.json', DATA_BASE))
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      root.textContent = '';
      data.indicators.forEach(function (e) { root.appendChild(card(e)); });
      var checked = document.getElementById('checked');
      if (checked) checked.textContent = 'Figures last checked ' + fmtChecked.format(new Date(data.generatedAt)) + ' (NZ time).';
      var banner = document.getElementById('banner');
      if (banner && data.indicators.some(function (e) { return e.sample; })) {
        banner.textContent = 'Some figures shown here are SAMPLE data for testing. Run the update script (see README) to load the real figures.';
        banner.hidden = false;
      }
    })
    .catch(function () {
      root.textContent = '';
      root.appendChild(el('p', null, 'Sorry, the figures could not be loaded. If you are testing on your own computer, open the page through a local web server (see README), not by double-clicking the file.'));
    });

  fetch(new URL('countries.json', DATA_BASE))
    .then(function (r) { return r.json(); })
    .then(buildNav)
    .catch(function () { buildNav([]); });

  // ---------- email signup: warn if the form isn't connected yet ----------
  var form = document.getElementById('signup-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      if (/YOUR_/.test(form.getAttribute('action') || '')) {
        ev.preventDefault();
        var m = document.getElementById('signup-msg');
        m.textContent = 'Signup is not connected yet. Paste your Mailchimp form address into the form (see README, step 6).';
      }
    });
  }
})();
