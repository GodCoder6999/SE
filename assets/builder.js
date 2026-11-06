/* ==========================================================================
   SE Diagram Builder — turn a few lines of text into a standards-compliant
   DFD, use case, class or sequence diagram, in the same style as the
   portfolio diagrams. Nodes can be dragged; the result downloads as SVG.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- palette (matches the portfolio diagrams) ------------------ */
  var P = {
    brand: '#5E35B1', brandD: '#4527A0', brandL: '#EDE7F6', brandM: '#8E24AA',
    blueF: '#E3F2FD', blueS: '#1976D2', blueD: '#0D47A1',
    amber: '#F9A825', amberD: '#E65100',
    line: '#455A64', ink: '#263238', muted: '#607D8B', green: '#1B5E20',
    grey: '#90A4AE', paper: '#FFFFFF'
  };

  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ---------- geometry helpers (arrowheads as real shapes) -------------- */
  function unit(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }
  function headSolid(x1, y1, x2, y2, L, W) {
    L = L || 11; W = W || 5;
    var u = unit(x1, y1, x2, y2), px = -u[1], py = u[0];
    var bx = x2 - L * u[0], by = y2 - L * u[1];
    return '<polygon points="' + x2 + ',' + y2 + ' ' + (bx + W * px) + ',' + (by + W * py) +
      ' ' + (bx - W * px) + ',' + (by - W * py) + '" fill="' + P.line + '"/>';
  }
  function headOpen(x1, y1, x2, y2, L, W) {
    L = L || 11; W = W || 5;
    var u = unit(x1, y1, x2, y2), px = -u[1], py = u[0];
    var bx = x2 - L * u[0], by = y2 - L * u[1];
    return '<polyline points="' + (bx + W * px) + ',' + (by + W * py) + ' ' + x2 + ',' + y2 +
      ' ' + (bx - W * px) + ',' + (by - W * py) +
      '" fill="none" stroke="' + P.line + '" stroke-width="1.4"/>';
  }
  function headTri(x1, y1, x2, y2) {
    var L = 15, W = 7.5, u = unit(x1, y1, x2, y2), px = -u[1], py = u[0];
    var bx = x2 - L * u[0], by = y2 - L * u[1];
    return '<polygon points="' + x2 + ',' + y2 + ' ' + (bx + W * px) + ',' + (by + W * py) +
      ' ' + (bx - W * px) + ',' + (by - W * py) +
      '" fill="#FFFFFF" stroke="' + P.line + '" stroke-width="1.4"/>';
  }
  function headDiamond(x1, y1, x2, y2, filled) {
    var L = 17, W = 6, u = unit(x1, y1, x2, y2), px = -u[1], py = u[0];
    var mx = x2 - (L / 2) * u[0], my = y2 - (L / 2) * u[1];
    var bx = x2 - L * u[0], by = y2 - L * u[1];
    return '<polygon points="' + x2 + ',' + y2 + ' ' + (mx + W * px) + ',' + (my + W * py) +
      ' ' + bx + ',' + by + ' ' + (mx - W * px) + ',' + (my - W * py) +
      '" fill="' + (filled ? P.line : '#FFFFFF') + '" stroke="' + P.line + '" stroke-width="1.3"/>';
  }
  function lineSeg(x1, y1, x2, y2, dashed) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="' + P.line + '" stroke-width="1.4"' +
      (dashed ? ' stroke-dasharray="6,4"' : '') + '/>';
  }
  function text(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 11) +
      '" fill="' + (o.fill || P.ink) + '" text-anchor="' + (o.anchor || 'start') +
      '" font-weight="' + (o.weight || 'normal') +
      (o.italic ? '" font-style="italic' : '') + '">' + esc(s) + '</text>';
  }
  /* shrink a box edge back to the shape outline so arrowheads sit outside */
  function edgeOfRect(cx, cy, w, h, tx, ty) {
    var dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    var sx = (w / 2) / Math.abs(dx || 1e-6), sy = (h / 2) / Math.abs(dy || 1e-6);
    var s = Math.min(sx, sy);
    return [cx + dx * s, cy + dy * s];
  }
  function edgeOfCircle(cx, cy, r, tx, ty) {
    var u = unit(cx, cy, tx, ty);
    return [cx + r * u[0], cy + r * u[1]];
  }
  function wrap(s, max) {
    var words = String(s).split(/\s+/), out = [], cur = '';
    words.forEach(function (w) {
      if (!cur.length) cur = w;
      else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    });
    if (cur.length) out.push(cur);
    return out;
  }

  /* ======================================================================
     PARSER
     ====================================================================== */
  function lines(src) {
    return src.split('\n').map(function (l) { return l.replace(/\s+$/, ''); })
      .filter(function (l) { return l.trim() && l.trim()[0] !== '#'; });
  }
  /* Split "A -> B : label" (or "A - B" for use case links).
     The target may itself begin with a colon (":Catalog"), so the label
     separator is the first colon that is followed by whitespace; only if
     there is no such colon do we fall back to any colon past position 0. */
  function edgeParts(rest) {
    var parts = rest.split(/\s*->\s*/);
    if (parts.length < 2) {
      parts = rest.split(/\s+-\s+/);
      if (parts.length < 2) return null;
    }
    var from = parts[0].trim();
    var rhs = parts.slice(1).join(' -> ').trim();

    var cut = -1, i;
    for (i = 1; i < rhs.length; i++) {
      if (rhs.charAt(i) === ':' && (i + 1 >= rhs.length || /\s/.test(rhs.charAt(i + 1)))) {
        cut = i; break;
      }
    }
    if (cut < 0) {
      for (i = 1; i < rhs.length; i++) {
        if (rhs.charAt(i) === ':') { cut = i; break; }
      }
    }
    if (cut < 0) return { from: from, to: rhs, label: '' };
    return {
      from: from,
      to: rhs.slice(0, cut).trim(),
      label: rhs.slice(cut + 1).trim()
    };
  }

  function parse(type, src) {
    var model = { type: type, title: '', nodes: [], edges: [], system: '', errors: [] };
    var ls = lines(src), i, L, kw, rest, m, parts;

    function node(id, kind, label, extra) {
      var n = { id: id, kind: kind, label: label };
      if (extra) Object.keys(extra).forEach(function (k) { n[k] = extra[k]; });
      model.nodes.push(n);
      return n;
    }
    function find(ref) {
      ref = String(ref).trim().toLowerCase();
      for (var k = 0; k < model.nodes.length; k++) {
        var n = model.nodes[k];
        if (n.id.toLowerCase() === ref) return n;
        if (String(n.label).toLowerCase() === ref) return n;
        if (n.num && String(n.num).toLowerCase() === ref) return n;
      }
      return null;
    }

    for (i = 0; i < ls.length; i++) {
      L = ls[i].trim();
      m = L.match(/^(\w+)\b\s*(.*)$/);
      if (!m) continue;
      kw = m[1].toLowerCase(); rest = m[2];

      if (kw === 'title') { model.title = rest; continue; }
      if (kw === 'system') { model.system = rest; continue; }

      /* ---------------- DFD ---------------- */
      if (type === 'dfd') {
        if (kw === 'entity') { node(rest, 'entity', rest); continue; }
        if (kw === 'process') {
          parts = rest.match(/^([\d.]+)\s+(.*)$/);
          if (parts) node(parts[1], 'process', parts[2], { num: parts[1] });
          else node(rest, 'process', rest);
          continue;
        }
        if (kw === 'store') {
          parts = rest.match(/^(D\d+)\s+(.*)$/i);
          if (parts) node(parts[1], 'store', parts[2], { sid: parts[1].toUpperCase() });
          else node(rest, 'store', rest, { sid: 'D' });
          continue;
        }
        if (kw === 'flow') {
          parts = edgeParts(rest);
          if (parts) model.edges.push({ from: parts.from, to: parts.to, label: parts.label, kind: 'flow' });
          else model.errors.push('Line ' + (i + 1) + ': flow needs  A -> B : label');
          continue;
        }
      }

      /* ---------------- USE CASE ---------------- */
      if (type === 'usecase') {
        if (kw === 'actor') { node(rest, 'actor', rest); continue; }
        if (kw === 'usecase') { node(rest, 'usecase', rest); continue; }
        if (kw === 'link') {
          parts = edgeParts(rest);
          if (parts) model.edges.push({ from: parts.from, to: parts.to, kind: 'assoc' });
          else model.errors.push('Line ' + (i + 1) + ': link needs  Actor - Use Case');
          continue;
        }
        if (kw === 'include' || kw === 'extend') {
          parts = edgeParts(rest);
          if (parts) model.edges.push({ from: parts.from, to: parts.to, kind: kw });
          else model.errors.push('Line ' + (i + 1) + ': ' + kw + ' needs  A -> B');
          continue;
        }
      }

      /* ---------------- CLASS ---------------- */
      if (type === 'class') {
        if (kw === 'class' || kw === 'abstract') {
          var abs = false, body = rest;
          if (kw === 'abstract') {
            abs = true;
            body = rest.replace(/^class\s+/i, '');
          }
          var nm = body.replace(/\{\s*$/, '').trim();
          var cls = node(nm, 'class', nm, { attrs: [], methods: [], abstract: abs });
          if (/\{\s*$/.test(body)) {
            for (i = i + 1; i < ls.length; i++) {
              var b = ls[i].trim();
              if (b === '}') break;
              if (b[0] === '+') cls.methods.push(b);
              else if (b[0] === '-' || b[0] === '#') cls.attrs.push(b);
            }
          }
          continue;
        }
        if (kw === 'inherit' || kw === 'compose' || kw === 'aggregate' || kw === 'assoc') {
          var mult = rest.match(/\[([^,\]]*),\s*([^\]]*)\]\s*$/);
          var body2 = mult ? rest.slice(0, mult.index) : rest;
          parts = edgeParts(body2);
          if (parts) {
            model.edges.push({
              from: parts.from, to: parts.to, label: parts.label, kind: kw,
              m1: mult ? mult[1].trim() : '', m2: mult ? mult[2].trim() : ''
            });
          } else model.errors.push('Line ' + (i + 1) + ': ' + kw + ' needs  A -> B');
          continue;
        }
      }

      /* ---------------- SEQUENCE ---------------- */
      if (type === 'sequence') {
        if (kw === 'participant' || kw === 'actor') {
          node(rest, kw === 'actor' ? 'sactor' : 'participant', rest);
          continue;
        }
        if (kw === 'call' || kw === 'return') {
          parts = edgeParts(rest);
          if (parts) model.edges.push({ from: parts.from, to: parts.to, label: parts.label, kind: kw });
          else model.errors.push('Line ' + (i + 1) + ': ' + kw + ' needs  A -> B : message');
          continue;
        }
      }

      model.errors.push('Line ' + (i + 1) + ': don’t recognise "' + m[1] + '"');
    }

    /* resolve edge endpoints to nodes; auto-create missing sequence participants */
    model.edges.forEach(function (e) {
      var a = find(e.from), b = find(e.to);
      if (!a && type === 'sequence') a = node(e.from, 'participant', e.from);
      if (!b && type === 'sequence') b = node(e.to, 'participant', e.to);
      if (!a) model.errors.push('Unknown: "' + e.from + '"');
      if (!b) model.errors.push('Unknown: "' + e.to + '"');
      e.a = a; e.b = b;
    });
    model.nodes = model.nodes.filter(function (n) { return n.label !== ''; });
    return model;
  }

  /* ======================================================================
     LAYOUT  (defaults only — saved drags always win)
     ====================================================================== */
  function layout(model, pos) {
    var t = model.type, i;

    function place(n, x, y) {
      var p = pos[n.id];
      n.x = p ? p.x : x;
      n.y = p ? p.y : y;
    }

    if (t === 'dfd') {
      var ents = model.nodes.filter(function (n) { return n.kind === 'entity'; });
      var procs = model.nodes.filter(function (n) { return n.kind === 'process'; });
      var sts = model.nodes.filter(function (n) { return n.kind === 'store'; });
      ents.forEach(function (n, k) { place(n, 130, 150 + k * 150); });
      procs.forEach(function (n, k) { place(n, 520, 150 + k * 165); });
      sts.forEach(function (n, k) { place(n, 920, 150 + k * 130); });
    } else if (t === 'usecase') {
      var acts = model.nodes.filter(function (n) { return n.kind === 'actor'; });
      var ucs = model.nodes.filter(function (n) { return n.kind === 'usecase'; });
      var half = Math.ceil(acts.length / 2);
      acts.forEach(function (n, k) {
        if (k < half) place(n, 120, 180 + k * 190);
        else place(n, 980, 180 + (k - half) * 190);
      });
      ucs.forEach(function (n, k) { place(n, 550, 165 + k * 100); });
    } else if (t === 'class') {
      /* masonry packing: drop each class into the currently shortest column,
         using its estimated height so the rows stay tight */
      var cs = model.nodes.filter(function (n) { return n.kind === 'class'; });
      var colX = [180, 580, 980], colY = [100, 100, 100];
      cs.forEach(function (n) {
        var h = (n.abstract ? 30 : 26) + n.attrs.length * 17 + 8 + n.methods.length * 17 + 8;
        var c = colY.indexOf(Math.min.apply(null, colY));
        place(n, colX[c], colY[c] + h / 2);
        colY[c] += h + 90;
      });
    } else if (t === 'sequence') {
      var ps = model.nodes.filter(function (n) {
        return n.kind === 'participant' || n.kind === 'sactor';
      });
      var gap = Math.max(210, Math.min(260, 1000 / Math.max(1, ps.length - 1)));
      ps.forEach(function (n, k) { n.x = 110 + k * gap; n.y = 78; });
      model.edges.forEach(function (e, k) { e.y = 150 + k * 46; });
    }
    return model;
  }

  /* ======================================================================
     RENDERERS
     ====================================================================== */
  function frame(w, h, title, body) {
    var head = '';
    if (title) {
      head = '<rect x="0" y="0" width="' + w + '" height="50" fill="' + P.brand + '"/>' +
        '<text x="' + (w / 2) + '" y="32" text-anchor="middle" fill="#FFFFFF" ' +
        'font-size="21" font-weight="bold">' + esc(title) + '</text>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
      '" viewBox="0 0 ' + w + ' ' + h + '" font-family="Arial, Helvetica, sans-serif">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#FFFFFF"/>' +
      head + body + '</svg>';
  }

  /* ---- shared shape drawing; every node wrapped in a draggable <g> ---- */
  function gWrap(n, inner) {
    return '<g class="dnode" data-id="' + esc(n.id) + '">' + inner + '</g>';
  }

  function drawEntity(n) {
    var w = 160, h = 70, x = n.x - w / 2, y = n.y - h / 2;
    var ls = wrap(n.label, 16), s = '';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="' + P.blueF + '" stroke="' + P.blueS + '" stroke-width="2"/>';
    ls.forEach(function (t, k) {
      s += text(n.x, n.y + 5 - (ls.length - 1) * 9 + k * 18, t,
        { size: 14, fill: P.blueD, anchor: 'middle', weight: 'bold' });
    });
    n.w = w; n.h = h;
    return gWrap(n, s);
  }
  function drawProcess(n) {
    var r = 58, s = '';
    s += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + r + '" fill="' + P.brandL +
      '" stroke="' + P.brand + '" stroke-width="2.2"/>';
    var ls = wrap(n.label, 13), top = n.y + 4 - (ls.length - 1) * 8 - (n.num ? 9 : 0);
    if (n.num) s += text(n.x, top - 8, n.num, { size: 12.5, fill: P.brandD, anchor: 'middle', weight: 'bold' });
    ls.forEach(function (t, k) {
      s += text(n.x, top + 9 + k * 16, t, { size: 12, fill: P.brandD, anchor: 'middle', weight: 'bold' });
    });
    n.r = r;
    return gWrap(n, s);
  }
  function drawStore(n) {
    var w = 200, h = 42, x = n.x - w / 2, y = n.y - h / 2, s = '';
    s += '<g stroke="' + P.amber + '" stroke-width="2">' +
      '<line x1="' + x + '" y1="' + y + '" x2="' + (x + w) + '" y2="' + y + '"/>' +
      '<line x1="' + x + '" y1="' + (y + h) + '" x2="' + (x + w) + '" y2="' + (y + h) + '"/>' +
      '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + h) + '"/>' +
      '<line x1="' + (x + 32) + '" y1="' + y + '" x2="' + (x + 32) + '" y2="' + (y + h) + '"/></g>';
    s += text(x + 16, n.y + 5, n.sid || 'D', { size: 12, fill: P.amberD, anchor: 'middle', weight: 'bold' });
    s += text(x + 32 + (w - 32) / 2, n.y + 5, n.label, { size: 12.5, fill: P.amberD, anchor: 'middle' });
    n.w = w; n.h = h;
    return gWrap(n, s);
  }
  function drawActor(n) {
    var x = n.x, y = n.y - 34, s = '';
    s += '<g stroke="#37474F" stroke-width="2" fill="none">' +
      '<circle cx="' + x + '" cy="' + y + '" r="12" fill="#ECEFF1"/>' +
      '<line x1="' + x + '" y1="' + (y + 12) + '" x2="' + x + '" y2="' + (y + 42) + '"/>' +
      '<line x1="' + (x - 18) + '" y1="' + (y + 24) + '" x2="' + (x + 18) + '" y2="' + (y + 24) + '"/>' +
      '<line x1="' + x + '" y1="' + (y + 42) + '" x2="' + (x - 14) + '" y2="' + (y + 66) + '"/>' +
      '<line x1="' + x + '" y1="' + (y + 42) + '" x2="' + (x + 14) + '" y2="' + (y + 66) + '"/></g>';
    s += text(x, y + 86, n.label, { size: 14, fill: P.ink, anchor: 'middle', weight: 'bold' });
    n.w = 40; n.h = 100;
    return gWrap(n, s);
  }
  function drawUseCase(n) {
    var ls = wrap(n.label, 16);
    var rx = Math.max(78, ls[0].length * 4.2 + 30), ry = 31, s = '';
    s += '<ellipse cx="' + n.x + '" cy="' + n.y + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + P.brandL + '" stroke="' + P.brand + '" stroke-width="1.8"/>';
    ls.forEach(function (t, k) {
      s += text(n.x, n.y + 5 - (ls.length - 1) * 8 + k * 16, t,
        { size: 12.5, fill: P.brandD, anchor: 'middle', weight: 'bold' });
    });
    n.rx = rx; n.ry = ry; n.w = rx * 2; n.h = ry * 2;
    return gWrap(n, s);
  }
  function drawClass(n) {
    var all = [n.label].concat(n.attrs, n.methods);
    var w = Math.max(190, Math.min(300, all.reduce(function (a, b) {
      return Math.max(a, String(b).length);
    }, 0) * 6.6 + 26));
    var hh = n.abstract ? 30 : 26;
    var ah = n.attrs.length * 17 + 8, mh = n.methods.length * 17 + 8;
    var h = hh + ah + mh, x = n.x - w / 2, y = n.y - h / 2, s = '';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="#FFFFFF" stroke="' + P.brand + '" stroke-width="1.8"/>';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh +
      '" fill="' + P.brandL + '" stroke="' + P.brand + '" stroke-width="1.8"/>';
    if (n.abstract) {
      s += text(x + w / 2, y + 18, n.label, { size: 14, fill: P.brandD, anchor: 'middle', weight: 'bold' });
      s += text(x + w / 2, y + 27, '«abstract»', { size: 9, fill: P.brandM, anchor: 'middle', italic: true });
    } else {
      s += text(x + w / 2, y + 19, n.label, { size: 14, fill: P.brandD, anchor: 'middle', weight: 'bold' });
    }
    var ay = y + hh;
    s += '<line x1="' + x + '" y1="' + ay + '" x2="' + (x + w) + '" y2="' + ay + '" stroke="' + P.brand + '" stroke-width="1"/>';
    n.attrs.forEach(function (a, k) { s += text(x + 10, ay + 16 + k * 17, a, { size: 11, fill: P.ink }); });
    var my = ay + ah;
    s += '<line x1="' + x + '" y1="' + my + '" x2="' + (x + w) + '" y2="' + my + '" stroke="' + P.brand + '" stroke-width="1"/>';
    n.methods.forEach(function (a, k) { s += text(x + 10, my + 16 + k * 17, a, { size: 11, fill: P.green }); });
    n.w = w; n.h = h;
    return gWrap(n, s);
  }

  function anchorOf(n, tx, ty) {
    if (n.r) return edgeOfCircle(n.x, n.y, n.r + 2, tx, ty);
    if (n.rx) {
      var u = unit(n.x, n.y, tx, ty);
      return [n.x + (n.rx + 2) * u[0], n.y + (n.ry + 2) * u[1]];
    }
    return edgeOfRect(n.x, n.y, (n.w || 120) + 4, (n.h || 60) + 4, tx, ty);
  }

  function bounds(model, pad) {
    var xs = [], ys = [];
    model.nodes.forEach(function (n) {
      var hw = (n.r || n.rx || (n.w || 120) / 2) + 10;
      var hh = (n.r || n.ry || (n.h || 60) / 2) + 10;
      xs.push(n.x - hw, n.x + hw); ys.push(n.y - hh, n.y + hh);
    });
    if (!xs.length) { xs = [0, 600]; ys = [0, 300]; }
    return {
      w: Math.ceil(Math.max.apply(null, xs) + pad),
      h: Math.ceil(Math.max.apply(null, ys) + pad)
    };
  }

  function render(model) {
    var t = model.type, body = '', b;

    if (t === 'sequence') return renderSequence(model);

    /* measure pass: draw nodes once so w/h/r are known, then draw edges under them */
    var nodeSvg = model.nodes.map(function (n) {
      if (n.kind === 'entity') return drawEntity(n);
      if (n.kind === 'process') return drawProcess(n);
      if (n.kind === 'store') return drawStore(n);
      if (n.kind === 'actor') return drawActor(n);
      if (n.kind === 'usecase') return drawUseCase(n);
      if (n.kind === 'class') return drawClass(n);
      return '';
    }).join('');

    /* system boundary for use case diagrams */
    var boundary = '';
    if (t === 'usecase') {
      var ucs = model.nodes.filter(function (n) { return n.kind === 'usecase'; });
      if (ucs.length) {
        var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
        ucs.forEach(function (n) {
          x1 = Math.min(x1, n.x - n.rx); x2 = Math.max(x2, n.x + n.rx);
          y1 = Math.min(y1, n.y - n.ry); y2 = Math.max(y2, n.y + n.ry);
        });
        x1 -= 56; x2 += 56; y1 -= 70; y2 += 46;
        boundary = '<rect x="' + x1 + '" y="' + y1 + '" width="' + (x2 - x1) +
          '" height="' + (y2 - y1) + '" rx="6" fill="#FAFAFF" stroke="' + P.brand +
          '" stroke-width="2"/>' +
          text((x1 + x2) / 2, y1 + 28, model.system || 'System', {
            size: 15, fill: P.brandD, anchor: 'middle', weight: 'bold'
          });
      }
    }

    model.edges.forEach(function (e) {
      if (!e.a || !e.b) return;
      var p1 = anchorOf(e.a, e.b.x, e.b.y), p2 = anchorOf(e.b, e.a.x, e.a.y);
      var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
      var dashed = (e.kind === 'include' || e.kind === 'extend');
      body += lineSeg(p1[0], p1[1], p2[0], p2[1], dashed);

      if (e.kind === 'flow') body += headSolid(p1[0], p1[1], p2[0], p2[1]);
      else if (e.kind === 'include' || e.kind === 'extend') {
        body += headOpen(p1[0], p1[1], p2[0], p2[1]);
        body += text(mx + 8, my - 5, '«' + e.kind + '»',
          { size: 11.5, fill: '#6A1B9A', italic: true });
      } else if (e.kind === 'inherit') body += headTri(p1[0], p1[1], p2[0], p2[1]);
      else if (e.kind === 'compose') body += headDiamond(p2[0], p2[1], p1[0], p1[1], true);
      else if (e.kind === 'aggregate') body += headDiamond(p2[0], p2[1], p1[0], p1[1], false);
      else if (e.kind === 'assoc') body += headSolid(p1[0], p1[1], p2[0], p2[1]);

      if (e.label) body += text(mx + 6, my - 6, e.label, { size: 11, fill: '#37474F' });
      if (e.m1) body += text(p1[0] + 8, p1[1] - 6, e.m1, { size: 11, fill: P.brand, weight: 'bold' });
      if (e.m2) body += text(p2[0] + 8, p2[1] - 6, e.m2, { size: 11, fill: P.brand, weight: 'bold' });
    });

    b = bounds(model, 40);
    return frame(Math.max(b.w, 760), Math.max(b.h, 420), model.title, boundary + body + nodeSvg);
  }

  function renderSequence(model) {
    var ps = model.nodes.filter(function (n) {
      return n.kind === 'participant' || n.kind === 'sactor';
    });
    if (!ps.length) return frame(760, 300, model.title, '');
    var msgs = model.edges.filter(function (e) { return e.a && e.b; });
    var maxX = ps[ps.length - 1].x + 150;
    var bottom = 150 + msgs.length * 46 + 70;
    var body = '';

    /* lifelines */
    ps.forEach(function (n) {
      body += '<line x1="' + n.x + '" y1="' + (n.y + 18) + '" x2="' + n.x + '" y2="' +
        (bottom + 20) + '" stroke="' + P.grey + '" stroke-width="1.3" stroke-dasharray="6,5"/>';
    });

    /* activation bars: pair each call with its matching return */
    var used = {};
    msgs.forEach(function (e, i) {
      if (e.kind !== 'call' || used[i]) return;
      var endY = e.y + 26;
      for (var j = i + 1; j < msgs.length; j++) {
        if (used[j]) continue;
        if (msgs[j].kind === 'return' && msgs[j].a === e.b && msgs[j].b === e.a) {
          endY = msgs[j].y + 8; used[j] = 1; break;
        }
      }
      body += '<rect x="' + (e.b.x - 5) + '" y="' + (e.y - 8) + '" width="10" height="' +
        Math.max(20, endY - (e.y - 8)) + '" fill="' + P.brandL + '" stroke="' + P.brand +
        '" stroke-width="1.2"/>';
    });

    /* messages */
    msgs.forEach(function (e) {
      var dir = e.b.x > e.a.x ? 1 : -1;
      var x1 = e.a.x + dir * 6, x2 = e.b.x - dir * 6;
      var ret = e.kind === 'return';
      body += lineSeg(x1, e.y, x2, e.y, ret);
      body += ret ? headOpen(x1, e.y, x2, e.y) : headSolid(x1, e.y, x2, e.y);
      body += text(Math.min(x1, x2) + 12, e.y - 7, e.label,
        { size: 11.5, fill: ret ? P.muted : P.ink });
    });

    /* header boxes last so they sit on top */
    ps.forEach(function (n) {
      var w = Math.max(130, n.label.length * 8.4 + 26), x = n.x - w / 2;
      var act = n.kind === 'sactor';
      body += gWrap(n,
        '<rect x="' + x + '" y="' + (n.y - 18) + '" width="' + w + '" height="36" fill="' +
        (act ? P.blueF : P.brandL) + '" stroke="' + (act ? P.blueS : P.brand) +
        '" stroke-width="2"/>' +
        text(n.x, n.y + 5, n.label, {
          size: 13, fill: act ? P.blueD : P.brandD, anchor: 'middle', weight: 'bold'
        }));
      n.w = w; n.h = 36;
    });

    return frame(Math.max(maxX, 760), bottom + 50, model.title, body);
  }

  /* ======================================================================
     TEMPLATES
     ====================================================================== */
  var TPL = {
    dfd: {
      label: 'DFD — Library, Level 1',
      text: [
        'title DFD Level 1 : Library Management System',
        '',
        'entity Member',
        'entity Librarian',
        '',
        'process 1.0 Manage Membership',
        'process 2.0 Search Catalog',
        'process 3.0 Issue Book',
        '',
        'store D1 Member DB',
        'store D2 Book Catalog DB',
        'store D3 Issue DB',
        '',
        'flow Member -> 1.0 : Registration details',
        'flow 1.0 -> D1 : Member record',
        'flow Member -> 2.0 : Search query',
        'flow D2 -> 2.0 : Book info',
        'flow Member -> 3.0 : Borrow request',
        'flow D1 -> 3.0 : Member status',
        'flow 3.0 -> D3 : Issue record',
        'flow Librarian -> 3.0 : Approve issue'
      ].join('\n')
    },
    usecase: {
      label: 'Use Case — Food Delivery',
      text: [
        'title Use Case Diagram : Online Food Delivery System',
        'system Online Food Delivery System',
        '',
        'actor Customer',
        'actor Restaurant',
        '',
        'usecase Register / Login',
        'usecase Browse Menu',
        'usecase Place Order',
        'usecase Make Payment',
        'usecase Apply Coupon',
        'usecase Accept Order',
        '',
        'link Customer - Register / Login',
        'link Customer - Browse Menu',
        'link Customer - Place Order',
        'link Restaurant - Accept Order',
        '',
        'include Place Order -> Make Payment',
        'extend Apply Coupon -> Place Order'
      ].join('\n')
    },
    'class': {
      label: 'Class — Orders',
      text: [
        'title Class Diagram : Online Food Delivery System',
        '',
        'abstract class User {',
        '- userId : int',
        '- name : String',
        '+ login()',
        '+ logout()',
        '}',
        '',
        'class Customer {',
        '- deliveryAddress : String',
        '+ placeOrder()',
        '+ trackOrder()',
        '}',
        '',
        'class Order {',
        '- orderId : int',
        '- totalAmount : double',
        '+ calculateTotal()',
        '}',
        '',
        'class OrderItem {',
        '- quantity : int',
        '+ calculateSubtotal()',
        '}',
        '',
        'inherit Customer -> User',
        'assoc Customer -> Order : places [1,*]',
        'compose Order -> OrderItem : contains [1,1..*]'
      ].join('\n')
    },
    sequence: {
      label: 'Sequence — Issue Book',
      text: [
        'title Sequence Diagram : Issue Book',
        '',
        'actor Member',
        'participant :LibrarySystem',
        'participant :Catalog',
        'participant :IssueRecord',
        '',
        'call Member -> :LibrarySystem : requestIssue(bookId)',
        'call :LibrarySystem -> :Catalog : checkAvailability(bookId)',
        'return :Catalog -> :LibrarySystem : copy available',
        'call :LibrarySystem -> :IssueRecord : createIssue(memberId, copyId)',
        'return :IssueRecord -> :LibrarySystem : issueId + dueDate',
        'return :LibrarySystem -> Member : issue slip + due date'
      ].join('\n')
    }
  };

  var CHEAT = {
    dfd: [
      ['entity Customer', 'an external entity (rectangle)'],
      ['process 2.0 Place Order', 'a process (circle), numbered'],
      ['store D1 Order DB', 'a data store (open rectangle)'],
      ['flow Customer -> 2.0 : Order request', 'a data flow (labelled arrow)'],
      ['title DFD Level 1 : ...', 'the purple heading bar']
    ],
    usecase: [
      ['system Library Management System', 'label on the boundary box'],
      ['actor Member', 'a stick-figure actor'],
      ['usecase Issue Book', 'a use case (oval)'],
      ['link Member - Issue Book', 'an association (plain line)'],
      ['include Issue Book -> Check Availability', 'always happens'],
      ['extend Pay Fine -> Return Book', 'optional / conditional']
    ],
    'class': [
      ['class Order {', 'open a class; close it with }'],
      ['- orderId : int', 'a private attribute'],
      ['+ calculateTotal()', 'a public method'],
      ['abstract class User {', 'an abstract class'],
      ['inherit Customer -> User', 'generalization (hollow triangle)'],
      ['compose Order -> OrderItem [1,1..*]', 'composition (filled diamond)'],
      ['aggregate Team -> Player [1,*]', 'aggregation (hollow diamond)'],
      ['assoc Customer -> Order : places [1,*]', 'association + multiplicity']
    ],
    sequence: [
      ['actor Member', 'an actor lifeline (blue header)'],
      ['participant :LibrarySystem', 'an object lifeline'],
      ['call A -> B : method()', 'solid line, filled arrowhead'],
      ['return B -> A : result', 'dashed line, open arrowhead'],
      ['', 'messages appear in the order you write them']
    ]
  };

  /* ======================================================================
     UI WIRING
     ====================================================================== */
  var elType = document.getElementById('dType');
  var elSrc = document.getElementById('dSrc');
  var elOut = document.getElementById('dOut');
  var elErr = document.getElementById('dErr');
  var elCheat = document.getElementById('dCheat');
  var elTplBtn = document.getElementById('dTpl');
  var elReset = document.getElementById('dReset');
  var elDl = document.getElementById('dDownload');
  var elCopy = document.getElementById('dCopy');
  var elClear = document.getElementById('dClear');
  if (!elType || !elSrc || !elOut) return;

  var state = { positions: {}, svg: '', model: null };
  var KEY = 'se-builder';

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        type: elType.value, src: elSrc.value, pos: state.positions
      }));
    } catch (e) { /* storage unavailable — the page still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (d && d.src) {
        elType.value = d.type || 'dfd';
        elSrc.value = d.src;
        state.positions = d.pos || {};
        return true;
      }
    } catch (e) { /* ignore corrupt or blocked storage */ }
    return false;
  }

  function showCheat() {
    var rows = CHEAT[elType.value] || [];
    elCheat.innerHTML = rows.map(function (r) {
      return '<tr><td><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td></tr>';
    }).join('');
  }

  function build() {
    var model = parse(elType.value, elSrc.value);
    layout(model, state.positions);
    state.svg = render(model);
    state.model = model;
    elOut.innerHTML = state.svg;
    elErr.innerHTML = model.errors.length
      ? '<strong>' + model.errors.length + ' issue' + (model.errors.length > 1 ? 's' : '') +
        ':</strong> ' + esc(model.errors.slice(0, 4).join(' · '))
      : '';
    elErr.hidden = !model.errors.length;
    bindDrag();
    save();
  }

  /* ---- dragging ------------------------------------------------------- */
  function bindDrag() {
    var svg = elOut.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('.dnode').forEach(function (g) {
      g.style.cursor = 'grab';
      g.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var id = g.getAttribute('data-id');
        var node = null;
        state.model.nodes.forEach(function (n) { if (n.id === id) node = n; });
        if (!node) return;
        var box = svg.getBoundingClientRect();
        var vb = svg.viewBox.baseVal;
        var scale = vb.width / box.width;
        var startX = ev.clientX, startY = ev.clientY;
        var ox = node.x, oy = node.y;
        g.style.cursor = 'grabbing';

        function move(e2) {
          var nx = ox + (e2.clientX - startX) * scale;
          var ny = oy + (e2.clientY - startY) * scale;
          state.positions[id] = { x: Math.round(nx), y: Math.round(ny) };
          build();
        }
        function up() {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          save();
        }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    });
  }

  /* ---- actions -------------------------------------------------------- */
  function slug(s) {
    return (s || 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '').slice(0, 60) || 'diagram';
  }

  elType.addEventListener('change', function () {
    elSrc.value = TPL[elType.value].text;
    state.positions = {};
    showCheat(); build();
  });
  elSrc.addEventListener('input', build);
  elTplBtn.addEventListener('click', function () {
    elSrc.value = TPL[elType.value].text;
    state.positions = {}; build();
  });
  elReset.addEventListener('click', function () { state.positions = {}; build(); });
  elClear.addEventListener('click', function () {
    elSrc.value = 'title My Diagram\n'; state.positions = {}; build(); elSrc.focus();
  });
  elDl.addEventListener('click', function () {
    var blob = new Blob([state.svg], { type: 'image/svg+xml' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug(state.model && state.model.title) + '.svg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  elCopy.addEventListener('click', function () {
    var done = function () {
      elCopy.textContent = 'Copied';
      setTimeout(function () { elCopy.textContent = 'Copy SVG'; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(state.svg).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = state.svg; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta); done();
    }
  });

  if (!restore()) elSrc.value = TPL.dfd.text;
  showCheat();
  build();
})();
