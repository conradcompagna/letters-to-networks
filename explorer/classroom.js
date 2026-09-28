(() => {
  'use strict';
  const data = window.CLASSROOM_DATA;
  const samples = window.SAMPLE_ANNOTATIONS;
  const $ = id => document.getElementById(id);
  const letters = new Map(data.letters.map(letter => [letter.docId, letter]));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[char]));
  const state = {server:false, code:'', student:null, own:{letters:{}}, classAnnotations:[], submittedDocIds:[],
    current:null, skipped:false, saving:false};
  const assignment = () => data.assignments[state.student] || [];
  const localKey = () => `letters-classroom-v2-student-${state.student}`;
  const draftKey = (id = state.current) => `${localKey()}-draft-${id}`;
  const completed = () => assignment().filter(id => (state.own.letters[id]?.annotations || []).length > 0).length;

  function message(text, error = false, id = 'saveStatus') {
    $(id).textContent = text;
    $(id).classList.toggle('error', error);
  }
  function ownAnnotations() {
    return Object.entries(state.own.letters).flatMap(([docId, reading]) =>
      (reading.annotations || []).map(item => ({...item, docId, student:state.student})));
  }
  function graphAnnotations() {
    const assigned = new Set(assignment()), submitted = new Set(state.submittedDocIds);
    const simulated = samples.filter(item => !assigned.has(item.docId) && !submitted.has(item.docId));
    const actual = state.server && completed() === 10 ? state.classAnnotations : ownAnnotations();
    return {all:[...actual, ...simulated], actual:actual.length, simulated:simulated.length};
  }
  function updateGraph() {
    if (!state.student) return;
    const reveal = state.skipped || completed() === 10;
    $('graphArea').classList.toggle('hidden', !reveal);
    if (!reveal) return;
    const counts = graphAnnotations();
    const people = window.NET_DATA.views.merged.summary.nodes.toLocaleString();
    const shown = (window.NET_DATA.views.merged.nodes.length + Object.keys(window.CLASS_OVERLAY_POSITIONS).length).toLocaleString();
    const graphSize = `${shown} shown of ${people} archive correspondents`;
    $('graphStatus').textContent = state.server && completed() === 10
      ? `${graphSize} · ${counts.actual} submitted · ${counts.simulated} simulated class relations`
      : `${graphSize} · ${counts.actual} yours · ${counts.simulated} simulated class relations`;
    window.classNetwork.update(counts.all, state.student);
    window.classNetwork.reveal();
  }
  function updateDeck() {
    $('progress').textContent = `${completed()} / 10 annotated`;
    $('letterDeck').innerHTML = assignment().map((id, index) => {
      const letter = letters.get(id), done = (state.own.letters[id]?.annotations || []).length > 0;
      return `<button class="letter-tab ${id === state.current ? 'active' : ''}" data-id="${esc(id)}">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <span>${esc(letter.writer.split(',')[0])} → ${esc(letter.addressee.split(',')[0])}<br><small>${esc(letter.date)} · ${letter.words} words</small></span>
        <em>${done ? '✓' : ''}</em></button>`;
    }).join('');
    $('letterDeck').querySelectorAll('button').forEach(button =>
      button.addEventListener('click', () => selectLetter(button.dataset.id)));
  }
  function saveDraft() {
    if (!state.current) return;
    try {localStorage.setItem(draftKey(), JSON.stringify({tag:$('relationTag').value, note:$('relationNote').value}));}
    catch { /* Browser storage can be disabled; submitted relations still persist on the class server. */ }
  }
  function loadDraft() {
    try {return JSON.parse(localStorage.getItem(draftKey()) || 'null');} catch {return null;}
  }
  function renderAnnotations() {
    const saved = state.own.letters[state.current]?.annotations || [];
    $('annotationList').innerHTML = saved.map(item =>
      `<div class="annotation"><strong>${esc(item.type)}</strong><p>${esc(item.note)}</p></div>`).join('');
    message(saved.length ? `${saved.length} relation${saved.length === 1 ? '' : 's'} added.` : '');
  }
  function selectLetter(id) {
    if (!assignment().includes(id)) return;
    if (state.current) saveDraft();
    state.current = id;
    const letter = letters.get(id), draft = loadDraft();
    $('reader').innerHTML = `<div class="letter-head"><div><p class="eyebrow">${esc(letter.date)} · ${letter.words} words</p>
      <h2>${esc(letter.title)}</h2><small>${esc(letter.heading)} · Sparks, vol. ${esc(letter.volume)}</small></div>
      <a href="${esc(letter.catalogUrl)}" target="_blank" rel="noopener">Archive record ↗</a></div>
      <div class="letter-text">${letter.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <p class="status source-link"><a href="${esc(letter.sourceUrl)}" target="_blank" rel="noopener">Full source edition ↗</a></p>`;
    $('relationTag').value = draft?.tag || '';
    $('relationNote').value = draft?.note || '';
    renderAnnotations(); updateDeck();
  }
  async function api(path, payload) {
    const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...payload, code:state.code})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save the relation.');
    return result;
  }
  async function refreshState() {
    const response = await fetch('/api/state', {cache:'no-store', headers:{'X-Student-Code':state.code}});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load the assignment.');
    state.student = result.student;
    state.own = result.own;
    state.classAnnotations = result.annotations || [];
    state.submittedDocIds = result.submittedDocIds || [];
    updateDeck(); updateGraph();
  }
  async function addRelation() {
    if (state.saving || !state.current) return;
    const tag = $('relationTag').value.trim().replace(/\s+/g, ' ');
    const note = $('relationNote').value.trim().replace(/\s+/g, ' ');
    if (tag.length < 2 || tag.length > 60) return message('Write a short relation tag (2–60 characters).', true);
    if (note.length < 12 || note.length > 300) return message('Explain the evidence in one sentence (12–300 characters).', true);
    const current = state.own.letters[state.current]?.annotations || [];
    if (current.some(item => item.type.toLowerCase() === tag.toLowerCase() && item.note.toLowerCase() === note.toLowerCase()))
      return message('That relation is already saved for this letter.', true);
    const docId = state.current, annotations = [...current, {type:tag, note}];
    state.saving = true; $('addAnnotation').disabled = true;
    try {
      if (state.server) {await api('/api/letter', {docId, annotations}); await refreshState();}
      else {
        state.own.letters[docId] = {annotations};
        localStorage.setItem(localKey(), JSON.stringify(state.own));
        updateDeck(); updateGraph();
      }
      try {localStorage.removeItem(draftKey(docId));} catch {}
      if (state.current === docId) {
        $('relationTag').value = ''; $('relationNote').value = '';
        renderAnnotations();
      }
      if (completed() === 10 && !state.skipped) $('graphArea').scrollIntoView({behavior:'smooth', block:'start'});
    } catch (error) {message(error.message, true);}
    finally {state.saving = false; $('addAnnotation').disabled = false;}
  }
  function openPreview() {
    const requested = Number(new URLSearchParams(location.search).get('student'));
    state.student = Number.isInteger(requested) && requested >= 1 && requested <= 30 ? String(requested) : '1';
    try {state.own = JSON.parse(localStorage.getItem(localKey()) || '{"letters":{}}');}
    catch {state.own = {letters:{}};}
    updateDeck();
    message('', false, 'modeStatus');
  }
  async function start() {
    try {
      const fragment = decodeURIComponent(location.hash.replace(/^#(?:code=)?/, ''));
      const stored = localStorage.getItem('letters-classroom-access-code') || '';
      const response = await fetch('/api/claim', {method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code:fragment || stored})});
      if ((response.headers.get('content-type') || '').includes('application/json')) {
        state.server = true;
        const claim = await response.json();
        if (!response.ok) throw new Error(claim.error || 'Could not open assignment.');
        state.code = claim.code; state.student = claim.student;
        localStorage.setItem('letters-classroom-access-code', claim.code);
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        await refreshState();
        setInterval(() => {if (completed() === 10) refreshState().catch(() => {});}, 8000);
      } else openPreview();
    } catch (error) {
      if (state.server) message(error.message, true, 'modeStatus');
      else openPreview();
    }
    if (state.student) {
      $('assignmentArea').classList.remove('hidden');
      selectLetter(assignment()[0]);
      updateGraph();
    }
  }
  $('skipToGraph').addEventListener('click', () => {
    state.skipped = true; updateGraph();
    if (state.student) $('graphArea').scrollIntoView({behavior:'smooth', block:'start'});
  });
  $('addAnnotation').addEventListener('click', addRelation);
  for (const id of ['relationTag','relationNote']) $(id).addEventListener('input', saveDraft);
  start().catch(error => message(error.message, true, 'modeStatus'));
})();
