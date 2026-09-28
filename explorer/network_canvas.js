/* Canvas network adapted from the original Letters to Networks explorer. */
(() => {
  'use strict';
  const data = window.CLASSROOM_DATA;
  const archive = window.NET_DATA.views.merged;
  const archiveDocs = window.NET_DATA.docs;
  const extraPositions = window.CLASS_OVERLAY_POSITIONS;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[char]));
  const letters = new Map(data.letters.map(letter => [letter.docId, letter]));
  const pairs = new Map();
  const communityColors = ['#2a78d6','#e96a38','#19a878','#8173bc','#aa8b38'];
  const keyFor = (a, b) => [a, b].sort().join('\u0000');
  const short = name => {
    const comma = name.indexOf(',');
    if (comma < 0) return name.length > 28 ? name.slice(0, 27) + '…' : name;
    const family = name.slice(0, comma), given = name.slice(comma + 1).trim();
    if (family === 'Lafayette') return given.includes('marquise de') ? 'Lafayette, Adrienne' : 'Lafayette, Joseph';
    return `${family}, ${given.split(/[\s-]+/).filter(part => /^[A-Z]/.test(part)).map(part => part[0] + '.').join(' ')}`;
  };
  const nodes = archive.nodes.map(node => ({id:node.id, x:node.x, y:node.y, community:node.k}));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const classNames = [...new Set(data.letters.flatMap(letter => [letter.writer, letter.addressee]))];
  const missing = classNames.filter(name => !byId.has(name));
  for (const name of missing) {
    const neighbors = data.letters.flatMap(letter => letter.writer === name ? [letter.addressee]
      : letter.addressee === name ? [letter.writer] : []).filter(other => byId.has(other));
    const anchor = neighbors.length ? byId.get(neighbors[0]) : {x:0, y:0, community:0};
    const position = extraPositions[name];
    if (!position) throw new Error(`Missing archive overlay position for ${name}`);
    const node = {id:name, x:position[0], y:position[1], community:anchor.community};
    nodes.push(node); byId.set(name, node);
  }
  const names = nodes.map(node => node.id).sort((a,b) => a.localeCompare(b));
  for (const [a, b, weight] of archive.links) {
    const key = keyFor(a, b);
    pairs.set(key, {key, a, b, archiveWeight:weight, letters:[], annotations:[]});
  }
  for (const letter of data.letters) {
    const key = keyFor(letter.writer, letter.addressee);
    if (!pairs.has(key)) pairs.set(key, {key, a:letter.writer, b:letter.addressee, archiveWeight:0, letters:[], annotations:[]});
    pairs.get(key).letters.push(letter);
  }
  for (const edge of pairs.values()) if (!edge.archiveWeight) edge.archiveWeight = edge.letters.length;
  const canvas = $('networkCanvas'), ctx = canvas.getContext('2d');
  const state = {annotations:[], viewer:null, selected:null, hover:null,
    showBase:true, showAnnotations:true, k:1, fitK:1, tx:0, ty:0, w:0, h:0, dpr:1, initialized:false};
  let drag = null, visiblePairs = [], adjacency = new Map(), strength = null, radii = new Map();

  function tieStrength(edges) {
    const values = new Map(names.map(name => [name, 0]));
    for (const edge of edges) {
      const weight = (state.showBase ? edge.archiveWeight : 0) + (state.showAnnotations ? edge.annotations.length : 0);
      values.set(edge.a, values.get(edge.a) + weight);
      values.set(edge.b, values.get(edge.b) + weight);
    }
    return values;
  }
  function recalculate() {
    const live = new Map([...pairs].map(([key, edge]) => [key, {...edge, annotations:[]}]));
    for (const annotation of state.annotations) {
      const letter = letters.get(annotation.docId);
      if (!letter) continue;
      const key = keyFor(letter.writer, letter.addressee);
      live.get(key).annotations.push({...annotation, source:letter.writer, target:letter.addressee});
    }
    visiblePairs = [...live.values()].filter(edge => (state.showBase && edge.archiveWeight) || (state.showAnnotations && edge.annotations.length));
    adjacency = new Map(names.map(name => [name, new Set()]));
    for (const edge of visiblePairs) {adjacency.get(edge.a).add(edge.b); adjacency.get(edge.b).add(edge.a);}
    strength = tieStrength(visiblePairs);
    const maxRadiusValue = Math.max(1, ...strength.values());
    radii = new Map(nodes.map(node => [node.id, 3 + 18 * Math.sqrt(strength.get(node.id) / maxRadiusValue)]));
    const legend = [...new Set(nodes.map(node => node.community))].sort((a,b) => a-b).map(index => [`Community ${index + 1}`, communityColors[index % communityColors.length]]);
    $('graphLegend').innerHTML = legend.map(([label, color]) => `<div><span style="background:${color}"></span>${esc(label)}</div>`).join('')
      + '<div><span class="relation-key"></span>Class relation</div>';
    detail(); draw();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const changed = rect.width !== state.w || rect.height !== state.h;
    state.w = rect.width; state.h = rect.height; state.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(state.w * state.dpr); canvas.height = Math.round(state.h * state.dpr);
    if (!state.initialized || changed) fit();
    draw();
  }
  function fit() {
    if (!state.w || !state.h) return;
    const xs = nodes.map(node => node.x), ys = nodes.map(node => node.y);
    const pad = Math.min(54, Math.max(20, state.w * .06));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    state.k = Math.min((state.w - 2 * pad) / (x1 - x0 || 1), (state.h - 2 * pad) / (y1 - y0 || 1));
    state.fitK = state.k;
    state.tx = state.w / 2 - state.k * (x0 + x1) / 2;
    state.ty = state.h / 2 - state.k * (y0 + y1) / 2;
    state.initialized = true;
  }
  const sx = node => state.tx + state.k * node.x;
  const sy = node => state.ty + state.k * node.y;
  const radius = node => radii.get(node.id) || 3;
  function draw() {
    if (!state.w || !strength) return;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.w, state.h);
    const focus = state.selected?.kind === 'node' ? byId.get(state.selected.name) : state.hover?.kind === 'node' ? byId.get(state.hover.name) : null;
    const selectedPair = state.selected?.kind === 'edge' ? state.selected.key : null;
    const adjacent = focus ? adjacency.get(focus.id) : null;
    const relatedNodes = new Set();
    for (const edge of visiblePairs) {
      const a = byId.get(edge.a), b = byId.get(edge.b);
      const dim = focus && a !== focus && b !== focus;
      if (state.showBase) {
        ctx.beginPath(); ctx.moveTo(sx(a), sy(a)); ctx.lineTo(sx(b), sy(b));
        ctx.strokeStyle = selectedPair === edge.key ? '#202b33' : dim ? 'rgba(120,135,150,.11)' : focus ? 'rgba(100,115,130,.44)' : 'rgba(100,115,130,.23)';
        ctx.lineWidth = selectedPair === edge.key ? 2.4 : Math.min(2.3, .55 + Math.sqrt(edge.archiveWeight) * .17); ctx.stroke();
      }
      if (state.showAnnotations && edge.annotations.length) {
        relatedNodes.add(edge.a); relatedNodes.add(edge.b);
        ctx.beginPath(); ctx.moveTo(sx(a), sy(a)); ctx.lineTo(sx(b), sy(b));
        ctx.strokeStyle = dim ? 'rgba(155,56,163,.25)' : selectedPair === edge.key ? '#74287b' : '#9b38a3';
        ctx.lineWidth = selectedPair === edge.key ? 5 : Math.min(4.5, 2 + Math.sqrt(edge.annotations.length) * .7); ctx.stroke();
      }
    }
    const order = [...nodes].sort((a,b) => radius(b) - radius(a));
    for (const node of order) {
      const dim = focus && node !== focus && !adjacent.has(node.id);
      ctx.beginPath(); ctx.arc(sx(node), sy(node), radius(node), 0, Math.PI * 2);
      ctx.globalAlpha = dim ? .28 : 1;
      ctx.fillStyle = communityColors[node.community % communityColors.length];
      ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke();
      if (relatedNodes.has(node.id)) {
        ctx.beginPath(); ctx.arc(sx(node), sy(node), radius(node) + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#9b38a3'; ctx.lineWidth = 1.8; ctx.stroke();
      }
      if (state.selected?.kind === 'node' && state.selected.name === node.id) {
        ctx.beginPath(); ctx.arc(sx(node), sy(node), radius(node) + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#15181c'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    const labels = focus ? [focus, ...[...adjacent].map(name => byId.get(name)).sort((a,b) => strength.get(b.id) - strength.get(a.id)).slice(0,7)]
      : [...nodes].sort((a,b) => strength.get(b.id) - strength.get(a.id)).slice(0,9);
    ctx.font = '500 11px "IBM Plex Sans", sans-serif'; ctx.textBaseline = 'middle';
    for (const node of labels) {
      const x = sx(node) + radius(node) + 4, y = sy(node), label = short(node.id);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.strokeText(label, x, y);
      ctx.fillStyle = '#15181c'; ctx.fillText(label, x, y);
    }
  }
  function nodeAt(x, y) {
    let best = null, distance = Infinity;
    for (const node of nodes) {
      const d = Math.hypot(sx(node) - x, sy(node) - y);
      if (d < radius(node) + 2 && d < distance) {best = node; distance = d;}
    }
    return best;
  }
  function edgeAt(x, y) {
    let best = null, score = Infinity;
    for (const edge of visiblePairs) {
      const a = byId.get(edge.a), b = byId.get(edge.b);
      const x1 = sx(a), y1 = sy(a), x2 = sx(b), y2 = sy(b), dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
      const annotated = state.showAnnotations && edge.annotations.length > 0;
      if (d > (annotated ? 7 : 5)) continue;
      const candidate = d - (annotated ? 3 : 0);
      if (candidate < score) {best = edge; score = candidate;}
    }
    return best;
  }
  function selectPerson(name, center = false) {
    const node = byId.get(name); if (!node) return;
    state.selected = {kind:'node', name};
    if (center) {state.tx = state.w / 2 - state.k * node.x; state.ty = state.h / 2 - state.k * node.y;}
    $('findPerson').value = name; detail(); draw();
  }
  function selectTie(edge) {
    state.selected = {kind:'edge', key:edge.key};
    $('findPerson').value = '';
    detail(); draw();
  }
  function clearSelection() {
    state.selected = null; state.hover = null; $('findPerson').value = '';
    $('graphTip').classList.add('hidden'); detail(); draw();
  }
  function detail() {
    const target = $('graphDetail');
    if (!state.selected) {target.innerHTML = '<h3>Select a person or line</h3><p class="status">Click for letters and annotations. Drag to pan; scroll to zoom.</p>'; return;}
    if (state.selected.kind === 'node') {
      const name = state.selected.name, related = visiblePairs.filter(edge => edge.a === name || edge.b === name);
      const annotations = related.flatMap(edge => edge.annotations.filter(item => item.source === name || item.target === name));
      const archiveList = archiveDocs[name] || [];
      const linked = archiveList.slice(0, -1);
      const classLetters = data.letters.filter(letter => letter.writer === name || letter.addressee === name);
      const sources = linked.length ? linked.map(([date, title, id]) =>
        `<p><a href="https://founders.archives.gov/documents/${esc(id)}" target="_blank" rel="noopener">${esc(date)} · ${esc(title)} ↗</a></p>`).join('')
        : classLetters.slice(0, 12).map(letter => `<p><a href="${esc(letter.catalogUrl)}" target="_blank" rel="noopener">${esc(letter.date)} · ${esc(letter.title)} ↗</a></p>`).join('');
      target.innerHTML = `<p class="eyebrow">Correspondent</p><h2>${esc(name)}</h2>
        <div class="detail-entry"><strong>Class relations</strong>${annotations.map(item => `<div class="annotation"><strong>${esc(item.type)}</strong><p>${esc(item.note)}</p><small>${esc(letters.get(item.docId).date)} · ${esc(author(item))}</small></div>`).join('') || '<p>None yet.</p>'}</div>
        <div class="detail-entry"><strong>Source links</strong>${sources || '<p>No linked sources in this view.</p>'}</div>`;
      return;
    }
    const edge = visiblePairs.find(item => item.key === state.selected.key);
    if (!edge) {clearSelection(); return;}
    target.innerHTML = `<p class="eyebrow">Correspondence tie</p><h2>${esc(short(edge.a))} ↔ ${esc(short(edge.b))}</h2>
      <div class="detail-entry"><strong>Class relations</strong>${edge.annotations.map(item => `<div class="annotation"><strong>${esc(item.source)} → ${esc(item.target)} · ${esc(item.type)}</strong><p>${esc(item.note)}</p><small>${esc(letters.get(item.docId).date)} · ${esc(author(item))}</small></div>`).join('') || '<p>None yet.</p>'}</div>
      <div class="detail-entry"><strong>Class letters on this tie</strong>${edge.letters.map(letter => `<p><a href="${esc(letter.catalogUrl)}" target="_blank" rel="noopener">${esc(letter.date)} · ${esc(letter.title)} ↗</a></p>`).join('') || '<p>None in the assigned corpus.</p>'}</div>`;
  }
  function author(item) {
    return item.student === 'simulated' ? 'Simulated class' : item.student === state.viewer ? 'Your annotation' : `Student ${item.student}`;
  }
  function showTip(hit, x, y) {
    const tip = $('graphTip');
    if (!hit) {tip.classList.add('hidden'); return;}
    tip.innerHTML = hit.kind === 'node'
      ? `<strong>${esc(hit.name)}</strong>`
      : `<strong>${esc(short(hit.edge.a))} ↔ ${esc(short(hit.edge.b))}</strong>${hit.edge.annotations.map(item => `<div class="hover-relation"><b>${esc(item.type)}</b><p>${esc(item.note)}</p></div>`).join('')}`;
    tip.classList.remove('hidden');
    tip.style.left = `${Math.max(10, Math.min(x + 14, state.w - tip.offsetWidth - 10))}px`;
    tip.style.top = `${Math.max(10, Math.min(y + 14, state.h - tip.offsetHeight - 10))}px`;
  }
  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    drag = {x:event.offsetX, y:event.offsetY, tx:state.tx, ty:state.ty, moved:false};
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (drag) {
      const dx = event.offsetX - drag.x, dy = event.offsetY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (drag.moved) {state.tx = drag.tx + dx; state.ty = drag.ty + dy; draw();}
      return;
    }
    const node = nodeAt(event.offsetX, event.offsetY);
    const edge = node ? null : edgeAt(event.offsetX, event.offsetY);
    state.hover = node ? {kind:'node', name:node.id} : edge ? {kind:'edge', key:edge.key} : null;
    showTip(node ? {kind:'node', name:node.id} : edge ? {kind:'edge', edge} : null, event.offsetX, event.offsetY);
    draw();
  });
  canvas.addEventListener('pointerup', event => {
    canvas.classList.remove('dragging');
    if (drag && !drag.moved) {
      const node = nodeAt(event.offsetX, event.offsetY);
      const edge = node ? null : edgeAt(event.offsetX, event.offsetY);
      if (node) selectPerson(node.id);
      else if (edge) selectTie(edge);
      else clearSelection();
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => {drag = null; canvas.classList.remove('dragging');});
  canvas.addEventListener('pointerleave', event => {
    if ($('graphTip').contains(event.relatedTarget)) return;
    state.hover = null; $('graphTip').classList.add('hidden'); draw();
  });
  $('graphTip').addEventListener('pointerleave', () => {
    state.hover = null; $('graphTip').classList.add('hidden'); draw();
  });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const scale = Math.exp(-event.deltaY * .0015);
    const next = Math.max(state.fitK * .6, Math.min(state.fitK * 12, state.k * scale));
    const ratio = next / state.k;
    state.tx = event.offsetX - (event.offsetX - state.tx) * ratio;
    state.ty = event.offsetY - (event.offsetY - state.ty) * ratio;
    state.k = next; draw();
  }, {passive:false});
  $('resetGraph').addEventListener('click', () => {drag = null; resize(); fit(); clearSelection();});
  $('clearGraph').addEventListener('click', clearSelection);
  $('findPerson').addEventListener('change', event => {
    const query = event.target.value.trim().toLowerCase();
    if (!query) {clearSelection(); return;}
    const name = names.find(item => item.toLowerCase() === query) || names.find(item => item.toLowerCase().includes(query));
    if (name) selectPerson(name, true);
  });
  $('personNames').innerHTML = names.map(name => `<option value="${esc(name)}">`).join('');
  for (const id of ['showBase','showAnnotations']) $(id).addEventListener('change', () => {
    state.showBase = $('showBase').checked; state.showAnnotations = $('showAnnotations').checked; recalculate();
  });
  new ResizeObserver(resize).observe($('graphStage'));
  window.classNetwork = {
    update(annotations, viewer) {state.annotations = annotations; state.viewer = viewer; recalculate(); resize();},
    reveal() {resize(); if (!state.initialized) {fit(); draw();}},
    selectPerson,
    view() {return {scale:state.k, tx:state.tx, ty:state.ty, nodes:nodes.length, ties:visiblePairs.length,
      annotations:state.annotations.length, selected:state.selected};}
  };
})();
