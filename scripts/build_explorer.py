"""Precompute the four network views used by explorer/index.html.

Views
  franklin        Franklin Papers only
  franklin_ego    Franklin Papers with Benjamin Franklin removed
  merged          four editions, name authority applied, cross-edition duplicates removed
  merged_core     the merged network with the four editors removed

Each view keeps correspondents with at least MIN_LETTERS documents in its largest
connected component, with a fixed layout, per-node measures and up to 12 documents
per correspondent (with Founders Online links).
Writes explorer/data.js.
"""
import json
import os
import sys

import networkx as nx
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import netlab as nl  # noqa: E402

MIN_LETTERS = {"franklin": 6, "franklin_ego": 2, "merged": 8, "merged_core": 2}
EDITORS = ["Franklin, Benjamin", "Adams, John", "Jefferson, Thomas", "Jay, John"]


def view(G, edges, min_letters, seed=7):
    U = nl.undirected(G)
    keep = [n for n in U if U.degree(n, weight="weight") >= min_letters]
    U = U.subgraph(keep).copy()
    U = U.subgraph(max(nx.connected_components(U), key=len)).copy()
    init = nx.spring_layout(U, seed=seed, weight=None)
    pos = nx.kamada_kawai_layout(U, pos=init, weight=None)
    M = nl.metric_table(G)                      # measures on the full view, not the filtered drawing
    comm = nl.communities(G, seed=42)
    main = nl.node_editions(edges).idxmax(axis=1)
    nodes = []
    for n in U:
        m = M.loc[n]
        nodes.append(dict(id=n, x=round(float(pos[n][0]), 4), y=round(float(pos[n][1]), 4), t=m["type"],
                          s=int(m["letters_sent"]), r=int(m["letters_received"]), c=int(m["correspondents"]),
                          b=round(float(m["betweenness"]), 4), k=int(comm.get(n, -1)), e=main.get(n, "")))
    links = [[a, b, int(d["weight"])] for a, b, d in U.edges(data=True)]
    return dict(nodes=nodes, links=links, summary=nl.summary(G), shown=len(nodes), min_letters=min_letters)


def main():
    R = nl.load_records(os.path.join(ROOT, "data", "records.csv"))
    A = nl.load_authority(os.path.join(ROOT, "data", "name_authority.csv"))
    E_fr = nl.to_edges(R[R.edition == "Franklin"], A)
    G_fr = nl.build_graph(E_fr)
    E_all, _ = nl.dedupe(nl.to_edges(R, A))
    G_all = nl.build_graph(E_all)
    views = {
        "franklin": view(G_fr, E_fr, MIN_LETTERS["franklin"]),
        "franklin_ego": view(nl.without(G_fr, ["Franklin, Benjamin"]), E_fr, MIN_LETTERS["franklin_ego"]),
        "merged": view(G_all, E_all, MIN_LETTERS["merged"]),
        "merged_core": view(nl.without(G_all, EDITORS), E_all, MIN_LETTERS["merged_core"]),
    }
    shown = {n["id"] for v in views.values() for n in v["nodes"]}
    docs = {}
    meta = R.set_index("doc_id")[["date", "title", "permalink", "edition"]]
    e = E_all[E_all.source.isin(shown) | E_all.target.isin(shown)]
    for name in shown:
        ids = e[(e.source == name) | (e.target == name)].drop_duplicates("doc_id").sort_values("date")["doc_id"]
        pick = list(ids[:6]) + list(ids[-6:]) if len(ids) > 12 else list(ids)
        docs[name] = [[meta.at[d, "date"], meta.at[d, "title"], meta.at[d, "permalink"].rsplit("/documents/", 1)[1],
                       meta.at[d, "edition"]] for d in dict.fromkeys(pick)]
        docs[name].append(len(ids))
    out = dict(views=views, docs=docs)
    os.makedirs(os.path.join(ROOT, "explorer"), exist_ok=True)
    with open(os.path.join(ROOT, "explorer", "data.js"), "w", encoding="utf-8") as f:
        f.write("window.NET_DATA = ")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    for k, v in views.items():
        print(k, v["shown"], "nodes shown of", v["summary"]["nodes"], "|", len(v["links"]), "links")


if __name__ == "__main__":
    main()
