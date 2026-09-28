"""Place class correspondents absent from the original displayed archive graph.

The original archive coordinates are fixed. Only the extra class nodes move in
a spring layout, so the original graph's geometry is preserved exactly.
"""
import json
import math
from pathlib import Path

import networkx as nx

ROOT = Path(__file__).resolve().parents[1]
archive_script = (ROOT / "explorer" / "data.js").read_text(encoding="utf-8")
archive = json.loads(archive_script.split("=", 1)[1].strip().rstrip(";"))["views"]["merged"]
classroom = json.loads((ROOT / "data" / "classroom_letters.json").read_text(encoding="utf-8"))

graph = nx.Graph()
graph.add_weighted_edges_from(archive["links"])
for letter in classroom["letters"]:
    graph.add_edge(letter["writer"], letter["addressee"])

fixed = {node["id"]: (node["x"], node["y"]) for node in archive["nodes"]}
positions = dict(fixed)
missing = [name for name in graph if name not in fixed]
for index, name in enumerate(missing):
    neighbor = next((other for other in graph.neighbors(name) if other in fixed), None)
    x, y = fixed[neighbor] if neighbor else (0, 0)
    positions[name] = (x + .07 * math.cos(index * 2.4),
                       y + .07 * math.sin(index * 2.4))

relaxed = nx.spring_layout(graph, pos=positions, fixed=list(fixed), seed=17,
                           iterations=450, weight=None, k=.07)
extra = {name: [round(float(relaxed[name][0]), 5), round(float(relaxed[name][1]), 5)]
         for name in missing}
(ROOT / "explorer" / "overlay_positions.js").write_text(
    "window.CLASS_OVERLAY_POSITIONS = " + json.dumps(extra, ensure_ascii=False,
                                                   separators=(",", ":")) + ";\n",
    encoding="utf-8")
print(f"Positioned {len(extra)} extra class correspondents while fixing {len(fixed)} archive nodes.")
