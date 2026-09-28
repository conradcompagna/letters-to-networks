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
  const colors = {Franklin:'#2a78d6', Adams:'#e96a38', Jefferson:'#19a878', Jay:'#777570'};
  const communityColors = ['#2a78d6','#e96a38','#19a878','#8173bc','#aa8b38'];
  const keyFor = (a, b) => [a, b].sort().join('\u0000');
  const short = name => {
    const comma = name.indexOf(',');
    if (comma < 0) return name.length > 28 ? name.slice(0, 27) + '…' : name;
    const family = name.slice(0, comma), given = name.slice(comma + 1).trim();
    if (family === 'Lafayette') return given.includes('marquise de') ? 'Lafayette, Adrienne' : 'Lafayette, Joseph';
    return `${family}, ${given.split(/[\s-]+/).filter(part => /^[A-Z]/.test(part)).map(part => part[0] + '.').join(' ')}`;
  };
  const nodes = archive.nodes.map(node => ({id:node.id, x:node.x, y:node.y,
    edition:node.e, community:node.k, documents:node.s + node.r}));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const classNames = [...new Set(data.letters.flatMap(letter => [letter.writer, letter.addressee]))];
  const missing = classNames.filter(name => !byId.has(name));
  for (const name of missing) {
    const neighbors = data.letters.flatMap(letter => letter.writer === name ? [letter.addressee]
      : letter.addressee === name ? [letter.writer] : []).filter(other => byId.has(other));
    const anchor = neighbors.length ? byId.get(neighbors[0]) : {x:0, y:0, community:0};
    const documents = data.letters.filter(letter => letter.writer === name || letter.addressee === name).length;
    const editions = new Map();
    for (const letter of data.letters.filter(item => item.writer === name || item.addressee === name)) {
      const edition = letter.docId.split('/')[0];
      editions.set(edition, (editions.get(edition) || 0) + 1);
    }
    const position = extraPositions[name];
    if (!position) throw new Error(`Missing archive overlay position for ${name}`);
    const node = {id:name, x:position[0], y:position[1],
      edition:[...editions].sort((a,b) => b[1] - a[1])[0]?.[0] || 'Franklin',
      community:anchor.community, documents};
    nodes.push(node); byId.set(name, node);
  }
  const names = nodes.map(node => node.id).sort((a,b) => a.localeCompare(b));
  const docCounts = new Map(nodes.map(node => [node.id, node.documents]));
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
  const state = {annotations:[], viewer:null, selected:null, hover:null, color:'edition', size:'strength',
    showBase:true, showAnnotations:true, k:1, fitK:1, tx:0, ty:0, w:0, h:0, dpr:1, initialized:false};
  let drag = null, visiblePairs = [], adjacency = new Map(), measures = null, radii = new Map();

  function metrics(edges) {
    const neighbors = new Map(names.map(name => [name, new Set()]));
    const strength = new Map(names.map(name => [name, 0]));
    for (const edge of edges) {
      neighbors.get(edge.a).add(edge.b); neighbors.get(edge.b).add(edge.a);
      const weight = (state.showBase ? edge.archiveWeight : 0) + (state.showAnnotations ? edge.annotations.length : 0);
      strength.set(edge.a, strength.get(edge.a) + weight);
      strength.set(edge.b, strength.get(edge.b) + weight);
    }
    const between = new Map(names.map(name => [name, 0]));
    for (const source of names) {
      const stack = [], queue = [source], predecessors = new Map(names.map(name => [name, []]));
      const distance = new Map(names.map(name => [name, -1]));
      const paths = new Map(names.map(name => [name, 0]));
      distance.set(source, 0); paths.set(source, 1);
      for (let index = 0; index < queue.length; index++) {
        const v = queue[index]; stack.push(v);
        for (const w of neighbors.get(v)) {
          if (distance.get(w) < 0) {distance.set(w, distance.get(v) + 1); queue.push(w);}
          if (distance.get(w) === distance.get(v) + 1) {
            paths.set(w, paths.get(w) + paths.get(v)); predecessors.get(w).push(v);
          }
        }
      }
      const dependency = new Map(names.map(name => [name, 0]));
      while (stack.length) {
        const w = stack.pop();
        for (const v of predecessors.get(w)) dependency.set(v, dependency.get(v) + paths.get(v) / paths.get(w) * (1 + dependency.get(w)));
        if (w !== source) between.set(w, between.get(w) + dependency.get(w) / 2);
      }
    }
    return {neighbors, strength, between};
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
    $('classTieNames').innerHTML = visiblePairs.filter(edge => edge.annotations.length)
      .map(edge => `<option value="${esc(edge.a)} ↔ ${esc(edge.b)}">`).join('');
    adjacency = new Map(names.map(name => [name, new Set()]));
    for (const edge of visiblePairs) {adjacency.get(edge.a).add(edge.b); adjacency.get(edge.b).add(edge.a);}
    measures = metrics(visiblePairs);
    const valueFor = node => state.size === 'strength' ? measures.strength.get(node.id)
      : state.size === 'documents' ? docCounts.get(node.id)
      : state.size === 'neighbors' ? measures.neighbors.get(node.id).size : measures.between.get(node.id);
    const maxRadiusValue = Math.max(1, ...nodes.map(valueFor));
    radii = new Map(nodes.map(node => [node.id, 3 + 18 * Math.sqrt(valueFor(node) / maxRadiusValue)]));
    const letterCount = state.showBase ? archive.summary.letters : 0;
    const annotationCount = state.showAnnotations ? state.annotations.length : 0;
    $('graphMetrics').innerHTML = [
      [names.length, 'shown nodes'], [visiblePairs.length, 'visible ties'],
      [letterCount.toLocaleString(), 'archive document edges'], [annotationCount, 'class relations']
    ].map(([number, label]) => `<div><b>${number}</b><small>${label}</small></div>`).join('');
    const legend = state.color === 'edition'
      ? Object.entries(colors).map(([name, color]) => [name + ' Papers', color])
      : [...new Set(nodes.map(node => node.community))].sort((a,b) => a-b).map(index => [`Community ${index + 1}`, communityColors[index % communityColors.length]]);
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
    const xs = nodes.map(node => node.x), ys = nodes.map(node => node.y), pad = 54;
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
    if (!state.w || !measures) return;
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
      ctx.fillStyle = state.color === 'edition' ? colors[node.edition] || '#aaa' : communityColors[node.community % communityColors.length];
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
    const labels = focus ? [focus, ...[...adjacent].map(name => byId.get(name)).sort((a,b) => docCounts.get(b.id) - docCounts.get(a.id)).slice(0,7)]
      : [...nodes].sort((a,b) => docCounts.get(b.id) - docCounts.get(a.id)).slice(0,9);
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
      if (d < radius(node) + 5 && d < distance) {best = node; distance = d;}
    }
    return best;
  }
  function edgeAt(x, y) {
    let best = null, distance = 8;
    for (const edge of visiblePairs) {
      const a = byId.get(edge.a), b = byId.get(edge.b);
      const x1 = sx(a), y1 = sy(a), x2 = sx(b), y2 = sy(b), dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
      if (d < distance) {best = edge; distance = d;}
    }
    return best;
  }
  function selectPerson(name, center = false) {
    const node = byId.get(name); if (!node) return;
    state.selected = {kind:'node', name};
    if (center) {state.tx = state.w / 2 - state.k * node.x; state.ty = state.h / 2 - state.k * node.y;}
    $('findPerson').value = name; $('findClassTie').value = ''; detail(); draw();
  }
  function selectTie(edge, center = false) {
    state.selected = {kind:'edge', key:edge.key};
    if (center) {
      state.k = Math.max(state.k, state.fitK * 2);
      state.tx = state.w / 2 - state.k * (byId.get(edge.a).x + byId.get(edge.b).x) / 2;
      state.ty = state.h / 2 - state.k * (byId.get(edge.a).y + byId.get(edge.b).y) / 2;
    }
    $('findPerson').value = ''; $('findClassTie').value = `${edge.a} ↔ ${edge.b}`;
    detail(); draw();
  }
  function clearSelection() {
    state.selected = null; state.hover = null; $('findPerson').value = ''; $('findClassTie').value = '';
    $('graphTip').classList.add('hidden'); detail(); draw();
  }
  function detail() {
    const target = $('graphDetail');
    if (!state.selected) {target.innerHTML = '<h3>Select a person or tie</h3><p class="status">Click a node or line to inspect its letters and annotated relations.</p>'; return;}
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
        <p>${docCounts.get(name)} archival document endpoints · ${measures.neighbors.get(name).size} visible neighbors</p>
        <p>${measures.strength.get(name)} visible tie weight · ${measures.between.get(name).toFixed(1)} betweenness</p>
        <div class="detail-entry"><strong>Class relations (${annotations.length})</strong>${annotations.map(item => `<div class="annotation"><strong>${esc(item.type)}</strong><p>${esc(item.note)}</p><small>${esc(letters.get(item.docId).date)} · ${esc(author(item))}</small></div>`).join('') || '<p>None yet.</p>'}</div>
        <div class="detail-entry"><strong>Largest archival ties</strong>${related.sort((a,b) => b.archiveWeight - a.archiveWeight).slice(0,10).map(edge => `<p>${esc(short(edge.a === name ? edge.b : edge.a))} · ${edge.archiveWeight} document edges</p>`).join('')}</div>
        <div class="detail-entry"><strong>Source links</strong>${sources || '<p>No linked sources in this view.</p>'}</div>`;
      return;
    }
    const edge = visiblePairs.find(item => item.key === state.selected.key);
    if (!edge) {clearSelection(); return;}
    target.innerHTML = `<p class="eyebrow">Correspondence tie</p><h2>${esc(short(edge.a))} ↔ ${esc(short(edge.b))}</h2>
      <p>${edge.archiveWeight} archival document edges · ${edge.annotations.length} class relations · ${(state.showBase ? edge.archiveWeight : 0) + (state.showAnnotations ? edge.annotations.length : 0)} visible tie weight</p>
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
      ? `<strong>${esc(hit.name)}</strong><br>${docCounts.get(hit.name)} documents · ${measures.neighbors.get(hit.name).size} neighbors`
      : `<strong>${esc(short(hit.edge.a))} ↔ ${esc(short(hit.edge.b))}</strong><br>${hit.edge.archiveWeight} document edges · ${hit.edge.annotations.length} relations`;
    tip.style.left = `${Math.min(x + 14, state.w - 240)}px`;
    tip.style.top = `${Math.min(y + 14, state.h - 55)}px`;
    tip.classList.remove('hidden');
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
  canvas.addEventListener('pointerleave', () => {state.hover = null; $('graphTip').classList.add('hidden'); draw();});
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
  $('findClassTie').addEventListener('change', event => {
    const query = event.target.value.trim().toLowerCase();
    if (!query) {clearSelection(); return;}
    const annotated = visiblePairs.filter(edge => edge.annotations.length);
    const tie = annotated.find(edge => `${edge.a} ↔ ${edge.b}`.toLowerCase() === query)
      || annotated.find(edge => `${edge.a} ↔ ${edge.b}`.toLowerCase().includes(query));
    if (tie) selectTie(tie, true);
  });
  $('personNames').innerHTML = names.map(name => `<option value="${esc(name)}">`).join('');
  for (const id of ['showBase','showAnnotations']) $(id).addEventListener('change', () => {
    state.showBase = $('showBase').checked; state.showAnnotations = $('showAnnotations').checked; recalculate();
  });
  for (const input of document.querySelectorAll('input[name="colorBy"],input[name="sizeBy"]')) input.addEventListener('change', () => {
    state.color = document.querySelector('input[name="colorBy"]:checked').value;
    state.size = document.querySelector('input[name="sizeBy"]:checked').value;
    recalculate();
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
