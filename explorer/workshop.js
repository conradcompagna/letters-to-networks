(() => {
  const D = window.NET_DATA, explorer = window.networkExplorer, body = document.getElementById("taskBody");
  const key = "letters-network-analysis-v2";
  const fresh = () => ({ people: [], claim: "" });
  let work = fresh();
  try { work = { ...work, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch (_) {}
  if (!Array.isArray(work.people)) work.people = [];
  work.people = work.people.filter((id) => D.views.merged.nodes.some((n) => n.id === id)).slice(0, 2);
  const save = () => { try { localStorage.setItem(key, JSON.stringify(work)); } catch (_) {} };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const words = (s) => (String(s || "").trim().match(/\S+/g) || []).length;
  const node = (id) => D.views.merged.nodes.find((n) => n.id === id);
  function addStatus(id) {
    if (explorer.currentView() !== "merged") return { allowed: false, message: "Use the Four editions view to choose people for a fair comparison." };
    if (work.people.includes(id)) return { allowed: false, message: "Already in your comparison." };
    if (work.people.length >= 2) return { allowed: false, message: "Two people selected; remove one below to choose another." };
    return { allowed: true, message: "Add this person to the historical comparison." };
  }
  function personCard(id, i) {
    const n = node(id), docs = (D.docs[id] || []).slice(0, -1).slice(0, 4);
    return `<div class="method-card"><div class="task-head"><h3>${i + 1}. ${esc(id)}</h3><button class="action" data-remove="${esc(id)}">Remove</button></div>
      <p class="note">${n.c} distinct correspondents · ${n.s + n.r} sent/received documents · betweenness ${n.b.toFixed(4)} · community ${n.k + 1} · main edition ${esc(n.e || "unknown")}</p>
      <div class="task-row"><button class="action" data-open="${esc(id)}">Show on graph</button>
        ${docs.map(([date, title, docId]) => `<a href="https://founders.archives.gov/documents/${esc(docId)}" target="_blank" rel="noopener">${esc(date)} · ${esc(title)} ↗</a>`).join("")}</div></div>`;
  }
  function render() {
    body.innerHTML = `<div class="task-head"><h2>Analyze historical relationships</h2><span class="note">${work.people.length}/2 people selected</span></div>
      <p class="task-copy">In the Four editions view, select two people whose relationship or network positions interest you. The measures below are already calculated; use them to investigate a historical claim and check it against documents.</p>
      ${work.people.map(personCard).join("") || `<p class="note empty-state">Click a node above, then choose “Use in analysis.”</p>`}
      <div class="method-card"><h3>Degree · direct contacts</h3><p class="note">Degree counts distinct correspondents, regardless of how many documents they exchanged. Choose “Degree” under Size by, compare your two people, and ask whose correspondence reached more distinct nodes.</p></div>
      <div class="method-card"><h3>Betweenness · bridging paths</h3><p class="note">Betweenness counts how often a node lies on shortest paths between other nodes in this undirected network. Choose “Betweenness” under Size by; compare the scores with degree, then inspect which visible groups the people connect.</p></div>
      <div class="method-card"><h3>Communities · dense groups</h3><p class="note">The Louvain algorithm groups nodes with stronger ties within the group than outside it. Switch Colour by between Community and Edition; inspect whether the grouping may reflect correspondence or whose papers the editors collected.</p></div>
      <label class="task-field" for="claim">Historical interpretation · about 700–900 words
        <textarea id="claim" placeholder="Make a claim about these people's historical relations. Use degree, betweenness or communities, cite at least two linked documents, and explain what the network alone cannot establish.">${esc(work.claim)}</textarea></label>
      <div class="task-row"><span class="word-count" id="claimCount">${words(work.claim)} words</span><button class="action primary" id="downloadLab">Download lab work</button></div>`;
  }
  function download() {
    const lines = ["LETTERS TO NETWORKS — STUDENT LAB", "",
      window.networkBuilder?.exportText() || "", "", "FULL NETWORK ANALYSIS",
      "People: " + (work.people.join(" and ") || "none selected")];
    for (const id of work.people) {
      const n = node(id);
      lines.push(id + ": degree " + n.c + ", document edges " + (n.s + n.r) +
        ", betweenness " + n.b.toFixed(4) + ", community " + (n.k + 1) + ", main edition " + n.e);
    }
    lines.push("", "HISTORICAL INTERPRETATION", work.claim);
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "letters-network-lab.txt";
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  body.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.remove) {
      work.people = work.people.filter((id) => id !== b.dataset.remove);
      save(); render(); explorer.refresh();
    } else if (b.dataset.open) explorer.select(b.dataset.open);
    else if (b.id === "downloadLab") download();
  });
  body.addEventListener("input", (e) => {
    if (e.target.id !== "claim") return;
    work.claim = e.target.value; save();
    body.querySelector("#claimCount").textContent = words(work.claim) + " words";
  });
  window.networkWorkshop = {
    markedIds: () => work.people,
    addStatus,
    addPerson(id, view) {
      if (view !== "merged" || !addStatus(id).allowed || !node(id)) return;
      work.people.push(id); save(); render(); explorer.refresh();
    },
    onReveal: render,
  };
  render(); explorer.refresh();
})();
