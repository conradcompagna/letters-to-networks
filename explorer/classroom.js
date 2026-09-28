(() => {
  'use strict';
  const DATA = window.CLASSROOM_DATA;
  const SAMPLE = window.SAMPLE_ANNOTATIONS;
  const $ = id => document.getElementById(id);
  const letters = new Map(DATA.letters.map(item => [item.docId, item]));
  const people = [...new Set(DATA.letters.flatMap(item => [item.writer, item.addressee]))].sort((a,b) => a.localeCompare(b));
  const types = new Set(['reports','requests','supports','opposes','delegates','introduces','consults','negotiates','other']);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const surnameCounts = new Map(); for (const name of people) { const surname=name.split(',')[0]; surnameCounts.set(surname,(surnameCounts.get(surname)||0)+1); }
  const shortName = value => { const bits=value.split(','),surname=bits[0]; if(surname==='Lafayette')return value.includes('marquise de')?'Lafayette, Adrienne':'Lafayette, Joseph'; return surname+(surnameCounts.get(surname)>1?', '+(bits[1]||'').trim().split(' ').slice(0,2).join(' '):''); };
  const countWords = value => (value.trim().match(/\b[\w’'-]+\b/g) || []).length;
  const state = {server:false, student:null, code:'', own:{letters:{},response:''}, current:null, staged:[], annotations:[], mode:'locked', selected:null, positions:null, lockedPick:null};
  let refreshTimer = null;

  function status(message, error=false, target='modeStatus') { const el=$(target); el.textContent=message; el.classList.toggle('error',error); }
  async function detectServer() {
    try { const response=await fetch('/api/state', {cache:'no-store',headers:{'X-Student-Code':'invalid'}}); state.server=(response.headers.get('content-type')||'').includes('application/json'); } catch { state.server=false; }
    $('studentLabel').classList.toggle('hidden',state.server);
    $('codeLabel').classList.toggle('hidden',!state.server);
    $('sampleButton').classList.toggle('hidden',state.server);
    $('saveResponse').textContent=state.server?'Submit response':'Save response locally';
    status(state.server ? 'Enter the individual access code supplied by your instructor.' : 'Public preview: work saves in this browser. A classroom server is needed to combine all 30 students’ annotations.');
  }
  function fillSelect(select, names) { select.innerHTML=names.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join(''); }
  function localKey() { return `letters-classroom-v1-student-${state.student}`; }
  function draftKey() { return `${localKey()}-draft-${state.current}`; }
  function saveDraft() {
    if (!state.student || !state.current) return;
    localStorage.setItem(draftKey(),JSON.stringify({annotations:state.staged,readingNote:$('readingNote').value,evidence:$('evidence').value,relationNote:$('relationNote').value,source:$('sourcePerson').value,target:$('targetPerson').value,type:$('relationType').value}));
  }
  function loadDraft() { try { return JSON.parse(localStorage.getItem(draftKey())||'null'); } catch { return null; } }
  async function api(path,payload) {
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,code:state.code})});
    const result=await response.json(); if (!response.ok) throw new Error(result.error || 'Could not save.'); return result;
  }
  async function refreshState() {
    if (!state.server || !state.code) return;
    const response=await fetch('/api/state',{cache:'no-store',headers:{'X-Student-Code':state.code}});
    const result=await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load assignment.');
    state.student=result.student; state.own=result.own;
    if (result.revealed) { state.annotations=result.annotations; if (state.mode!=='sample') state.mode='class'; }
    updateDeck(); updateProgress(); updateReveal();
  }
  async function openAssignment() {
    try {
      if (state.current) saveDraft(); state.current=null;
      if (state.server) { state.code=$('accessCode').value.trim(); if (!state.code) throw new Error('Enter your access code.'); await refreshState(); }
      else { state.student=$('studentSelect').value; state.own=JSON.parse(localStorage.getItem(localKey())||'{"letters":{},"response":""}'); state.annotations=Object.entries(state.own.letters).flatMap(([docId,reading])=>(reading.annotations||[]).map(item=>({...item,docId,student:state.student}))); updateDeck(); updateProgress(); if(Object.keys(state.own.letters).length===10 && state.mode!=='sample') state.mode='class'; updateReveal(); }
      $('finalResponse').value=state.own.response||''; updateWordCount();
      $('annotationPanel').classList.remove('hidden');
      selectLetter(DATA.assignments[state.student][0]);
      status(`Student ${state.student}: ten complete letters assigned. ${Object.keys(state.own.letters).length} saved.`);
    } catch(error) { status(error.message,true); }
  }
  function updateDeck() {
    if (!state.student) return;
    $('letterDeck').innerHTML=DATA.assignments[state.student].map((id,index)=>{const letter=letters.get(id),done=!!state.own.letters[id];return `<button class="letter-tab ${state.current===id?'active':''}" data-id="${esc(id)}"><span>${String(index+1).padStart(2,'0')}</span><span>${esc(shortName(letter.writer))} → ${esc(shortName(letter.addressee))}<br><small>${esc(letter.date)} · ${letter.words} words</small></span><em>${done?'✓':''}</em></button>`}).join('');
    $('letterDeck').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>selectLetter(button.dataset.id)));
  }
  function updateProgress() { $('progress').textContent=state.student ? `${Object.keys(state.own.letters).length} / 10 letters saved` : 'Choose an assignment above.'; }
  function selectLetter(id) {
    if (!letters.has(id) || !state.student) return;
    if (state.current) saveDraft(); state.current=id;
    const letter=letters.get(id),saved=state.own.letters[id],draft=loadDraft();
    state.staged=(draft?.annotations || saved?.annotations || []).map(item=>({...item}));
    $('reader').innerHTML=`<div class="letter-head"><div><div class="eyebrow">${esc(letter.date)} · ${letter.words} words</div><h2>${esc(letter.title)}</h2><small>${esc(letter.heading)} · Sparks, vol. ${esc(letter.volume)}</small></div><a href="${esc(letter.catalogUrl)}" target="_blank" rel="noopener">Archive record ↗</a></div><div class="letter-text" id="letterText">${letter.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div><p class="status"><a href="${esc(letter.sourceUrl)}" target="_blank" rel="noopener">Full source edition ↗</a></p>`;
    $('sourcePerson').value=draft?.source || letter.writer; $('targetPerson').value=draft?.target || letter.addressee;
    $('relationType').value=draft?.type || ''; $('evidence').value=draft?.evidence || ''; $('relationNote').value=draft?.relationNote || '';
    $('readingNote').value=draft?.readingNote ?? saved?.readingNote ?? '';
    renderStaged(); updateDeck(); status(saved?'Saved. You can revise and save again.':'Read the whole letter, then save your reading note and any supported ties.',false,'saveStatus');
  }
  function normalized(value){return value.toLowerCase().replace(/\s+/g,' ').trim();}
  function validate(item) {
    if(!people.includes(item.source)||!people.includes(item.target)||item.source===item.target) throw new Error('Choose two different people from the fixed node list.');
    if(!types.has(item.type)) throw new Error('Choose a relationship type.');
    if(item.evidence.length<20||item.evidence.length>600||!normalized(letters.get(state.current).paragraphs.join(' ')).includes(normalized(item.evidence))) throw new Error('Use an exact 20–600 character passage from the letter.');
    if(item.note.length<12||item.note.length>500) throw new Error('Explain the tie in 12–500 characters.');
  }
  function addAnnotation(){
    if(!state.current) return status('Open a letter first.',true,'saveStatus');
    const item={source:$('sourcePerson').value,target:$('targetPerson').value,type:$('relationType').value,evidence:$('evidence').value.trim(),note:$('relationNote').value.trim()};
    try { validate(item); if(state.staged.length>=15) throw new Error('A letter can have at most 15 ties.');if(state.staged.some(old=>old.source===item.source&&old.target===item.target&&old.type===item.type&&normalized(old.evidence)===normalized(item.evidence)))throw new Error('That relationship and passage are already recorded.');state.staged.push(item); $('evidence').value='';$('relationNote').value='';saveDraft();renderStaged();status('Relationship added to this letter. Save the letter to submit it.',false,'saveStatus'); }
    catch(error){status(error.message,true,'saveStatus');}
  }
  function renderStaged(){
    $('annotationList').innerHTML=state.staged.map((item,index)=>`<div class="annotation"><strong>${esc(shortName(item.source))} → ${esc(shortName(item.target))} · ${esc(item.type)}</strong><blockquote>“${esc(item.evidence)}”</blockquote><div>${esc(item.note)}</div><button data-index="${index}">Remove</button></div>`).join('');
    $('annotationList').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{state.staged.splice(Number(button.dataset.index),1);renderStaged();saveDraft();}));
  }
  async function saveLetter(){
    if(!state.current) return status('Open a letter first.',true,'saveStatus');
    const readingNote=$('readingNote').value.trim();
    try {
      if(readingNote.length<40||readingNote.length>1000) throw new Error('Write a 40–1000 character reading note.');
      state.staged.forEach(validate);
      const reading={readingNote,annotations:state.staged.map(item=>({...item}))};
      if(state.server) { await api('/api/letter',{docId:state.current,...reading}); await refreshState(); }
      else {state.own.letters[state.current]=reading;localStorage.setItem(localKey(),JSON.stringify(state.own));state.annotations=Object.entries(state.own.letters).flatMap(([docId,r])=>r.annotations.map(item=>({...item,docId,student:state.student})));updateDeck();updateProgress();if(Object.keys(state.own.letters).length===10 && state.mode!=='sample')state.mode='class';updateReveal();}
      localStorage.removeItem(draftKey());status('Saved. You can return to this letter and revise it.',false,'saveStatus');
    } catch(error){status(error.message,true,'saveStatus');}
  }
  function updateReveal(){
    const completed=state.student?Object.keys(state.own.letters).length:0;
    const revealed=state.mode==='sample'||(completed===10&&state.mode==='class');
    $('graphLocked').classList.toggle('hidden',revealed);$('graphRevealed').classList.toggle('hidden',!revealed);
    $('graphControls').classList.toggle('hidden',!revealed);
    $('analysisArea').classList.toggle('hidden',!revealed);
    $('saveResponse').disabled=completed<10;
    $('graphTitle').textContent=state.mode==='sample'?'Annotated sample on the 300-letter network':revealed?'Class network from 300 letters':'Build from the sources';
    $('graphStatus').textContent=state.mode==='sample'?`${SAMPLE.length} example interpretations from ${new Set(SAMPLE.map(item=>item.docId)).size} letters; these are not student submissions.`:revealed?(state.server?'Live class annotations. New submissions refresh automatically.':'Your locally saved interpretations; class aggregation requires the classroom server.'):`${completed} / 10 letters saved before reveal.`;
    $('sampleButton').textContent=state.mode==='sample'?'Return to assignment graph':'View annotated sample';
    if(revealed) renderGraph();
  }
  function sampleToggle(){
    if(state.mode==='sample') state.mode=state.student&&Object.keys(state.own.letters).length===10?'class':'locked';
    else state.mode='sample';updateReveal();
  }
  function graphData(){
    const baseline=new Map();
    for(const letter of DATA.letters){const key=`${letter.writer}\u0000${letter.addressee}`;if(!baseline.has(key))baseline.set(key,{source:letter.writer,target:letter.addressee,weight:0,kind:'base',items:[]});const edge=baseline.get(key);edge.weight++;edge.items.push(letter.docId);}
    const source=state.mode==='sample'?SAMPLE:state.annotations;
    const grouped=new Map();
    for(const ann of source){if($('typeFilter').value!=='all'&&ann.type!==$('typeFilter').value)continue;const key=`${ann.source}\u0000${ann.target}\u0000${ann.type}`;if(!grouped.has(key))grouped.set(key,{source:ann.source,target:ann.target,weight:0,kind:'annotation',type:ann.type,items:[]});const edge=grouped.get(key);edge.weight++;edge.items.push(ann);}
    return {base:[...baseline.values()],annotated:[...grouped.values()]};
  }
  function positionsFor(){
    if (!state.positions) state.positions = new Map(people.map(name => [name, {x:DATA.layout[name][0], y:DATA.layout[name][1]}]));
    return state.positions;
  }
  function renderLockedGraph(){
    const svg=$('lockedSvg'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();
    people.forEach((name,index)=>{
      const x=88+(index%8)*118,y=65+Math.floor(index/8)*95;
      const group=document.createElementNS(ns,'g');group.setAttribute('class',`node ${state.lockedPick===name?'active':''}`);group.setAttribute('tabindex','0');group.setAttribute('role','button');group.setAttribute('aria-label',name);
      const hit=document.createElementNS(ns,'rect');for(const [key,value] of Object.entries({x:x-50,y:y-18,width:100,height:57,fill:'transparent'}))hit.setAttribute(key,value);group.append(hit);
      const circle=document.createElementNS(ns,'circle');for(const [key,value] of Object.entries({cx:x,cy:y,r:11}))circle.setAttribute(key,value);group.append(circle);
      const label=document.createElementNS(ns,'text');label.setAttribute('x',x);label.setAttribute('y',y+30);label.setAttribute('text-anchor','middle');const short=shortName(name);label.textContent=short.length>18?short.slice(0,17)+'…':short;group.append(label);
      const title=document.createElementNS(ns,'title');title.textContent=name;group.append(title);
      const pick=()=>{if(!state.current){status('Open your assignment to choose people.',true);return;}if(state.lockedPick===null){state.lockedPick=name;$('sourcePerson').value=name;$('graphStatus').textContent=`From ${name}. Choose a second person.`;}else{$('targetPerson').value=name;$('graphStatus').textContent=`${state.lockedPick} → ${name}. Choose a relationship and quote from the letter.`;state.lockedPick=null;}saveDraft();renderLockedGraph();};
      group.addEventListener('click',pick);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();}});svg.append(group);
    });
  }
  function metrics(edges){
    const neighbors=new Map(people.map(name=>[name,new Set()]));const strength=new Map(people.map(name=>[name,0]));
    for(const e of edges){neighbors.get(e.source).add(e.target);neighbors.get(e.target).add(e.source);strength.set(e.source,strength.get(e.source)+e.weight);strength.set(e.target,strength.get(e.target)+e.weight);}
    const between=new Map(people.map(name=>[name,0]));
    for(const source of people){const stack=[],pred=new Map(people.map(name=>[name,[]])),sigma=new Map(people.map(name=>[name,0])),dist=new Map(people.map(name=>[name,-1]));sigma.set(source,1);dist.set(source,0);const queue=[source];for(let q=0;q<queue.length;q++){const v=queue[q];stack.push(v);for(const w of neighbors.get(v)){if(dist.get(w)<0){dist.set(w,dist.get(v)+1);queue.push(w);}if(dist.get(w)===dist.get(v)+1){sigma.set(w,sigma.get(w)+sigma.get(v));pred.get(w).push(v);}}}const delta=new Map(people.map(name=>[name,0]));while(stack.length){const w=stack.pop();for(const v of pred.get(w))delta.set(v,delta.get(v)+(sigma.get(v)/sigma.get(w))*(1+delta.get(w)));if(w!==source)between.set(w,between.get(w)+delta.get(w)/2);}}
    return {neighbors,strength,between};
  }
  function renderGraph(){
    const {base,annotated}=graphData(),visible=[...($('showBase').checked?base:[]),...($('showAnnotations').checked?annotated:[])],m=metrics(visible),pos=positionsFor(base);
    const ties=new Set(visible.map(e=>[e.source,e.target].sort().join('\u0000')));
    $('graphMetrics').innerHTML=`<div class="metric"><b>${$('showBase').checked?DATA.letters.length:0}</b><small>visible archived letters</small></div><div class="metric"><b>${$('showAnnotations').checked?annotated.reduce((sum,e)=>sum+e.weight,0):0}</b><small>visible ${state.mode==='sample'?'sample':'class'} interpretations</small></div><div class="metric"><b>${ties.size}</b><small>distinct visible person pairs</small></div>`;
    const svg=$('networkSvg');svg.innerHTML='<defs><marker id="arrowBase" markerWidth="7" markerHeight="7" refX="16" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="#a6b5b4"/></marker><marker id="arrowAnno" markerWidth="7" markerHeight="7" refX="16" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="#c75d36"/></marker></defs>';
    const ns='http://www.w3.org/2000/svg';const create=(tag,attrs={})=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
    const edgeLayer=create('g');svg.append(edgeLayer);
    const drawEdge=(edge,i)=>{const a=pos.get(edge.source),b=pos.get(edge.target),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,offset=edge.kind==='annotation'?5+(i%3)*2:0,ox=-dy/len*offset,oy=dx/len*offset,x1=a.x+dx/len*11+ox,y1=a.y+dy/len*11+oy,x2=b.x-dx/len*11+ox,y2=b.y-dy/len*11+oy;
      const line=create('line',{x1,y1,x2,y2,class:edge.kind==='base'?'edge-base':'edge-anno','stroke-width':edge.kind==='base'?Math.min(5,1+Math.sqrt(edge.weight)*.7):Math.min(5,1.6+Math.sqrt(edge.weight)), 'marker-end':`url(#${edge.kind==='base'?'arrowBase':'arrowAnno'})`});edgeLayer.append(line);
      const hit=create('line',{x1,y1,x2,y2,class:'edge-hit',tabindex:'0',role:'button','aria-label':`${shortName(edge.source)} to ${shortName(edge.target)}, ${edge.weight} ${edge.kind==='base'?'letters':edge.type+' relationships'}`});hit.addEventListener('click',()=>showEdge(edge));hit.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showEdge(edge);}});edgeLayer.append(hit);
    };visible.forEach(drawEdge);
    const nodeLayer=create('g');svg.append(nodeLayer);
    const ranked=[...people].sort((a,b)=>m.strength.get(b)-m.strength.get(a));const labels=new Set(),labelPoints=[];
    for(const name of ranked){if(labels.size>=9||m.strength.get(name)===0)break;const point=pos.get(name);if(labelPoints.every(other=>Math.hypot(point.x-other.x,point.y-other.y)>65)){labels.add(name);labelPoints.push(point);}}
    for(const name of people){const p=pos.get(name),g=create('g',{class:`node ${state.selected?.kind==='node'&&state.selected.name===name?'active':''}`,tabindex:'0',role:'button','aria-label':name});const circle=create('circle',{cx:p.x,cy:p.y,r:Math.min(12,5+Math.sqrt(m.strength.get(name))*1.2)});g.append(circle);if(labels.has(name)||state.selected?.name===name){const label=create('text',{x:p.x+12,y:p.y+4});label.textContent=shortName(name);g.append(label);}g.addEventListener('click',()=>showNode(name));g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showNode(name);}});const title=create('title');title.textContent=name;g.append(title);nodeLayer.append(g);}
    $('leaderTable').innerHTML=`<table class="leader-table"><thead><tr><th>Person</th><th title="Number of distinct people tied to this person">Neighbors</th><th title="Sum of letter and annotation counts on visible ties">Strength</th><th title="Shortest paths through this person; tie weight ignored">Betweenness</th></tr></thead><tbody>${ranked.slice(0,10).map(name=>`<tr><td><button data-person="${esc(name)}">${esc(name)}</button></td><td>${m.neighbors.get(name).size}</td><td>${m.strength.get(name)}</td><td>${m.between.get(name).toFixed(1)}</td></tr>`).join('')}</tbody></table><p class="status">Strength counts visible letters and annotations; betweenness counts shortest routes between people and ignores tie weights.</p>`;
    $('leaderTable').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>showNode(button.dataset.person)));
    if(state.selected?.kind==='node')showNode(state.selected.name,false);else if(state.selected?.kind==='edge'){const e=visible.find(x=>x.source===state.selected.source&&x.target===state.selected.target&&x.kind===state.selected.edgeKind&&x.type===state.selected.type);if(e)showEdge(e,false);else showDefault();}else showDefault();
  }
  function showDefault(){ $('graphDetail').innerHTML='<h3>Choose a person or tie</h3><p class="status">Click a node for measures and source counts, or a line for its underlying letters and annotations.</p>'; }
  function showNode(name,redraw=true){const {base,annotated}=graphData(),visible=[...($('showBase').checked?base:[]),...($('showAnnotations').checked?annotated:[])],m=metrics(visible);state.selected={kind:'node',name};const b=base.filter(e=>e.source===name||e.target===name),a=annotated.filter(e=>e.source===name||e.target===name);$('graphDetail').innerHTML=`<div class="eyebrow">Person</div><h3>${esc(name)}</h3><p><b>${m.neighbors.get(name).size}</b> distinct neighbors · <b>${m.strength.get(name)}</b> visible ties by count · <b>${m.between.get(name).toFixed(1)}</b> betweenness</p><p class="status">${b.reduce((n,e)=>n+e.weight,0)} archived letter endpoints · ${a.reduce((n,e)=>n+e.weight,0)} interpreted relationship endpoints</p><div class="detail-entry"><b>Correspondence</b>${b.sort((x,y)=>y.weight-x.weight).slice(0,12).map(e=>`<p>${esc(shortName(e.source))} → ${esc(shortName(e.target))} · ${e.weight} letters</p>`).join('')}</div><div class="detail-entry"><b>Relationships</b>${a.map(e=>`<p>${esc(shortName(e.source))} → ${esc(shortName(e.target))} · ${esc(e.type)} × ${e.weight}</p>`).join('')||'<p>None yet.</p>'}</div>`;if(redraw)renderGraph();}
  function showEdge(edge,redraw=true){state.selected={kind:'edge',source:edge.source,target:edge.target,edgeKind:edge.kind,type:edge.type};let content=`<div class="eyebrow">${edge.kind==='base'?'Archival correspondence':'Interpreted relationship'}</div><h3>${esc(edge.source)} → ${esc(edge.target)}</h3><p><b>${edge.weight}</b> ${edge.kind==='base'?'letters':esc(edge.type)+' annotations'}</p>`;if(edge.kind==='base')content+=edge.items.map(id=>{const l=letters.get(id);return `<div class="detail-entry"><a href="${esc(l.catalogUrl)}" target="_blank" rel="noopener">${esc(l.date)} · ${esc(l.title)} ↗</a></div>`;}).join('');else content+=edge.items.map(item=>{const l=letters.get(item.docId);return `<div class="detail-entry"><b>${esc(l.date)} · ${esc(shortName(l.writer))} → ${esc(shortName(l.addressee))}</b><blockquote>“${esc(item.evidence)}”</blockquote><p>${esc(item.note)}</p><small>${item.student==='sample'?'Instructor sample':'Student '+esc(item.student)} · <a href="${esc(l.catalogUrl)}" target="_blank" rel="noopener">source ↗</a></small></div>`;}).join('');$('graphDetail').innerHTML=content;if(redraw)renderGraph();}
  function updateWordCount(){const words=countWords($('finalResponse').value);$('wordCount').textContent=`${words} / about 500 words`;}
  async function saveResponse(){const response=$('finalResponse').value.trim(),words=countWords(response);if(words<450||words>600)return status('Write about 500 words (450–600) before submitting.',true,'responseStatus');try{if(state.server){await api('/api/response',{response});await refreshState();}else{state.own.response=response;localStorage.setItem(localKey(),JSON.stringify(state.own));}status(state.server?'Response submitted.':'Response saved in this browser.',false,'responseStatus');}catch(error){status(error.message,true,'responseStatus');}}
  async function init(){
    $('studentSelect').innerHTML=Array.from({length:30},(_,i)=>`<option value="${i+1}">${String(i+1).padStart(2,'0')}</option>`).join('');fillSelect($('sourcePerson'),people);fillSelect($('targetPerson'),people);$('findPerson').innerHTML='<option value="">Person</option>'+people.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
    $('openAssignment').addEventListener('click',openAssignment);$('sampleButton').addEventListener('click',sampleToggle);$('addAnnotation').addEventListener('click',addAnnotation);$('saveLetter').addEventListener('click',saveLetter);$('useSelection').addEventListener('click',()=>{const selected=window.getSelection()?.toString().trim()||'';$('evidence').value=selected;saveDraft();status(selected?'Selected text copied into evidence.':'Select a passage in the letter first.',!selected,'saveStatus');});
    for(const id of ['sourcePerson','targetPerson','relationType','evidence','relationNote','readingNote']) $(id).addEventListener('input',saveDraft);
    for(const id of ['showBase','showAnnotations','typeFilter']) $(id).addEventListener('change',()=>{if(state.mode!=='locked')renderGraph();});
    $('findPerson').addEventListener('change',()=>{if($('findPerson').value&&state.mode!=='locked')showNode($('findPerson').value);});
    $('finalResponse').addEventListener('input',updateWordCount);$('saveResponse').addEventListener('click',saveResponse);
    renderLockedGraph();await detectServer();
    if(state.server){refreshTimer=setInterval(()=>{if(state.student&&state.mode==='class')refreshState().catch(()=>{});},8000);}
  }
  init();
})();
