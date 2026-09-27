(() => {
  const S = window.STARTER_DATA, deck = document.getElementById("recordDeck");
  const key = "letters-network-builder-v1";
  const fresh = () => ({ nodeRule: "", tieRule: "", records: {}, reflection: "", built: false, revealed: false });
  let work = fresh();
  try { work = { ...work, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch (_) {}
  if (!work.records || typeof work.records !== "object") work.records = {};
  for (const record of S.records) {
    const saved = work.records[record.id] || {};
    work.records[record.id] = { kind: saved.kind || "", sources: saved.sources || "", targets: saved.targets || "", note: saved.note || "" };
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const save = () => { try { localStorage.setItem(key, JSON.stringify(work)); } catch (_) {} };
  const names = (s) => [...new Set(String(s || "").split("|").map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean))];
  const pairKey = (a, b) => [a, b].sort((x, y) => x.localeCompare(y)).join(" ↔ ");
  const short = (name) => name.includes(",") ? name.split(",")[0] : name;
  const status = (message) => { document.getElementById("buildStatus").textContent = message; };
  function row(record, i) {
    const item = work.records[record.id];
    return `<article class="record-card" data-record="${esc(record.id)}">
      <header><h4>${i + 1}. ${esc(record.title)}</h4><span class="note">${esc(record.edition)} · ${esc(record.date)}</span></header>
      <p class="note"><b>Authors:</b> ${record.authors.length ? esc(record.authors.join(" | ")) : "none listed"}<br>
        <b>Recipients:</b> ${record.recipients.length ? esc(record.recipients.join(" | ")) : "none listed"}</p>
      <p class="note"><a href="${esc(record.url)}" target="_blank" rel="noopener">Open source ↗</a></p>
      <div class="task-row"><label for="decision-${i}">Network decision</label>
        <select id="decision-${i}" data-kind="${esc(record.id)}">
          <option value="" ${item.kind === "" ? "selected" : ""}>Not reviewed</option>
          <option value="tie" ${item.kind === "tie" ? "selected" : ""}>Create tie</option>
          <option value="exclude" ${item.kind === "exclude" ? "selected" : ""}>No tie</option>
        </select></div>
      <div class="record-fields" ${item.kind === "tie" ? "" : "hidden"}>
        <label>From node(s)<input data-sources="${esc(record.id)}" value="${esc(item.sources)}" placeholder="One name, or names separated by |"></label>
        <label>To node(s)<input data-targets="${esc(record.id)}" value="${esc(item.targets)}" placeholder="One name, or names separated by |"></label>
      </div>
      <label class="task-field">Decision note (especially for exclusions, groups, variants, or duplicates)
        <input type="text" data-note="${esc(record.id)}" value="${esc(item.note)}" placeholder="What did you decide, and why?"></label>
    </article>`;
  }
  function renderRecords() {
    const scroll = deck.scrollTop;
    deck.innerHTML = S.records.map(row).join("");
    deck.scrollTop = scroll;
  }
  function edges() {
    const out = [];
    for (const record of S.records) {
      const item = work.records[record.id];
      if (item.kind !== "tie") continue;
      for (const source of names(item.sources))
        for (const target of names(item.targets))
          if (source !== target) out.push({ doc: record.id, source, target });
    }
    return out;
  }
  function validate() {
    if (!work.nodeRule.trim() || !work.tieRule.trim()) return "Define what a node and a tie mean first.";
    const unreviewed = S.records.find((r) => !["tie", "exclude"].includes(work.records[r.id].kind));
    if (unreviewed) return "Review all " + S.records.length + " records before building; record " + (S.records.indexOf(unreviewed) + 1) + " is unfinished.";
    const empty = S.records.find((r) => work.records[r.id].kind === "tie" &&
      (!names(work.records[r.id].sources).length || !names(work.records[r.id].targets).length));
    if (empty) return "Enter both ends of the tie for record " + (S.records.indexOf(empty) + 1) + ".";
    if (!edges().length) return "Your decisions produce no ties. Review the records or the node and tie definitions.";
    return "";
  }
  function graph(edgeRows) {
    const ids = [...new Set(edgeRows.flatMap((e) => [e.source, e.target]))].sort();
    const adj = new Map(ids.map((id) => [id, new Set()]));
    const volume = new Map(ids.map((id) => [id, 0]));
    const pairs = new Map();
    for (const e of edgeRows) {
      if (e.source === e.target) continue;
      adj.get(e.source).add(e.target); adj.get(e.target).add(e.source);
      volume.set(e.source, volume.get(e.source) + 1);
      volume.set(e.target, volume.get(e.target) + 1);
      const k = pairKey(e.source, e.target);
      pairs.set(k, (pairs.get(k) || 0) + 1);
    }
    // Brandes betweenness for a small, undirected, unweighted student graph.
    const between = new Map(ids.map((id) => [id, 0]));
    for (const start of ids) {
      const stack = [], pred = new Map(ids.map((id) => [id, []]));
      const paths = new Map(ids.map((id) => [id, 0]));
      const dist = new Map(ids.map((id) => [id, -1]));
      paths.set(start, 1); dist.set(start, 0);
      const queue = [start];
      for (let at = 0; at < queue.length; at++) {
        const v = queue[at]; stack.push(v);
        for (const w of adj.get(v)) {
          if (dist.get(w) < 0) { queue.push(w); dist.set(w, dist.get(v) + 1); }
          if (dist.get(w) === dist.get(v) + 1) {
            paths.set(w, paths.get(w) + paths.get(v));
            pred.get(w).push(v);
          }
        }
      }
      const delta = new Map(ids.map((id) => [id, 0]));
      while (stack.length) {
        const w = stack.pop();
        for (const v of pred.get(w))
          delta.set(v, delta.get(v) + paths.get(v) / paths.get(w) * (1 + delta.get(w)));
        if (w !== start) between.set(w, between.get(w) + delta.get(w));
      }
    }
    const scale = ids.length > 2 ? 1 / ((ids.length - 1) * (ids.length - 2)) : 0;
    for (const id of ids) between.set(id, between.get(id) * scale);
    return { ids, adj, volume, pairs, between };
  }
  function graphSvg(g, layoutIds = g.ids) {
    const ordered = [...layoutIds].sort((a, b) => a.localeCompare(b));
    const positions = new Map();
    ordered.forEach((id, i) => {
      const angle = 2 * Math.PI * i / ordered.length - Math.PI / 2;
      positions.set(id, { x: 240 + 165 * Math.cos(angle), y: 205 + 130 * Math.sin(angle) });
    });
    const lines = [...g.pairs].map(([pair, weight]) => {
      const [a, b] = pair.split(" ↔ "), p = positions.get(a), q = positions.get(b);
      return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#8b98a6" stroke-opacity=".65" stroke-width="${Math.min(6, 1.5 + weight)}"/>`;
    }).join("");
    const circles = g.ids.map((id) => {
      const p = positions.get(id), r = 7 + Math.min(12, g.adj.get(id).size * 1.8);
      const label = short(id).length > 23 ? short(id).slice(0, 22) + "…" : short(id);
      return `<g><circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#2a78d6" stroke="#fff" stroke-width="2"/>
        <text x="${p.x}" y="${p.y + r + 17}" text-anchor="middle" font-size="15" fill="currentColor">${esc(label)}</text>
        <title>${esc(id)}: ${g.adj.get(id).size} correspondents, ${g.volume.get(id)} document edges</title></g>`;
    }).join("");
    return lines + circles;
  }
  function draw(g) {
    const ordered = [...g.ids].sort((a, b) => g.adj.get(b).size - g.adj.get(a).size || a.localeCompare(b));
    document.getElementById("miniGraph").innerHTML = graphSvg(g);
    document.getElementById("miniStats").textContent = g.ids.length + " nodes · " + g.pairs.size +
      " distinct ties · " + edges().length + " document edges";
    document.getElementById("miniMetrics").innerHTML = '<table><thead><tr><th>Node</th><th>Degree</th><th>Documents</th><th>Betweenness</th></tr></thead><tbody>' +
      ordered.map((id) => '<tr><td>' + esc(id) + '</td><td class="num">' + g.adj.get(id).size +
        '</td><td class="num">' + g.volume.get(id) + '</td><td class="num">' +
        g.between.get(id).toFixed(3) + "</td></tr>").join("") + "</tbody></table>";
    document.getElementById("miniResult").hidden = false;
  }
  function compare() {
    const yours = new Map();
    for (const e of edges()) {
      const k = pairKey(e.source, e.target);
      yours.set(k, (yours.get(k) || 0) + 1);
    }
    const reference = new Map();
    for (const [, source, target] of S.referenceEdges) {
      const k = pairKey(source, target);
      reference.set(k, (reference.get(k) || 0) + 1);
    }
    const shared = [...yours.keys()].filter((k) => reference.has(k)).length;
    const union = new Set([...yours.keys(), ...reference.keys()]).size;
    const onlyYours = [...yours.keys()].filter((k) => !reference.has(k));
    const onlyReference = [...reference.keys()].filter((k) => !yours.has(k));
    const weights = [...yours.keys()].filter((k) => reference.has(k) && yours.get(k) !== reference.get(k));
    const studentGraph = graph(edges());
    const productionGraph = graph(S.referenceEdges.map(([doc, source, target]) => ({ doc, source, target })));
    const sameLayout = [...new Set([...studentGraph.ids, ...productionGraph.ids])];
    document.getElementById("miniGraph").innerHTML = graphSvg(studentGraph, sameLayout);
    document.getElementById("referenceGraph").innerHTML = graphSvg(productionGraph, sameLayout);
    document.getElementById("compareIntro").textContent =
      shared + " shared distinct ties out of " + union + " in either build (" +
      Math.round(100 * shared / (union || 1)) + "% overlap). Your graph has " + edges().length +
      " document edges; the production rules yield " + S.referenceEdges.length +
      " on these same " + S.records.length + " records. Differences can reflect defensible modeling choices.";
    document.getElementById("compareList").innerHTML =
      '<p class="note"><b>Production rule:</b> ' + esc(S.referenceRule) + "</p>" +
      '<p class="note"><b>Only in yours:</b> ' + (onlyYours.length ? esc(onlyYours.join("; ")) : "none") + "</p>" +
      '<p class="note"><b>Only in production:</b> ' + (onlyReference.length ? esc(onlyReference.join("; ")) : "none") + "</p>" +
      '<p class="note"><b>Same tie, different document count:</b> ' +
      (weights.length ? esc(weights.map((k) => k + " (" + yours.get(k) + " vs " + reference.get(k) + ")").join("; ")) : "none") + "</p>";
    document.getElementById("comparePanel").hidden = false;
  }
  function build() {
    const error = validate();
    if (error) { status(error); return false; }
    work.built = true; save();
    draw(graph(edges()));
    document.getElementById("revealFull").hidden = false;
    status("Built from your decisions. Inspect the graph and measures before revealing the full network.");
    if (work.revealed) compare();
    return true;
  }
  function reveal() {
    if (!work.built) return false;
    work.revealed = true; save();
    compare();
    document.getElementById("fullLab").hidden = false;
    window.networkExplorer.setView("merged");
    window.networkExplorer.reveal();
    window.networkWorkshop.onReveal();
    document.getElementById("fullLab").scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  function dirty() {
    work.built = false; save();
    document.getElementById("miniResult").hidden = true;
    document.getElementById("revealFull").hidden = true;
    document.getElementById("comparePanel").hidden = true;
    status("Record decisions changed. Build again to update the graph.");
  }
  deck.addEventListener("change", (e) => {
    const id = e.target.dataset.kind;
    if (!id || !work.records[id]) return;
    work.records[id].kind = e.target.value;
    dirty(); renderRecords();
  });
  deck.addEventListener("input", (e) => {
    const t = e.target;
    for (const field of ["sources", "targets", "note"]) {
      const id = t.dataset[field];
      if (id && work.records[id]) {
        work.records[id][field] = t.value;
        if (field === "note") save(); else dirty();
        return;
      }
    }
  });
  for (const field of ["nodeRule", "tieRule"]) {
    const el = document.getElementById(field);
    el.value = work[field];
    el.addEventListener("input", () => { work[field] = el.value; dirty(); });
  }
  const reflection = document.getElementById("buildReflection");
  reflection.value = work.reflection;
  reflection.addEventListener("input", () => { work.reflection = reflection.value; save(); });
  document.getElementById("buildGraph").addEventListener("click", build);
  document.getElementById("revealFull").addEventListener("click", reveal);
  window.networkBuilder = {
    build, reveal, edges, graph, validate,
    exportText() {
      const lines = ["NETWORK DEFINITION", "Nodes: " + work.nodeRule, "Ties: " + work.tieRule,
        "", "RECORD DECISIONS"];
      for (const record of S.records) {
        const item = work.records[record.id];
        lines.push(record.date + " · " + record.edition + " · " + record.title + " · " + record.url,
          "Decision: " + item.kind + (item.kind === "tie" ? " · " + item.sources + " -> " + item.targets : ""),
          "Reason: " + item.note, "");
      }
      if (work.built && !validate()) {
        const student = graph(edges());
        const reference = graph(S.referenceEdges.map(([doc, source, target]) => ({ doc, source, target })));
        const shared = [...student.pairs.keys()].filter((k) => reference.pairs.has(k)).length;
        const union = new Set([...student.pairs.keys(), ...reference.pairs.keys()]).size;
        lines.push("YOUR NETWORK", student.ids.length + " nodes · " + student.pairs.size +
          " distinct ties · " + edges().length + " document edges", "",
          "PRODUCTION BUILD ON SAME RECORDS", reference.ids.length + " nodes · " +
          reference.pairs.size + " distinct ties · " + S.referenceEdges.length + " document edges",
          "Shared distinct ties: " + shared + " of " + union + " in either build", "",
          "YOUR EDGE LIST");
        for (const edge of edges()) lines.push(edge.doc + " · " + edge.source + " -> " + edge.target);
        lines.push("");
      }
      lines.push("COMPARISON REFLECTION", work.reflection);
      return lines.join("\n");
    }
  };
  renderRecords();
  if (work.built && !validate()) {
    draw(graph(edges()));
    document.getElementById("revealFull").hidden = false;
    status("Your saved graph is ready.");
    if (work.revealed) {
      compare();
      document.getElementById("fullLab").hidden = false;
      window.networkExplorer.setView("merged");
      window.networkExplorer.reveal();
      window.networkWorkshop.onReveal();
    }
  }
})();
