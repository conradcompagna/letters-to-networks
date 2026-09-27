(() => {
  const S = window.STARTER_DATA;
  const deck = document.getElementById("recordDeck");
  const reader = document.getElementById("recordReader");
  const svg = document.getElementById("miniGraph");
  const byDoc = new Map(S.records.map((record) => [record.id, record]));
  const people = [...new Set(S.records.flatMap((record) => [...record.authors, ...record.recipients]))]
    .sort((a, b) => a.localeCompare(b));
  const key = "letters-network-builder-v2";
  const fresh = () => ({ records: {}, selected: S.records[0].id, reflection: "", revealed: false });
  let work = fresh();
  try { work = { ...work, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch (_) {}
  if (!work.records || typeof work.records !== "object") work.records = {};
  if (!byDoc.has(work.selected)) work.selected = S.records[0].id;
  for (const record of S.records) {
    const item = work.records[record.id];
    if (!item || !["tie", "none"].includes(item.kind) ||
      (item.kind === "tie" && (!people.includes(item.source) || !people.includes(item.target) || item.source === item.target)))
      delete work.records[record.id];
  }
  let pending = "", gesture = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const save = () => { try { localStorage.setItem(key, JSON.stringify(work)); } catch (_) {} };
  const pairKey = (a, b) => [a, b].sort((x, y) => x.localeCompare(y)).join(" ↔ ");
  const short = (name) => name.includes(",") ? name.split(",")[0] : name;
  const status = (message) => { document.getElementById("buildStatus").textContent = message; };
  const decided = () => S.records.filter((record) => work.records[record.id]?.kind).length;
  const positions = new Map();
  const top = Math.ceil(people.length / 2);
  people.forEach((name, i) => {
    const count = i < top ? top : people.length - top;
    const index = i < top ? i : i - top;
    positions.set(name, { x: (index + 1) * 800 / (count + 1), y: i < top ? 155 : 355 });
  });

  function edges() {
    return S.records.flatMap((record) => {
      const item = work.records[record.id];
      return item?.kind === "tie" ? [{ doc: record.id, source: item.source, target: item.target }] : [];
    });
  }
  function graph(edgeRows, baseIds = people) {
    const ids = [...new Set([...baseIds, ...edgeRows.flatMap((edge) => [edge.source, edge.target])])].sort();
    const adj = new Map(ids.map((id) => [id, new Set()]));
    const volume = new Map(ids.map((id) => [id, 0]));
    const pairs = new Map();
    for (const edge of edgeRows) {
      if (edge.source === edge.target) continue;
      adj.get(edge.source).add(edge.target);
      adj.get(edge.target).add(edge.source);
      volume.set(edge.source, volume.get(edge.source) + 1);
      volume.set(edge.target, volume.get(edge.target) + 1);
      const pair = pairKey(edge.source, edge.target);
      pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }
    return { ids, adj, volume, pairs };
  }
  function graphSvg(edgeRows, selectedDoc = "", interactive = false) {
    const g = graph(edgeRows);
    const item = work.records[selectedDoc];
    const active = item?.kind === "tie" ? pairKey(item.source, item.target) : "";
    const lines = [...g.pairs].map(([pair, weight]) => {
      const [a, b] = pair.split(" ↔ ");
      const p = positions.get(a), q = positions.get(b);
      return '<line class="tie' + (pair === active ? ' active' : '') + '" x1="' + p.x +
        '" y1="' + p.y + '" x2="' + q.x + '" y2="' + q.y + '" style="stroke-width:' +
        Math.min(7, 2 + weight * 1.5) + '"><title>' + esc(pair) + ' · ' + weight +
        ' document' + (weight === 1 ? '' : 's') + '</title></line>';
    }).join("");
    const nodes = people.map((name) => {
      const p = positions.get(name);
      return '<g class="' + (interactive ? 'person' : 'person-static') +
        (pending === name && interactive ? ' pending' : '') + '"' +
        (interactive ? ' data-node="' + esc(name) + '" tabindex="0" role="button" aria-label="Connect ' + esc(name) + '"' : '') +
        '><circle cx="' + p.x + '" cy="' + p.y + '" r="27"></circle>' +
        '<text x="' + p.x + '" y="' + (p.y + 51) + '" text-anchor="middle" font-size="17">' +
        esc(short(name)) + '</text><title>' + esc(name) + '</title></g>';
    }).join("");
    return lines + (interactive ? '<line id="dragLine" class="drag-line" style="display:none"></line>' : '') + nodes;
  }
  function renderGraph() {
    const rows = edges(), g = graph(rows);
    svg.innerHTML = graphSvg(rows, work.selected, true);
    document.getElementById("miniStats").textContent = people.length + " people · " +
      g.pairs.size + " ties · " + rows.length + " document edges";
  }
  function renderRecords() {
    deck.innerHTML = S.records.map((record, i) => {
      const item = work.records[record.id];
      const label = item?.kind === "tie" ? "Tie" : item?.kind === "none" ? "No tie" : "—";
      return '<button class="record-tab" data-doc="' + esc(record.id) + '" aria-current="' +
        (record.id === work.selected) + '"><span class="record-num">' + String(i + 1).padStart(2, "0") +
        '</span><span>' + esc(record.date) + '<br><small class="note">' + esc(record.edition) +
        ' Papers</small></span><span class="record-state">' + label + '</span></button>';
    }).join("");
  }
  function renderReader() {
    const record = byDoc.get(work.selected);
    const item = work.records[record.id];
    const state = item?.kind === "tie" ? "Tie: " + item.source + " ↔ " + item.target :
      item?.kind === "none" ? "No tie in your network" : "No decision yet";
    reader.innerHTML = '<p class="eyebrow">Selected record</p><h4>' + esc(record.title) + '</h4>' +
      '<p class="note">' + esc(record.date) + ' · ' + esc(record.edition) + ' Papers</p>' +
      '<p><a class="action" href="' + esc(record.url) +
      '" target="_blank" rel="noopener">Read full document ↗</a></p>' +
      '<p class="note">Use the source to decide whether to draw a tie or exclude this record.</p>' +
      '<p class="note"><b>' + esc(state) + '</b></p>' +
      '<div class="task-row"><button class="action" id="noTie">No tie</button>' +
      '<button class="action" id="clearDecision" ' + (item ? '' : 'disabled') + '>Clear decision</button></div>';
  }
  function validate() {
    if (decided() < S.records.length) return "Decide all ten records before comparing.";
    if (!edges().length) return "Create at least one tie before comparing.";
    return "";
  }
  function render() {
    renderRecords();
    renderReader();
    renderGraph();
    document.getElementById("buildProgress").textContent = decided() + " / " +
      S.records.length + " documents decided";
    document.getElementById("revealFull").disabled = Boolean(validate());
  }
  function selectDocument(id) {
    if (!byDoc.has(id)) return false;
    work.selected = id;
    pending = "";
    save(); render();
    status("");
    return true;
  }
  function decide(item) {
    work.records[work.selected] = item;
    work.revealed = false;
    document.getElementById("comparePanel").hidden = true;
    document.getElementById("fullLab").hidden = true;
    pending = "";
    const next = S.records.find((record) => !work.records[record.id]?.kind);
    if (next) work.selected = next.id;
    save(); render();
    status(validate() ? "" : "All ten records decided. Compare your network.");
  }
  function connect(a, b) {
    if (!people.includes(a) || !people.includes(b) || a === b) return false;
    decide({ kind: "tie", source: a, target: b });
    return true;
  }
  function markNoTie() {
    decide({ kind: "none" });
  }
  function clearDecision() {
    delete work.records[work.selected];
    work.revealed = false;
    document.getElementById("comparePanel").hidden = true;
    document.getElementById("fullLab").hidden = true;
    pending = "";
    save(); render(); status("");
  }
  function chooseNode(name) {
    if (!pending) {
      pending = name;
      renderGraph();
      status("Now choose the other person for this document.");
    } else if (pending === name) {
      pending = "";
      renderGraph();
      status("");
    } else {
      const first = pending;
      pending = "";
      connect(first, name);
    }
  }
  function compare() {
    const yours = graph(edges());
    const referenceRows = S.referenceEdges.map(([doc, source, target]) => ({ doc, source, target }));
    const reference = graph(referenceRows);
    const shared = [...yours.pairs.keys()].filter((pair) => reference.pairs.has(pair)).length;
    const union = new Set([...yours.pairs.keys(), ...reference.pairs.keys()]).size;
    const onlyYours = [...yours.pairs.keys()].filter((pair) => !reference.pairs.has(pair));
    const onlyReference = [...reference.pairs.keys()].filter((pair) => !yours.pairs.has(pair));
    const weights = [...yours.pairs.keys()].filter((pair) =>
      reference.pairs.has(pair) && yours.pairs.get(pair) !== reference.pairs.get(pair));
    document.getElementById("studentCompareGraph").innerHTML = graphSvg(edges());
    document.getElementById("referenceGraph").innerHTML = graphSvg(referenceRows);
    document.getElementById("compareIntro").textContent = shared + " shared ties out of " + union +
      " across both builds. Yours uses " + edges().length + " documents; the production build uses " +
      referenceRows.length + ".";
    document.getElementById("compareList").innerHTML =
      '<p><b>Production rule:</b> ' + esc(S.referenceRule) + '</p>' +
      '<p><b>Only in yours:</b> ' + esc(onlyYours.join("; ") || "none") + '</p>' +
      '<p><b>Only in production:</b> ' + esc(onlyReference.join("; ") || "none") + '</p>' +
      '<p><b>Same tie, different document count:</b> ' +
      esc(weights.map((pair) => pair + " (" + yours.pairs.get(pair) + " vs " +
        reference.pairs.get(pair) + ")").join("; ") || "none") + '</p>';
    document.getElementById("comparePanel").hidden = false;
  }
  function reveal() {
    if (validate()) { status(validate()); return false; }
    work.revealed = true;
    save(); compare();
    document.getElementById("fullLab").hidden = false;
    window.networkExplorer.setView("merged");
    window.networkExplorer.reveal();
    window.networkWorkshop.onReveal();
    document.getElementById("comparePanel").scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  function exportText() {
    const lines = ["LETTERS TO NETWORKS — TEN RECORDS", ""];
    for (const record of S.records) {
      const item = work.records[record.id];
      lines.push(record.date + " · " + record.title + " · " + record.url,
        item?.kind === "tie" ? "Tie: " + item.source + " ↔ " + item.target :
          item?.kind === "none" ? "No tie" : "Undecided", "");
    }
    if (work.revealed) {
      const yours = graph(edges());
      lines.push("YOUR NETWORK", people.length + " people · " + yours.pairs.size +
        " distinct ties · " + edges().length + " document edges", "", "YOUR EDGE LIST");
      for (const edge of edges()) lines.push(edge.doc + " · " + edge.source + " ↔ " + edge.target);
      lines.push("");
    }
    lines.push("COMPARISON REFLECTION", work.reflection);
    return lines.join("\n");
  }

  deck.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-doc]");
    if (button) selectDocument(button.dataset.doc);
  });
  reader.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.id === "noTie") markNoTie();
    if (button.id === "clearDecision") clearDecision();
  });
  const point = (event) => {
    const box = svg.getBoundingClientRect();
    return { x: (event.clientX - box.left) * 800 / (box.width || 1),
      y: (event.clientY - box.top) * 500 / (box.height || 1) };
  };
  const nodeAt = ({ x, y }) => people.find((name) => {
    const p = positions.get(name);
    return Math.hypot(p.x - x, p.y - y) <= 36;
  });
  svg.addEventListener("pointerdown", (event) => {
    const node = event.target.closest("[data-node]");
    if (!node) return;
    event.preventDefault();
    gesture = { name: node.dataset.node, x: event.clientX, y: event.clientY, moved: false };
  });
  svg.addEventListener("pointermove", (event) => {
    if (!gesture) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 7) gesture.moved = true;
    const line = svg.querySelector("#dragLine");
    if (!line || !gesture.moved) return;
    const a = positions.get(gesture.name), b = point(event);
    line.style.display = "";
    for (const [key, value] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }))
      line.setAttribute(key, value);
  });
  svg.addEventListener("pointerup", (event) => {
    if (!gesture) return;
    const from = gesture.name, moved = gesture.moved;
    gesture = null;
    const line = svg.querySelector("#dragLine");
    if (line) line.style.display = "none";
    const target = event.target.closest("[data-node]")?.dataset.node;
    const to = moved ? nodeAt(point(event)) || (target !== from ? target : "") : target;
    if (moved) {
      if (to && to !== from) connect(from, to);
      else status("Release on another person, or click two names.");
    } else chooseNode(from);
  });
  svg.addEventListener("pointerleave", () => {
    gesture = null;
    const line = svg.querySelector("#dragLine");
    if (line) line.style.display = "none";
  });
  svg.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const node = event.target.closest("[data-node]");
    if (!node) return;
    event.preventDefault();
    const name = node.dataset.node;
    chooseNode(name);
    [...svg.querySelectorAll("[data-node]")].find((candidate) => candidate.dataset.node === name)?.focus();
  });
  const reflection = document.getElementById("buildReflection");
  reflection.value = work.reflection;
  reflection.addEventListener("input", () => { work.reflection = reflection.value; save(); });
  document.getElementById("revealFull").addEventListener("click", reveal);
  window.networkBuilder = { edges, graph, validate, reveal, selectDocument, connect, markNoTie,
    clearDecision, exportText, people: () => [...people] };
  render();
  if (work.revealed && !validate()) {
    compare();
    document.getElementById("fullLab").hidden = false;
    window.networkExplorer.setView("merged");
    window.networkExplorer.reveal();
    window.networkWorkshop.onReveal();
  }
})();
