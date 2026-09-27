(() => {
  const S = window.STARTER_DATA;
  const deck = document.getElementById("recordDeck");
  const reader = document.getElementById("recordReader");
  const svg = document.getElementById("miniGraph");
  const byDoc = new Map(S.records.map((record) => [record.id, record]));
  const key = "letters-network-builder-v3";
  const fresh = () => ({ entries: {}, drafts: {}, selected: S.records[0].id, revealed: false });
  let work = fresh();
  try { work = { ...work, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch (_) {}
  if (!work.entries || typeof work.entries !== "object") work.entries = {};
  if (!work.drafts || typeof work.drafts !== "object") work.drafts = {};
  if (!byDoc.has(work.selected)) work.selected = S.records[0].id;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const save = () => { try { localStorage.setItem(key, JSON.stringify(work)); } catch (_) {} };
  const status = (message) => { document.getElementById("buildStatus").textContent = message; };
  const clean = (name) => String(name || "").trim().replace(/\s+/g, " ");
  const aliasKey = (name) => clean(name).toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
  const aliases = {
    "b franklin": "Benjamin Franklin", "ben franklin": "Benjamin Franklin",
    "franklin benjamin": "Benjamin Franklin", "j adams": "John Adams",
    "adams john": "John Adams", "r r livingston": "Robert R. Livingston",
    "robert livingston": "Robert R. Livingston", "robert r livingston": "Robert R. Livingston",
    "livingston robert r": "Robert R. Livingston", "d hartley": "David Hartley",
    "hartley david": "David Hartley", "w alexander": "William Alexander",
    "alexander william": "William Alexander", "j jay": "John Jay",
    "jay john": "John Jay", "vergennes": "Count de Vergennes",
    "de vergennes": "Count de Vergennes", "count de vergennes": "Count de Vergennes"
  };
  const canonical = (name) => aliases[aliasKey(name)] || clean(name);
  const entries = () => S.records.flatMap((record) => {
    const item = work.entries[record.id];
    return item ? [{ doc: record.id, source: item.writer, target: item.addressee }] : [];
  });
  const reference = () => S.referenceEdges.map(([doc, source, target]) => ({ doc, source, target }));
  const complete = () => S.records.filter((record) => Boolean(work.entries[record.id])).length;

  function graph(rows) {
    const ids = [...new Set(rows.flatMap((row) => [row.source, row.target]))].sort();
    const directed = new Map();
    for (const row of rows) {
      const k = `${row.source}\u0000${row.target}`;
      directed.set(k, (directed.get(k) || 0) + 1);
    }
    return { ids, directed };
  }
  function positions(ids) {
    const map = new Map();
    if (ids.length === 1) { map.set(ids[0], { x: 400, y: 250 }); return map; }
    if (ids.length === 2) {
      map.set(ids[0], { x: 220, y: 250 }); map.set(ids[1], { x: 580, y: 250 }); return map;
    }
    ids.forEach((id, i) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / ids.length;
      map.set(id, { x: 400 + 285 * Math.cos(angle), y: 250 + 170 * Math.sin(angle) });
    });
    return map;
  }
  function graphSvg(rows, activeDoc = "", sharedIds = null, markerId = "miniArrow") {
    const g = graph(rows), ids = sharedIds || g.ids, pos = positions(ids);
    const arrow = `<defs><marker id="${markerId}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L9 4.5 L0 9 Z" fill="var(--focus)"></path></marker></defs>`;
    const paths = [...g.directed].map(([k, count]) => {
      const [a, b] = k.split("\u0000"), p = pos.get(a), q = pos.get(b);
      if (!p || !q || a === b) return "";
      const dx = q.x - p.x, dy = q.y - p.y, length = Math.hypot(dx, dy) || 1;
      const ux = dx / length, uy = dy / length, hasReverse = g.directed.has(`${b}\u0000${a}`);
      const bend = hasReverse ? 35 : 0;
      const mx = (p.x + q.x) / 2 - uy * bend, my = (p.y + q.y) / 2 + ux * bend;
      const startX = p.x + ux * 23, startY = p.y + uy * 23;
      const endX = q.x - ux * 27, endY = q.y - uy * 27;
      return `<path class="tie${activeDoc && rows.some((r) => r.doc === activeDoc && r.source === a && r.target === b) ? " active" : ""}" d="M${startX} ${startY} Q${mx} ${my} ${endX} ${endY}" style="stroke-width:${Math.min(6, 2 + count)}" marker-end="url(#${markerId})"><title>${esc(a)} → ${esc(b)} · ${count} ${count === 1 ? "letter" : "letters"}</title></path>`;
    }).join("");
    const nodes = g.ids.map((id) => {
      const p = pos.get(id);
      return `<g class="person-static"><circle cx="${p.x}" cy="${p.y}" r="21"></circle><text x="${p.x}" y="${p.y + 38}" text-anchor="middle" font-size="13">${esc(id)}</text></g>`;
    }).join("");
    return arrow + paths + nodes;
  }
  function renderGraph() {
    const rows = entries(), g = graph(rows);
    svg.innerHTML = rows.length ? graphSvg(rows, work.selected) :
      '<text x="400" y="250" text-anchor="middle" class="empty-graph">Your network begins with the first letter.</text>';
    document.getElementById("miniStats").textContent = `${g.ids.length} people · ${g.directed.size} directed ties · ${rows.length} letters`;
  }
  function renderDeck() {
    deck.innerHTML = S.records.map((record, i) => {
      const item = work.entries[record.id];
      return `<button class="record-tab" data-doc="${esc(record.id)}" aria-current="${record.id === work.selected}"><span class="record-num">${String(i + 1).padStart(2, "0")}</span><span>Letter ${i + 1}<br><small class="note">${esc(record.date)}</small></span><span class="record-state">${item ? "Added" : "Unread"}</span></button>`;
    }).join("");
  }
  function renderReader() {
    const record = byDoc.get(work.selected), i = S.records.indexOf(record) + 1;
    const draft = work.drafts[record.id] || work.entries[record.id] || {};
    const known = [...new Set(entries().flatMap((row) => [row.source, row.target]))].sort();
    reader.innerHTML = `<div class="reader-heading"><h3>Letter ${i}</h3><span class="note">${esc(record.date)}</span></div>
      <div class="letter-text" role="document" aria-label="Full text of letter ${i}">${record.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      <div class="reader-source"><details><summary>Check the printed heading</summary><p>${esc(record.editionHeading)}</p></details>
      <a href="${esc(record.sourceUrl)}" target="_blank" rel="noopener">1830 edition, vol. ${esc(record.volume)} ↗</a></div>
      <p class="note">Use the letter's signature, address, and context. The printed heading can resolve an addressee the body does not name.</p>
      <datalist id="knownPeople">${known.map((name) => `<option value="${esc(name)}"></option>`).join("")}</datalist>
      <div class="letter-fields"><label>Writer <input id="letterWriter" list="knownPeople" autocomplete="off" value="${esc(draft.writer || "")}" placeholder="Who wrote this?"></label>
      <label>Addressee <input id="letterAddressee" list="knownPeople" autocomplete="off" value="${esc(draft.addressee || "")}" placeholder="To whom?"></label></div>
      <label class="task-field">Evidence for writer and addressee <textarea id="letterEvidence" placeholder="Cite the signature and the address, heading, or context that identifies the recipient.">${esc(draft.evidence || "")}</textarea></label>
      <div class="task-row"><button class="action primary" id="addLetter">${work.entries[record.id] ? "Update network" : "Add letter to network"}</button><button class="action" id="clearLetter" ${work.entries[record.id] ? "" : "disabled"}>Remove</button></div>`;
  }
  function validate() {
    return complete() === S.records.length ? "" : "Add all ten letters before revealing the archive network.";
  }
  function render() {
    renderDeck(); renderReader(); renderGraph();
    document.getElementById("buildProgress").textContent = `${complete()} / ${S.records.length} letters added`;
    document.getElementById("revealFull").disabled = Boolean(validate());
  }
  function selectDocument(id) {
    if (!byDoc.has(id)) return false;
    work.selected = id; save(); render(); status(""); return true;
  }
  function saveEntry(id, writer, addressee, evidence) {
    if (!byDoc.has(id)) return false;
    writer = canonical(writer); addressee = canonical(addressee); evidence = clean(evidence);
    if (!writer || !addressee) { status("Identify both the writer and addressee."); return false; }
    if (aliasKey(writer) === aliasKey(addressee)) { status("A letter needs two different people."); return false; }
    if (evidence.length < 12) { status("Cite the evidence for your writer and addressee decisions."); return false; }
    work.entries[id] = { writer, addressee, evidence };
    work.drafts[id] = { writer, addressee, evidence };
    work.revealed = false;
    document.getElementById("comparePanel").hidden = true;
    document.getElementById("fullLab").hidden = true;
    const next = S.records.find((record) => !work.entries[record.id]);
    if (next) work.selected = next.id;
    save(); render();
    status(next ? "Letter added to your network." : "Ten letters added. Reveal the archive network when ready.");
    return true;
  }
  function removeEntry(id) {
    if (!byDoc.has(id)) return false;
    delete work.entries[id]; delete work.drafts[id];
    work.revealed = false;
    document.getElementById("comparePanel").hidden = true;
    document.getElementById("fullLab").hidden = true;
    save(); render(); status("Letter removed from your network."); return true;
  }
  function compare() {
    const yours = entries(), archive = reference();
    const allIds = [...new Set([...yours, ...archive].flatMap((row) => [row.source, row.target]))].sort();
    document.getElementById("studentCompareGraph").innerHTML = graphSvg(yours, "", allIds, "studentArrow");
    document.getElementById("referenceGraph").innerHTML = graphSvg(archive, "", allIds, "referenceArrow");
    const differing = S.records.flatMap((record, i) => {
      const own = work.entries[record.id], official = archive.find((row) => row.doc === record.id);
      return canonical(own.writer) === official.source && canonical(own.addressee) === official.target ? [] :
        [`<li><b>Letter ${i + 1}:</b> yours ${esc(own.writer)} → ${esc(own.addressee)}; catalog ${esc(official.source)} → ${esc(official.target)}</li>`];
    });
    document.getElementById("compareIntro").textContent = `${10 - differing.length} of 10 letter directions match the catalog.`;
    document.getElementById("compareList").innerHTML = `<p class="note">${esc(S.referenceRule)}</p>` +
      (differing.length ? `<ul>${differing.join("")}</ul>` : '<p>All ten match the catalog.</p>');
    document.getElementById("comparePanel").hidden = false;
  }
  function reveal(scroll = true) {
    if (validate()) { status(validate()); return false; }
    work.revealed = true; save(); compare();
    document.getElementById("fullLab").hidden = false;
    window.networkExplorer.setView("merged");
    window.networkExplorer.reveal();
    window.networkWorkshop.onReveal();
    if (scroll) document.getElementById("comparePanel").scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  function exportText() {
    const lines = ["LETTERS TO NETWORKS — TEN LETTERS", ""];
    S.records.forEach((record, i) => {
      const item = work.entries[record.id];
      lines.push(`Letter ${i + 1} · ${record.date} · ${record.url}`,
        item ? `${item.writer} → ${item.addressee}\nEvidence: ${item.evidence}` : "Not entered", "");
    });
    return lines.join("\n");
  }

  deck.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-doc]");
    if (button) selectDocument(button.dataset.doc);
  });
  reader.addEventListener("input", (event) => {
    if (!["letterWriter", "letterAddressee", "letterEvidence"].includes(event.target.id)) return;
    work.drafts[work.selected] = {
      writer: reader.querySelector("#letterWriter").value,
      addressee: reader.querySelector("#letterAddressee").value,
      evidence: reader.querySelector("#letterEvidence").value
    };
    save();
  });
  reader.addEventListener("click", (event) => {
    if (event.target.id === "addLetter") {
      saveEntry(work.selected, reader.querySelector("#letterWriter").value,
        reader.querySelector("#letterAddressee").value, reader.querySelector("#letterEvidence").value);
    } else if (event.target.id === "clearLetter") removeEntry(work.selected);
  });
  document.getElementById("revealFull").addEventListener("click", () => reveal());
  window.networkBuilder = { entries, validate, selectDocument, saveEntry, removeEntry, reveal, exportText };
  render();
  if (work.revealed && !validate()) reveal(false);
})();
