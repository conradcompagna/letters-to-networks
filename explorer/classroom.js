(() => {
  'use strict';
  const DATA = window.CLASSROOM_DATA;
  const SAMPLE = window.SAMPLE_ANNOTATIONS;
  const $ = id => document.getElementById(id);
  const letters = new Map(DATA.letters.map(item => [item.docId, item]));
  const people = [...new Set(DATA.letters.flatMap(item => [item.writer, item.addressee]))].sort((a,b) => a.localeCompare(b));
  const types = new Set(['reports','requests','supports','opposes','delegates','introduces','consults','negotiates','other']);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const surnameCounts = new Map();
  for (const name of people) { const surname=name.split(',')[0]; surnameCounts.set(surname,(surnameCounts.get(surname)||0)+1); }
  const shortName = value => { const bits=value.split(','),surname=bits[0]; if(surname==='Lafayette')return value.includes('marquise de')?'Lafayette, Adrienne':'Lafayette, Joseph'; return surname+(surnameCounts.get(surname)>1?', '+(bits[1]||'').trim().split(' ').slice(0,2).join(' '):''); };
  const state = {server:false, student:null, code:'', own:{letters:{}}, classAnnotations:[], submittedDocIds:[], annotations:[], current:null, staged:[], skipped:false, selected:null, positions:null};
  const normal = value => value.toLowerCase().replace(/\s+/g,' ').trim();
  const reviewed = reading => (reading.annotations||[]).length>0 || (reading.noTie===true&&(reading.noTieReason||'').trim().length>=40);
  const completed = () => Object.values(state.own.letters).filter(reviewed).length;
  const localKey = () => `letters-classroom-v1-student-${state.student}`;
  const draftKey = () => `${localKey()}-draft-${state.current}`;
  function status(message,error=false){$('modeStatus').textContent=message;$('modeStatus').classList.toggle('error',error);}
  function saveStatus(message,error=false){$('saveStatus').textContent=message;$('saveStatus').classList.toggle('error',error);}
  function fillSelect(select,names){select.innerHTML=names.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');}
  function saveDraft(){if(!state.current)return;try{localStorage.setItem(draftKey(),JSON.stringify({annotations:state.staged,evidence:$('evidence').value,note:$('relationNote').value,source:$('sourcePerson').value,target:$('targetPerson').value,type:$('relationType').value}));}catch{}}
  function loadDraft(){try{return JSON.parse(localStorage.getItem(draftKey())||'null');}catch{return null;}}
  function ownAnnotations(){return Object.entries(state.own.letters).flatMap(([docId,reading])=>(reading.annotations||[]).map(item=>({...item,docId,student:state.student})));}
  function combineAnnotations(){
    const assigned=new Set(DATA.assignments[state.student]);
    const submitted=new Set(state.submittedDocIds);
    const simulated=SAMPLE.filter(item=>!assigned.has(item.docId)&&!submitted.has(item.docId));
    const actual=state.server&&completed()===10?state.classAnnotations:ownAnnotations();
    state.annotations=[...actual,...simulated];
    return {actual:actual.length,simulated:simulated.length};
  }
  async function api(path,payload){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,code:state.code})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not save.');return result;}
  async function refreshState(){
    const response=await fetch('/api/state',{cache:'no-store',headers:{'X-Student-Code':state.code}});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not load assignment.');
    state.student=result.student;state.own=result.own;state.classAnnotations=result.annotations||[];state.submittedDocIds=result.submittedDocIds||[];
    updateDeck();updateReveal();
  }
  async function start(){
    fillSelect($('sourcePerson'),people);fillSelect($('targetPerson'),people);
    $('findPerson').innerHTML='<option value="">Person</option>'+people.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
    try{
      const fragment=decodeURIComponent(location.hash.replace(/^#(?:code=)?/,''));
      const stored=localStorage.getItem('letters-classroom-access-code')||'';
      const response=await fetch('/api/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:fragment||stored})});
      if((response.headers.get('content-type')||'').includes('application/json')){
        state.server=true;
        const claim=await response.json();if(!response.ok)throw new Error(claim.error||'Could not open assignment.');
        state.code=claim.code;state.student=claim.student;
        localStorage.setItem('letters-classroom-access-code',claim.code);
        if(location.hash)history.replaceState(null,'',location.pathname+location.search);
        await refreshState();
        setInterval(()=>{if(completed()===10)refreshState().catch(()=>{});},8000);
      }else openPreview();
    }catch(error){
      if(state.server)status(error.message,true);else openPreview();
    }
    if(state.student){$('assignmentArea').classList.remove('hidden');selectLetter(DATA.assignments[state.student][0]);updateReveal();}
  }
  function openPreview(){
    const requested=Number(new URLSearchParams(location.search).get('student'));
    state.student=Number.isInteger(requested)&&requested>=1&&requested<=30?String(requested):'1';
    try{state.own=JSON.parse(localStorage.getItem(localKey())||'{"letters":{}}');}catch{state.own={letters:{}};}
    updateDeck();
    status('');
  }
  function updateDeck(){
    if(!state.student)return;
    $('progress').textContent=`${completed()} / 10 annotated`;
    $('letterDeck').innerHTML=DATA.assignments[state.student].map((id,index)=>{const letter=letters.get(id),done=reviewed(state.own.letters[id]||{});return `<button class="letter-tab ${state.current===id?'active':''}" data-id="${esc(id)}"><span>${String(index+1).padStart(2,'0')}</span><span>${esc(shortName(letter.writer))} → ${esc(shortName(letter.addressee))}<br><small>${esc(letter.date)} · ${letter.words} words</small></span><em>${done?'✓':''}</em></button>`}).join('');
    $('letterDeck').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>selectLetter(button.dataset.id)));
  }
  function selectLetter(id){
    if(!letters.has(id)||!state.student)return;
    if(state.current)saveDraft();state.current=id;
    const letter=letters.get(id),saved=state.own.letters[id],draft=loadDraft();
    state.staged=(draft?.annotations||saved?.annotations||[]).map(item=>({...item}));
    $('reader').innerHTML=`<div class="letter-head"><div><div class="eyebrow">${esc(letter.date)} · ${letter.words} words</div><h2>${esc(letter.title)}</h2><small>${esc(letter.heading)} · Sparks, vol. ${esc(letter.volume)}</small></div><a href="${esc(letter.catalogUrl)}" target="_blank" rel="noopener">Archive record ↗</a></div><div class="letter-text" id="letterText">${letter.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div><p class="status"><a href="${esc(letter.sourceUrl)}" target="_blank" rel="noopener">Full source edition ↗</a></p>`;
    $('sourcePerson').value=draft?.source||letter.writer;$('targetPerson').value=draft?.target||letter.addressee;
    $('relationType').value=draft?.type||'';$('evidence').value=draft?.evidence||'';$('relationNote').value=draft?.note||saved?.noTieReason||'';
    renderStaged();updateDeck();saveStatus(saved?`${(saved.annotations||[]).length} relationship${(saved.annotations||[]).length===1?'':'s'} recorded.`:'');
  }
  function validate(item){
    if(!people.includes(item.source)||!people.includes(item.target)||item.source===item.target)throw new Error('Choose two different people.');
    if(!types.has(item.type))throw new Error('Choose a relationship type.');
    if(item.evidence.length<20||item.evidence.length>600||!normal(letters.get(state.current).paragraphs.join(' ')).includes(normal(item.evidence)))throw new Error('Use an exact 20–600 character passage from this letter.');
    if(item.note.length<12||item.note.length>500)throw new Error('Explain the tie in 12–500 characters.');
  }
  function renderStaged(){
    $('annotationList').innerHTML=state.staged.map((item,index)=>`<div class="annotation"><strong>${esc(shortName(item.source))} → ${esc(shortName(item.target))} · ${esc(item.type)}</strong><blockquote>“${esc(item.evidence)}”</blockquote><div>${esc(item.note)}</div><button data-index="${index}">Remove</button></div>`).join('');
    $('annotationList').querySelectorAll('button').forEach(button=>button.addEventListener('click',async()=>{const previous=[...state.staged];state.staged.splice(Number(button.dataset.index),1);try{await persist(state.staged.length===0);}catch(error){state.staged=previous;saveStatus(error.message,true);}renderStaged();}));
  }
  async function persist(noTie=false,noTieReason=''){
    if(!state.current)return;
    const before=completed(),reading={annotations:state.staged.map(item=>({...item})),noTie,noTieReason};
    if(state.server){await api('/api/letter',{docId:state.current,...reading});await refreshState();}
    else{state.own.letters[state.current]=reading;localStorage.setItem(localKey(),JSON.stringify(state.own));updateDeck();updateReveal();}
    try{localStorage.removeItem(draftKey());}catch{}
    saveStatus(noTie?'Marked as having no supported relationship.':'Relationship saved.');
    if(before<10&&completed()===10)$('graphArea').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function addAnnotation(){
    if(!state.current)return;
    const item={source:$('sourcePerson').value,target:$('targetPerson').value,type:$('relationType').value,evidence:$('evidence').value.trim(),note:$('relationNote').value.trim()};
    try{validate(item);if(state.staged.length>=15)throw new Error('At most 15 relationships per letter.');if(state.staged.some(old=>old.source===item.source&&old.target===item.target&&old.type===item.type&&normal(old.evidence)===normal(item.evidence)))throw new Error('That tie and passage are already recorded.');state.staged.push(item);await persist(false);$('evidence').value='';$('relationNote').value='';renderStaged();}
    catch(error){if(state.staged.at(-1)===item)state.staged.pop();saveStatus(error.message,true);}
  }
  async function markNoTie(){const reason=$('relationNote').value.trim();if(reason.length<40||reason.length>500){saveStatus('Explain in 40–500 characters why this letter supports no additional relationship.',true);return;}const previous=[...state.staged];state.staged=[];try{await persist(true,reason);renderStaged();}catch(error){state.staged=previous;saveStatus(error.message,true);}}
  function updateReveal(){
    if(!state.student)return;
    const unlocked=state.skipped||completed()===10;
    $('graphArea').classList.toggle('hidden',!unlocked);
    if(!unlocked)return;
    const counts=combineAnnotations();
    $('graphStatus').textContent=state.server&&completed()===10?`${counts.actual} submitted · ${counts.simulated} simulated relationships`:`${counts.actual} yours · ${counts.simulated} simulated class relationships`;
    renderGraph();
  }
  function graphData(){
    const baseline=new Map();
    for(const letter of DATA.letters){const key=`${letter.writer}\u0000${letter.addressee}`;if(!baseline.has(key))baseline.set(key,{source:letter.writer,target:letter.addressee,weight:0,kind:'base',items:[]});const edge=baseline.get(key);edge.weight++;edge.items.push(letter.docId);}
    const grouped=new Map();
    for(const ann of state.annotations){if($('typeFilter').value!=='all'&&ann.type!==$('typeFilter').value)continue;const key=`${ann.source}\u0000${ann.target}\u0000${ann.type}`;if(!grouped.has(key))grouped.set(key,{source:ann.source,target:ann.target,weight:0,kind:'annotation',type:ann.type,items:[]});const edge=grouped.get(key);edge.weight++;edge.items.push(ann);}
    return {base:[...baseline.values()],annotated:[...grouped.values()]};
  }
  function positionsFor(){if(!state.positions)state.positions=new Map(people.map(name=>[name,{x:DATA.layout[name][0],y:DATA.layout[name][1]}]));return state.positions;}
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
    $('graphMetrics').innerHTML=`<div class="metric"><b>${$('showBase').checked?DATA.letters.length:0}</b><small>visible archived letters</small></div><div class="metric"><b>${$('showAnnotations').checked?annotated.reduce((sum,e)=>sum+e.weight,0):0}</b><small>visible interpretations</small></div><div class="metric"><b>${ties.size}</b><small>distinct visible person pairs</small></div>`;
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
  function showEdge(edge,redraw=true){state.selected={kind:'edge',source:edge.source,target:edge.target,edgeKind:edge.kind,type:edge.type};let content=`<div class="eyebrow">${edge.kind==='base'?'Archival correspondence':'Interpreted relationship'}</div><h3>${esc(edge.source)} → ${esc(edge.target)}</h3><p><b>${edge.weight}</b> ${edge.kind==='base'?'letters':esc(edge.type)+' annotations'}</p>`;if(edge.kind==='base')content+=edge.items.map(id=>{const l=letters.get(id);return `<div class="detail-entry"><a href="${esc(l.catalogUrl)}" target="_blank" rel="noopener">${esc(l.date)} · ${esc(l.title)} ↗</a></div>`;}).join('');else content+=edge.items.map(item=>{const l=letters.get(item.docId);return `<div class="detail-entry"><b>${esc(l.date)} · ${esc(shortName(l.writer))} → ${esc(shortName(l.addressee))}</b><blockquote>“${esc(item.evidence)}”</blockquote><p>${esc(item.note)}</p><small>${item.student==='simulated'?'Simulated class':item.student===state.student?'Your annotation':'Student '+esc(item.student)} · <a href="${esc(l.catalogUrl)}" target="_blank" rel="noopener">source ↗</a></small></div>`;}).join('');$('graphDetail').innerHTML=content;if(redraw)renderGraph();}
  function init(){
    $('skipToGraph').addEventListener('click',()=>{state.skipped=true;updateReveal();$('graphArea').scrollIntoView({behavior:'smooth',block:'start'});});
    $('addAnnotation').addEventListener('click',addAnnotation);
    $('noTie').addEventListener('click',markNoTie);
    $('useSelection').addEventListener('click',()=>{const selected=window.getSelection()?.toString().trim()||'';$('evidence').value=selected;saveDraft();saveStatus(selected?'Passage copied.':'Select a passage in the letter first.',!selected);});
    for(const id of ['sourcePerson','targetPerson','relationType','evidence','relationNote'])$(id).addEventListener('input',saveDraft);
    for(const id of ['showBase','showAnnotations','typeFilter'])$(id).addEventListener('change',()=>{if(!$('graphArea').classList.contains('hidden'))renderGraph();});
    $('findPerson').addEventListener('change',()=>{if($('findPerson').value)showNode($('findPerson').value);});
    start().catch(error=>status(error.message,true));
  }
  init();
})();
