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
    if (type === 'dfd0') type = 'dfd';
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


      /* ---------------- ACTIVITY ---------------- */
      if (type === 'activity') {
        if (kw === 'start' || kw === 'end') {
          node(kw + '#' + model.nodes.length, 'act-' + kw, kw); continue;
        }
        if (kw === 'action' || kw === 'decision' || kw === 'else') {
          node(kw + '#' + model.nodes.length, 'act-' + kw, rest); continue;
        }
      }

      /* ---------------- STATE CHART ---------------- */
      if (type === 'state') {
        if (kw === 'state') { node(rest, 'state', rest); continue; }
        if (kw === 'initial') { model.initial = rest; continue; }
        if (kw === 'final') { model.final = rest; continue; }
        if (kw === 'trans') {
          parts = edgeParts(rest);
          if (parts) model.edges.push({ from: parts.from, to: parts.to, label: parts.label, kind: 'trans' });
          else model.errors.push('Line ' + (i + 1) + ': trans needs  A -> B : event');
          continue;
        }
      }

      /* ---------------- ER ---------------- */
      if (type === 'er') {
        if (kw === 'erentity') { node(rest, 'erentity', rest, { attrs: [] }); continue; }
        if (kw === 'erkey' || kw === 'erattr') {
          var ix = rest.indexOf(':');
          if (ix > 0) {
            var en = rest.slice(0, ix).trim(), an = rest.slice(ix + 1).trim();
            var tgt = find(en);
            if (tgt) tgt.attrs.push({ n: an, key: kw === 'erkey' });
            else model.errors.push('Line ' + (i + 1) + ': unknown entity "' + en + '"');
          }
          continue;
        }
        if (kw === 'errel') {
          var mm = rest.match(/\[([^,\]]*),\s*([^\]]*)\]\s*$/);
          var bb = mm ? rest.slice(0, mm.index) : rest;
          parts = edgeParts(bb);
          if (parts) {
            model.edges.push({
              from: parts.from, to: parts.to, label: parts.label || 'relates', kind: 'errel',
              m1: mm ? mm[1].trim() : '1', m2: mm ? mm[2].trim() : 'N'
            });
          } else model.errors.push('Line ' + (i + 1) + ': errel needs  A - B : name [1,N]');
          continue;
        }
      }

      /* ---------------- COMPONENT ---------------- */
      if (type === 'component') {
        if (kw === 'component') { node(rest, 'component', rest); continue; }
        if (kw === 'database') { node(rest, 'database', rest); continue; }
        if (kw === 'depend') {
          parts = edgeParts(rest);
          if (parts) model.edges.push({ from: parts.from, to: parts.to, label: parts.label, kind: 'depend' });
          else model.errors.push('Line ' + (i + 1) + ': depend needs  A -> B : label');
          continue;
        }
      }

      /* ---------------- DEPLOYMENT ---------------- */
      if (type === 'deployment') {
        if (kw === 'node') { node(rest, 'dnode', rest, { arts: [] }); continue; }
        if (kw === 'artifact') {
          var jx = rest.indexOf(':');
          if (jx > 0) {
            var nn = rest.slice(0, jx).trim(), aa = rest.slice(jx + 1).trim();
            var tg = find(nn);
            if (tg) tg.arts.push(aa);
            else model.errors.push('Line ' + (i + 1) + ': unknown node "' + nn + '"');
          }
          continue;
        }
        if (kw === 'conn') {
          parts = edgeParts(rest);
          if (parts) model.edges.push({ from: parts.from, to: parts.to, label: parts.label, kind: 'conn' });
          else model.errors.push('Line ' + (i + 1) + ': conn needs  A -> B : protocol');
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
      if (!a && type === 'component') a = node(e.from, 'component', e.from);
      if (!b && type === 'component') b = node(e.to, 'component', e.to);
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
      if (procs.length === 1 && sts.length === 0) {
        /* context diagram: the single bubble in the middle, entities either side */
        var rows = Math.ceil(ents.length / 2), gap = 200, top = 150;
        ents.forEach(function (n, k) {
          var side = k % 2 === 0 ? 180 : 1080;
          place(n, side, top + Math.floor(k / 2) * gap);
        });
        place(procs[0], 630, top + ((rows - 1) * gap) / 2);
      } else {
        ents.forEach(function (n, k) { place(n, 130, 150 + k * 150); });
        procs.forEach(function (n, k) { place(n, 520, 150 + k * 165); });
        sts.forEach(function (n, k) { place(n, 920, 150 + k * 130); });
      }
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
    } else if (t === 'activity') {
      var steps = model.nodes.filter(function (n) { return n.kind.indexOf('act-') === 0; });
      var ay = 96, prevMain = null;
      steps.forEach(function (n) {
        if (n.kind === 'act-else') { n._owner = prevMain; return; }
        var hh = n.kind === 'act-decision' ? 92 : (n.kind === 'act-action' ? 54 : 38);
        place(n, 430, ay + hh / 2);
        ay += hh + 48;
        prevMain = n;
      });
      steps.forEach(function (n) {
        if (n.kind !== 'act-else') return;
        place(n, 790, n._owner ? n._owner.y : 160);
      });
    } else if (t === 'state') {
      var sts = model.nodes.filter(function (n) { return n.kind === 'state'; });
      sts.forEach(function (n, k) { place(n, 420, 150 + k * 122); });
    } else if (t === 'er') {
      var es = model.nodes.filter(function (n) { return n.kind === 'erentity'; });
      var ex = 240;
      es.forEach(function (n) {
        var span = Math.max(200, (n.attrs.length - 1) * 150 + 140);
        place(n, ex + span / 2, 470);
        ex += span + 80;
      });
    } else if (t === 'component') {
      var cps = model.nodes.filter(function (n) { return n.kind === 'component'; });
      var dbs = model.nodes.filter(function (n) { return n.kind === 'database'; });
      cps.forEach(function (n, k) {
        place(n, 240 + (k % 3) * 340, 150 + Math.floor(k / 3) * 180);
      });
      var base = 150 + Math.ceil(cps.length / 3) * 180 + 30;
      dbs.forEach(function (n, k) { place(n, 330 + k * 380, base); });
    } else if (t === 'deployment') {
      var nds = model.nodes.filter(function (n) { return n.kind === 'dnode'; });
      nds.forEach(function (n, k) {
        var hh = 76 + n.arts.length * 36;
        place(n, 360, 150 + k * 250);
        n._h = hh;
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
    var r = (n.num === '0') ? 92 : 58, s = '';
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
    if (t === 'activity') return renderActivity(model);
    if (t === 'state') return renderState(model);
    if (t === 'er') return renderER(model);
    if (t === 'component') return renderComponent(model);
    if (t === 'deployment') return renderDeployment(model);

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


  /* ---- curved connector, used by the state chart ---------------------- */
  function curvePath(x1, y1, x2, y2, bulge) {
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    var cx = mx + (-dy / len) * bulge, cy = my + (dx / len) * bulge;
    return { d: 'M' + x1 + ',' + y1 + ' Q' + cx + ',' + cy + ' ' + x2 + ',' + y2,
             cx: cx, cy: cy,
             lx: 0.25 * x1 + 0.5 * cx + 0.25 * x2,
             ly: 0.25 * y1 + 0.5 * cy + 0.25 * y2 };
  }

  /* ====================== ACTIVITY ====================== */
  function renderActivity(model) {
    var steps = model.nodes.filter(function (n) { return n.kind.indexOf('act-') === 0; });
    var main = steps.filter(function (n) { return n.kind !== 'act-else'; });
    var body = '', shapes = '';

    steps.forEach(function (n) {
      var s = '';
      if (n.kind === 'act-start') {
        n.w = 32; n.h = 32;
        s = '<circle cx="' + n.x + '" cy="' + n.y + '" r="15" fill="' + P.line + '"/>';
      } else if (n.kind === 'act-end') {
        n.w = 38; n.h = 38;
        s = '<circle cx="' + n.x + '" cy="' + n.y + '" r="17" fill="#FFFFFF" stroke="' + P.line + '" stroke-width="2"/>' +
            '<circle cx="' + n.x + '" cy="' + n.y + '" r="10" fill="' + P.line + '"/>';
      } else if (n.kind === 'act-decision') {
        var dw = Math.max(170, n.label.length * 7.4 + 44), dh = 92;
        n.w = dw; n.h = dh;
        s = '<polygon points="' + n.x + ',' + (n.y - dh / 2) + ' ' + (n.x + dw / 2) + ',' + n.y +
            ' ' + n.x + ',' + (n.y + dh / 2) + ' ' + (n.x - dw / 2) + ',' + n.y +
            '" fill="#FFF8E1" stroke="' + P.amber + '" stroke-width="2"/>';
        wrap(n.label, 22).forEach(function (t, k, arr) {
          s += text(n.x, n.y + 5 - (arr.length - 1) * 8 + k * 16, t,
            { size: 12.5, fill: P.amberD, anchor: 'middle', weight: 'bold' });
        });
      } else {
        var isElse = n.kind === 'act-else';
        var w = Math.max(190, n.label.length * 7.2 + 36), h = 54;
        n.w = w; n.h = h;
        s = '<rect x="' + (n.x - w / 2) + '" y="' + (n.y - h / 2) + '" width="' + w +
            '" height="' + h + '" rx="26" fill="' + (isElse ? '#FFF1F1' : P.brandL) +
            '" stroke="' + (isElse ? '#C62828' : P.brand) + '" stroke-width="2"/>';
        s += text(n.x, n.y + 5, n.label,
          { size: 13, fill: isElse ? '#B71C1C' : P.brandD, anchor: 'middle', weight: 'bold' });
      }
      shapes += gWrap(n, s);
    });

    /* sequential flow down the main column */
    main.forEach(function (n, k) {
      if (k === main.length - 1) return;
      var nx = main[k + 1];
      var y1 = n.y + (n.h || 40) / 2, y2 = nx.y - (nx.h || 40) / 2;
      body += lineSeg(n.x, y1, nx.x, y2);
      body += headSolid(n.x, y1, nx.x, y2);
      if (n.kind === 'act-decision') {
        body += text(n.x + 8, (y1 + y2) / 2 + 4, '[ Yes ]', { size: 11, fill: P.muted });
      }
    });

    /* each else branch: No out of the decision, then a retry loop back */
    steps.forEach(function (n) {
      if (n.kind !== 'act-else' || !n._owner) return;
      var d = n._owner;
      var x1 = d.x + (d.w || 160) / 2, x2 = n.x - (n.w || 180) / 2;
      body += lineSeg(x1, d.y, x2, n.y);
      body += headSolid(x1, d.y, x2, n.y);
      body += text((x1 + x2) / 2 - 16, Math.min(d.y, n.y) - 8, '[ No ]', { size: 11, fill: P.muted });

      var idx = main.indexOf(d);
      var back = idx > 0 ? main[idx - 1] : null;
      if (back) {
        var ty = back.y, tx = back.x + (back.w || 160) / 2;
        body += '<path d="M' + n.x + ',' + (n.y - (n.h || 54) / 2) + ' L' + n.x + ',' + ty +
          ' L' + (tx + 14) + ',' + ty + '" fill="none" stroke="' + P.line + '" stroke-width="1.4"/>';
        body += headSolid(tx + 40, ty, tx + 2, ty);
      }
    });

    var b = bounds(model, 50);
    return frame(Math.max(b.w, 760), Math.max(b.h, 420), model.title, body + shapes);
  }

  /* ====================== STATE CHART ====================== */
  function renderState(model) {
    var sts = model.nodes.filter(function (n) { return n.kind === 'state'; });
    var body = '', shapes = '';

    sts.forEach(function (n) {
      var w = Math.max(190, n.label.length * 8 + 40), h = 54;
      n.w = w; n.h = h;
      var s = '<rect x="' + (n.x - w / 2) + '" y="' + (n.y - h / 2) + '" width="' + w +
        '" height="' + h + '" rx="16" fill="' + P.brandL + '" stroke="' + P.brand +
        '" stroke-width="2"/>';
      s += text(n.x, n.y + 5, n.label, { size: 13, fill: P.brandD, anchor: 'middle', weight: 'bold' });
      shapes += gWrap(n, s);
    });

    function byName(nm) {
      var r = null;
      sts.forEach(function (n) { if (n.label === nm) r = n; });
      return r;
    }

    /* initial pseudo-state */
    var init = byName(model.initial);
    if (init) {
      var ix = init.x - (init.w / 2) - 80, iy = init.y;
      body += '<circle cx="' + ix + '" cy="' + iy + '" r="13" fill="' + P.line + '"/>';
      body += lineSeg(ix + 13, iy, init.x - init.w / 2 - 2, iy);
      body += headSolid(ix + 13, iy, init.x - init.w / 2 - 2, iy);
    }
    /* final state marker */
    var fin = byName(model.final);
    if (fin) {
      var fx = fin.x + (fin.w / 2) + 80, fy = fin.y;
      body += lineSeg(fin.x + fin.w / 2 + 2, fy, fx - 18, fy);
      body += headSolid(fin.x + fin.w / 2 + 2, fy, fx - 18, fy);
      body += '<circle cx="' + fx + '" cy="' + fy + '" r="16" fill="#FFFFFF" stroke="' + P.line + '" stroke-width="2"/>';
      body += '<circle cx="' + fx + '" cy="' + fy + '" r="9" fill="' + P.line + '"/>';
    }

    var detourR = 0, detourL = 0, maxOff = 0;
    model.edges.forEach(function (e) {
      if (!e.a || !e.b) return;
      var i1 = sts.indexOf(e.a), i2 = sts.indexOf(e.b);
      var forward = i2 > i1, span = Math.abs(i2 - i1);
      var p1, p2, bulge, right;
      if (span <= 1) {
        /* neighbours: a short curve between the facing edges */
        p1 = [e.a.x + (forward ? 22 : -22), e.a.y + (forward ? e.a.h / 2 : -e.a.h / 2)];
        p2 = [e.b.x + (forward ? 22 : -22), e.b.y + (forward ? -e.b.h / 2 : e.b.h / 2)];
        bulge = forward ? 30 : -30;
        right = forward;
      } else {
        /* longer hops detour around the side so they clear the state boxes */
        right = forward;
        var k = right ? detourR++ : detourL++;
        var off = (e.a.w / 2) + 80 + k * 86;
        if (off > maxOff) maxOff = off;
        p1 = [e.a.x + (right ? e.a.w / 2 : -e.a.w / 2), e.a.y];
        p2 = [e.b.x + (right ? e.b.w / 2 : -e.b.w / 2), e.b.y];
        bulge = right ? -off * 2 : off * 2;
      }
      var c = curvePath(p1[0], p1[1], p2[0], p2[1], bulge);
      body += '<path d="' + c.d + '" fill="none" stroke="' + P.line + '" stroke-width="1.4"/>';
      body += headSolid(c.cx, c.cy, p2[0], p2[1]);
      if (e.label) {
        body += text(c.lx + (right ? 8 : -8), c.ly - 5, e.label,
          { size: 11, fill: '#37474F', anchor: right ? 'start' : 'end' });
      }
    });

    var b = bounds(model, 120 + maxOff + 130);
    return frame(Math.max(b.w, 820), Math.max(b.h, 420), model.title, body + shapes);
  }

  /* ====================== ER (Chen notation) ====================== */
  function renderER(model) {
    var es = model.nodes.filter(function (n) { return n.kind === 'erentity'; });
    var body = '', shapes = '';

    es.forEach(function (n) {
      var w = Math.max(170, n.label.length * 9 + 36), h = 56;
      n.w = w; n.h = h;
      var s = '<rect x="' + (n.x - w / 2) + '" y="' + (n.y - h / 2) + '" width="' + w +
        '" height="' + h + '" fill="' + P.blueF + '" stroke="' + P.blueS + '" stroke-width="2"/>';
      s += text(n.x, n.y + 5, n.label, { size: 14, fill: P.blueD, anchor: 'middle', weight: 'bold' });
      shapes += gWrap(n, s);

      /* attribute ellipses fanned above the entity */
      var k = n.attrs.length;
      n.attrs.forEach(function (a, j) {
        var ax = n.x + (j - (k - 1) / 2) * 150;
        var ay = n.y - (j % 2 === 0 ? 150 : 216);
        var rx = Math.max(56, a.n.length * 4.2 + 18);
        body += lineSeg(n.x + (ax - n.x) * 0.22, n.y - h / 2, ax, ay + 24);
        body += '<ellipse cx="' + ax + '" cy="' + ay + '" rx="' + rx + '" ry="24" fill="#FFFFFF" stroke="' +
          P.blueS + '" stroke-width="1.6"/>';
        body += text(ax, ay + 4, a.n, { size: 11.5, fill: P.blueD, anchor: 'middle' });
        if (a.key) {
          body += '<line x1="' + (ax - a.n.length * 3.2) + '" y1="' + (ay + 7) + '" x2="' +
            (ax + a.n.length * 3.2) + '" y2="' + (ay + 7) + '" stroke="' + P.blueD + '" stroke-width="1.2"/>';
        }
      });
    });

    model.edges.forEach(function (e) {
      if (!e.a || !e.b) return;
      var i1 = es.indexOf(e.a), i2 = es.indexOf(e.b);
      var adjacent = Math.abs(i1 - i2) === 1;
      var dx = (e.a.x + e.b.x) / 2;
      var dy = adjacent ? e.a.y : e.a.y + 210;
      var dw = Math.max(150, (e.label.length * 6.6) + 40), dh = 72;

      var p1 = anchorOf(e.a, dx, dy), p2 = anchorOf(e.b, dx, dy);
      body += lineSeg(p1[0], p1[1], dx - dw / 2 + 6, dy);
      body += lineSeg(dx + dw / 2 - 6, dy, p2[0], p2[1]);
      body += text(dx - dw / 2 - 14, dy - 9, e.m1, { size: 12.5, fill: P.brandD, anchor: 'end', weight: 'bold' });
      body += text(dx + dw / 2 + 14, dy - 9, e.m2, { size: 12.5, fill: P.brandD, anchor: 'start', weight: 'bold' });
      body += '<polygon points="' + dx + ',' + (dy - dh / 2) + ' ' + (dx + dw / 2) + ',' + dy +
        ' ' + dx + ',' + (dy + dh / 2) + ' ' + (dx - dw / 2) + ',' + dy +
        '" fill="#FFF8E1" stroke="' + P.amber + '" stroke-width="2"/>';
      body += text(dx, dy + 4, e.label, { size: 12, fill: P.amberD, anchor: 'middle', weight: 'bold' });
    });

    var b = bounds(model, 150);
    return frame(Math.max(b.w, 860), Math.max(b.h + 150, 620), model.title, body + shapes);
  }

  /* ====================== COMPONENT ====================== */
  function renderComponent(model) {
    var body = '', shapes = '';

    model.nodes.forEach(function (n) {
      var s = '';
      if (n.kind === 'database') {
        var dw = Math.max(170, n.label.length * 8 + 34), dh = 86;
        n.w = dw; n.h = dh;
        var x = n.x - dw / 2, y = n.y - dh / 2;
        s += '<path d="M' + x + ',' + (y + 16) + ' L' + x + ',' + (y + dh - 16) +
          ' A' + (dw / 2) + ',16 0 0 0 ' + (x + dw) + ',' + (y + dh - 16) +
          ' L' + (x + dw) + ',' + (y + 16) + ' Z" fill="#FFF8E1" stroke="' + P.amber + '" stroke-width="2"/>';
        s += '<ellipse cx="' + n.x + '" cy="' + (y + 16) + '" rx="' + (dw / 2) + '" ry="16" fill="#FFFDF5" stroke="' +
          P.amber + '" stroke-width="2"/>';
        s += text(n.x, n.y + 16, n.label, { size: 12.5, fill: P.amberD, anchor: 'middle', weight: 'bold' });
      } else {
        var w = Math.max(215, n.label.length * 7.6 + 50), h = 76;
        n.w = w; n.h = h;
        var bx = n.x - w / 2, by = n.y - h / 2;
        s += '<rect x="' + bx + '" y="' + by + '" width="' + w + '" height="' + h +
          '" fill="' + P.brandL + '" stroke="' + P.brand + '" stroke-width="2"/>';
        s += '<rect x="' + (bx - 9) + '" y="' + (by + 14) + '" width="18" height="13" fill="#FFFFFF" stroke="' + P.brand + '" stroke-width="1.6"/>';
        s += '<rect x="' + (bx - 9) + '" y="' + (by + 44) + '" width="18" height="13" fill="#FFFFFF" stroke="' + P.brand + '" stroke-width="1.6"/>';
        s += text(n.x + w / 2 - 10, by + 17, '«component»',
          { size: 9.5, fill: P.brandM, anchor: 'end', italic: true });
        wrap(n.label, 22).forEach(function (t, k, arr) {
          s += text(n.x, n.y + 12 - (arr.length - 1) * 8 + k * 16, t,
            { size: 13, fill: P.brandD, anchor: 'middle', weight: 'bold' });
        });
      }
      shapes += gWrap(n, s);
    });

    model.edges.forEach(function (e) {
      if (!e.a || !e.b) return;
      var p1 = anchorOf(e.a, e.b.x, e.b.y), p2 = anchorOf(e.b, e.a.x, e.a.y);
      body += lineSeg(p1[0], p1[1], p2[0], p2[1], true);
      body += headOpen(p1[0], p1[1], p2[0], p2[1]);
      if (e.label) {
        body += text((p1[0] + p2[0]) / 2 + 6, (p1[1] + p2[1]) / 2 - 5,
          '«' + e.label + '»', { size: 10.5, fill: P.muted, italic: true });
      }
    });

    var b = bounds(model, 50);
    return frame(Math.max(b.w, 860), Math.max(b.h, 420), model.title, body + shapes);
  }

  /* ====================== DEPLOYMENT ====================== */
  function renderDeployment(model) {
    var body = '', shapes = '';
    var D = 16;

    model.nodes.forEach(function (n) {
      var w = 300, h = 70 + n.arts.length * 36;
      n.w = w; n.h = h;
      var x = n.x - w / 2, y = n.y - h / 2;
      var s = '';
      /* 3-D box: front face plus top and right faces */
      s += '<polygon points="' + x + ',' + y + ' ' + (x + D) + ',' + (y - D) + ' ' +
        (x + w + D) + ',' + (y - D) + ' ' + (x + w) + ',' + y +
        '" fill="#D8CEF2" stroke="' + P.brand + '" stroke-width="1.8"/>';
      s += '<polygon points="' + (x + w) + ',' + y + ' ' + (x + w + D) + ',' + (y - D) + ' ' +
        (x + w + D) + ',' + (y + h - D) + ' ' + (x + w) + ',' + (y + h) +
        '" fill="#C9BCEC" stroke="' + P.brand + '" stroke-width="1.8"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
        '" fill="' + P.brandL + '" stroke="' + P.brand + '" stroke-width="2"/>';
      s += text(n.x, y + 20, '«device»', { size: 9.5, fill: P.brandM, anchor: 'middle', italic: true });
      s += text(n.x, y + 40, n.label, { size: 13.5, fill: P.brandD, anchor: 'middle', weight: 'bold' });
      n.arts.forEach(function (a, k) {
        var ay = y + 54 + k * 36;
        s += '<rect x="' + (x + 18) + '" y="' + ay + '" width="' + (w - 36) + '" height="28" fill="#FFFFFF" stroke="' +
          P.brand + '" stroke-width="1.4"/>';
        s += text(x + 28, ay + 18, '«artifact»  ' + a, { size: 11, fill: P.ink });
      });
      shapes += gWrap(n, s);
    });

    model.edges.forEach(function (e) {
      if (!e.a || !e.b) return;
      var p1 = anchorOf(e.a, e.b.x, e.b.y), p2 = anchorOf(e.b, e.a.x, e.a.y);
      body += lineSeg(p1[0], p1[1], p2[0], p2[1], false);
      if (e.label) {
        body += text((p1[0] + p2[0]) / 2 + 10, (p1[1] + p2[1]) / 2 + 4, e.label,
          { size: 11.5, fill: '#37474F' });
      }
    });

    var b = bounds(model, 60);
    return frame(Math.max(b.w + 30, 760), Math.max(b.h, 420), model.title, body + shapes);
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
     SYNTAX CHEAT SHEETS (for the optional advanced editor)
     ====================================================================== */
  var CHEAT = {
    dfd0: [
      ['entity Customer', 'an external entity (rectangle)'],
      ['process 0 Food Delivery System', 'the single context process'],
      ['flow Customer -> 0 : Order details', 'a data flow into the system'],
      ['flow 0 -> Customer : Confirmation', 'a data flow back out']
    ],
    dfd: [
      ['entity Customer', 'an external entity (rectangle)'],
      ['process 2.0 Place Order', 'a process (circle), numbered'],
      ['store D1 Order DB', 'a data store (open rectangle)'],
      ['flow Customer -> 2.0 : Order request', 'a data flow (labelled arrow)']
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
      ['aggregate Invoice -> Service [1,*]', 'aggregation (hollow diamond)'],
      ['assoc Customer -> Order : places [1,*]', 'association + multiplicity']
    ],
    sequence: [
      ['actor Member', 'an actor lifeline (blue header)'],
      ['participant :LibrarySystem', 'an object lifeline'],
      ['call A -> B : method()', 'solid line, filled arrowhead'],
      ['return B -> A : result', 'dashed line, open arrowhead']
    ],
    activity: [
      ['start', 'the initial node (filled circle)'],
      ['action Login to the system', 'an activity (rounded rectangle)'],
      ['decision Valid member?', 'a decision (diamond)'],
      ['else Show error message', 'the No branch, loops back to retry'],
      ['end', 'the final node (bullseye)']
    ],
    state: [
      ['state Issued', 'a state (rounded rectangle)'],
      ['initial Available', 'where the lifecycle starts'],
      ['final Lost', 'where the lifecycle ends'],
      ['trans Available -> Issued : issueBook()', 'a transition + its trigger']
    ],
    er: [
      ['erentity Member', 'an entity (rectangle)'],
      ['erkey Member : memberId', 'the primary key (underlined)'],
      ['erattr Member : name', 'an ordinary attribute (ellipse)'],
      ['errel Member - Book : borrows [1,N]', 'a relationship (diamond) + cardinality']
    ],
    component: [
      ['component Order Service', 'a component box'],
      ['database Order DB', 'a database (cylinder)'],
      ['depend A -> B : uses', 'a dependency (dashed arrow)']
    ],
    deployment: [
      ['node Application Server', 'a hardware node (3-D box)'],
      ['artifact Application Server : Web App', 'something deployed on that node'],
      ['conn Client Device -> Application Server : HTTPS', 'a communication path']
    ]
  };

  /* ======================================================================
     UI WIRING
     ====================================================================== */
  var elType = document.getElementById('dType');
  var elSubj = document.getElementById('dSubject');
  var elSrc = document.getElementById('dSrc');
  var elOut = document.getElementById('dOut');
  var elErr = document.getElementById('dErr');
  var elCheat = document.getElementById('dCheat');
  var elRegen = document.getElementById('dRegen');
  var elReset = document.getElementById('dReset');
  var elDl = document.getElementById('dDownload');
  var elCopy = document.getElementById('dCopy');
  var elCaption = document.getElementById('dCaption');
  if (!elType || !elSubj || !elOut) return;

  var state = { positions: {}, svg: '', model: null, custom: false };
  var KEY = 'se-builder-v2';

  /* fill the subject dropdown from the library */
  var LIB = (window.SUBJECTS && window.SUBJECTS.list) ? window.SUBJECTS.list : [];
  LIB.forEach(function (sub) {
    var o = document.createElement('option');
    o.value = sub.id; o.textContent = sub.name;
    elSubj.appendChild(o);
  });
  if (!LIB.length) {
    /* subjects.js did not load - say so plainly instead of showing an empty list */
    var miss = document.createElement('option');
    miss.value = ''; miss.textContent = 'Subject library did not load';
    elSubj.appendChild(miss);
    elSubj.disabled = true;
    elErr.hidden = false;
    elErr.innerHTML = '<strong>assets/subjects.js did not load.</strong> ' +
      'You may be viewing an older copy of this page \u2014 hard-refresh with ' +
      'Ctrl+Shift+R (Cmd+Shift+R on a Mac), or re-download the latest files.';
    return;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        type: elType.value, subject: elSubj.value, src: elSrc.value,
        pos: state.positions, custom: state.custom
      }));
    } catch (e) { /* storage unavailable — the page still works */ }
  }
  function restore() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d || !d.src) return false;
      if (d.type) elType.value = d.type;
      if (d.subject) elSubj.value = d.subject;
      elSrc.value = d.src;
      state.positions = d.pos || {};
      state.custom = !!d.custom;
      return true;
    } catch (e) { return false; }
  }

  function showCheat() {
    var rows = CHEAT[elType.value] || [];
    elCheat.innerHTML = rows.map(function (r) {
      return '<tr><td><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td></tr>';
    }).join('');
  }

  function caption() {
    var t = elType.options[elType.selectedIndex].textContent;
    var sj = elSubj.options[elSubj.selectedIndex].textContent;
    elCaption.textContent = t + ' · ' + sj + (state.custom ? ' · edited' : '');
  }

  function generate() {
    if (!window.SUBJECTS) return;
    elSrc.value = window.SUBJECTS.spec(elType.value, elSubj.value);
    state.positions = {};
    state.custom = false;
    build();
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
    caption();
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
        var scale = vb.width / (box.width || 1);
        var startX = ev.clientX, startY = ev.clientY, ox = node.x, oy = node.y;
        g.style.cursor = 'grabbing';
        function move(e2) {
          state.positions[id] = {
            x: Math.round(ox + (e2.clientX - startX) * scale),
            y: Math.round(oy + (e2.clientY - startY) * scale)
          };
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
  function slug(s2) {
    return (s2 || 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '').slice(0, 70) || 'diagram';
  }

  elType.addEventListener('change', function () { showCheat(); generate(); });
  elSubj.addEventListener('change', generate);
  elRegen.addEventListener('click', generate);
  elReset.addEventListener('click', function () { state.positions = {}; build(); });
  elSrc.addEventListener('input', function () { state.custom = true; build(); });

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

  showCheat();
  if (restore()) build(); else generate();
})();
