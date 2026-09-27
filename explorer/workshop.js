(() => {
  const body = document.getElementById("taskBody");
  const key = "letters-network-analysis-v3";
  let work = { name: "", claim: "" };
  try { work = { ...work, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch (_) {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(work)); } catch (_) {} };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const words = (s) => (String(s || "").trim().match(/\S+/g) || []).length;

  function render() {
    body.innerHTML = `<div class="task-head"><h2>Analyze the full network</h2></div>
      <p class="task-copy">Use the graph controls and linked source letters to test how the measures change your reading of correspondence.</p>
      <ol class="analysis-steps">
        <li>Set <b>Size by</b> to <b>Degree</b>, the number of distinct correspondents, and inspect the largest nodes.</li>
        <li>Switch to <b>Betweenness</b>, how often someone sits on the shortest path between others, and find a changed ranking.</li>
        <li>Set <b>Colour by</b> to <b>Community</b>, a group with comparatively dense internal ties; inspect two linked letters.</li>
      </ol>
      <label class="task-field" for="claim"><b>500-word response</b> Which correspondent's importance changes when you switch from degree to betweenness, and why? Compare that person with another named correspondent. Use their ties, community positions, and at least two linked letters to argue what their network positions reveal about their historical roles and how the four edited collections might shape the pattern.
        <textarea id="claim" placeholder="Make your claim and cite the letters you inspected…">${esc(work.claim)}</textarea></label>
      <div class="submission-row"><label class="task-field" for="studentName">Name or student ID<input id="studentName" value="${esc(work.name)}" autocomplete="name" placeholder="Your name or ID"></label>
        <span class="word-count" id="claimCount">${words(work.claim)} / 500 words</span>
        <button class="action primary" id="downloadLab">Download assignment to submit</button></div>
      <p class="note" id="submissionStatus" role="status" aria-live="polite">Download the text file and submit it in your course site.</p>`;
  }
  function download() {
    const count = words(work.claim), status = body.querySelector("#submissionStatus");
    if (!work.name.trim()) { status.textContent = "Enter your name or student ID."; return; }
    if (count < 450) { status.textContent = "Write about 500 words before downloading (at least 450)."; return; }
    const lines = ["LETTERS TO NETWORKS — STUDENT ASSIGNMENT", `Student: ${work.name.trim()}`,
      "", window.networkBuilder.exportText(), "", "FULL NETWORK RESPONSE", work.claim,
      "", `Response word count: ${count}`];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url;
    a.download = "letters-network-assignment.txt"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "Assignment downloaded. Submit the file in your course site.";
  }
  body.addEventListener("input", (event) => {
    if (event.target.id === "claim") {
      work.claim = event.target.value;
      body.querySelector("#claimCount").textContent = `${words(work.claim)} / 500 words`;
    } else if (event.target.id === "studentName") work.name = event.target.value;
    else return;
    save();
  });
  body.addEventListener("click", (event) => {
    if (event.target.id === "downloadLab") download();
  });
  window.networkWorkshop = { onReveal: render };
  render();
})();
