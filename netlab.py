"""Helper functions for the correspondence-network lab.

Everything the notebook calculates goes through these functions, so the
decisions a student makes (how to treat group correspondents, whether to merge
name variants, whether to remove duplicate documents) are explicit arguments.
"""
from __future__ import annotations

import random
import re
from collections import Counter

import networkx as nx
import pandas as pd

SEP = " | "

GROUP_WORDS = re.compile(
    r"\b(Commissioners?|Commission|Congress|Committee|Board|Delegates|Council|Assembly|General Court|Court of|Officers|Inhabitants|"
    r"Merchants|Citizens|Members|President of|Governor of|Society|Academy|Magistrates|States|Legislature|"
    r"Senate|House of|Government|Ministers|Crew|Seamen|Prisoners|Gentlemen|Ladies|Trustees|Directors|"
    r"Farmers General|Captains|Deputies|Burgomasters|Regency|Admiralty|Lodge|Freemasons|Chamber|Department|"
    r"Treasury|Navy|Army|Corps|Regiment|People of|Friends of|Subscribers|Proprietors)\b")
FIRM_WORDS = re.compile(r"&|\bCo\.|\bCie\b|\bCie\.|\(business\)|\bfils\b|\bCompany\b|\bFrères\b|\bBrothers\b")
UNKNOWN = re.compile(r"^(Unknown|Anonymous)")


def entity_type(name: str) -> str:
    """person | firm | group | pseudonym | unknown.
    Names with an unknown forename ('Joyce, ——') and surname-only names ('Chaumont')
    are persons. Group vocabulary is only tested before the first comma, so
    'Gébelin, Antoine Court de' stays a person."""
    if UNKNOWN.search(name):
        return "unknown"
    if name[:1] in "“\"":
        return "pseudonym"
    if FIRM_WORDS.search(name):
        return "firm"
    if GROUP_WORDS.search(name.split(",")[0]):
        return "group"
    return "person"


# ---------------------------------------------------------------- loading

def load_records(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    for col in ("authors", "recipients"):
        df[col] = df[col].apply(lambda s: [x for x in s.split(SEP) if x] if s else [])
    df["year"] = df["date"].str[:4].astype(int)
    return df


def load_authority(path: str, include_probable: bool = False) -> dict:
    a = pd.read_csv(path, dtype=str)
    ok = {"merge"} | ({"probable"} if include_probable else set())
    a = a[a["decision"].isin(ok)]
    return dict(zip(a["variant"], a["canonical"]))


# ---------------------------------------------------------------- records -> edges

def _apply_policy(names: list[str], policy: str) -> list[str]:
    """Group correspondents: 'individuals' drops a group when persons are also listed,
    'collective' drops the persons when a group is listed, 'both' keeps everything."""
    groups = [n for n in names if entity_type(n) == "group"]
    people = [n for n in names if entity_type(n) != "group"]
    if not groups or not people or policy == "both":
        return names
    return people if policy == "individuals" else groups


def to_edges(records: pd.DataFrame, authority: dict | None = None, group_policy: str = "individuals",
             drop_unknown: bool = True) -> pd.DataFrame:
    """One row per (document, author, recipient). Documents without both an author
    and a recipient (diaries, memoranda, accounts) produce no edges."""
    authority = authority or {}
    rows = []
    for r in records.itertuples(index=False):
        a = [authority.get(n, n) for n in r.authors]
        b = [authority.get(n, n) for n in r.recipients]
        if drop_unknown:
            a = [n for n in a if entity_type(n) != "unknown"]
            b = [n for n in b if entity_type(n) != "unknown"]
        a, b = _apply_policy(a, group_policy), _apply_policy(b, group_policy)
        for s in dict.fromkeys(a):
            for t in dict.fromkeys(b):
                if s != t:
                    rows.append((r.doc_id, r.edition, r.date, s, t))
    return pd.DataFrame(rows, columns=["doc_id", "edition", "date", "source", "target"])


def document_key(edges: pd.DataFrame) -> pd.Series:
    """Key used to recognise the same letter printed in more than one edition:
    same date + same set of senders + same set of recipients."""
    g = edges.groupby("doc_id").agg(date=("date", "first"),
                                    s=("source", lambda x: tuple(sorted(set(x)))),
                                    t=("target", lambda x: tuple(sorted(set(x)))))
    return (g["date"] + "|" + g["s"].map(";".join) + "|" + g["t"].map(";".join)).rename("letter_key")


def dedupe(edges: pd.DataFrame, prefer: list[str] | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Remove letters printed in more than one edition.

    Two documents are treated as the same letter when they have the same date, the
    same senders and the same recipients AND come from different editions. Several
    documents with the same key inside one edition are kept: they are usually
    separate letters written on the same day (see Stage 6).
    Returns (deduplicated edges, table of the cross-edition duplicate groups)."""
    prefer = prefer or ["Franklin", "Adams", "Jefferson", "Jay"]
    key = document_key(edges)
    docs = edges.drop_duplicates("doc_id")[["doc_id", "edition"]].set_index("doc_id").join(key)
    n_ed = docs.groupby("letter_key")["edition"].nunique()
    multi = n_ed[n_ed > 1].index
    rank = {e: i for i, e in enumerate(prefer)}
    docs["rank"] = docs["edition"].map(rank).fillna(len(rank))
    best = docs[docs["letter_key"].isin(multi)].groupby("letter_key")["rank"].min()
    drop = docs[docs["letter_key"].isin(multi) & (docs["rank"] != docs["letter_key"].map(best))].index
    dup = docs[docs["letter_key"].isin(multi)].reset_index().sort_values(["letter_key", "rank"])
    return edges[~edges["doc_id"].isin(drop)].copy(), dup.drop(columns="rank")


# ---------------------------------------------------------------- graph and metrics

def build_graph(edges: pd.DataFrame, directed: bool = True) -> nx.Graph:
    G = nx.DiGraph() if directed else nx.Graph()
    w = edges.groupby(["source", "target"]).size()
    for (s, t), n in w.items():
        if directed:
            G.add_edge(s, t, weight=int(n))
        else:
            if G.has_edge(s, t):
                G[s][t]["weight"] += int(n)
            else:
                G.add_edge(s, t, weight=int(n))
    for n in G.nodes:
        G.nodes[n]["type"] = entity_type(n)
    return G


def undirected(G: nx.DiGraph) -> nx.Graph:
    U = nx.Graph()
    for s, t, d in G.edges(data=True):
        if U.has_edge(s, t):
            U[s][t]["weight"] += d["weight"]
        else:
            U.add_edge(s, t, weight=d["weight"])
    return U


def metric_table(G: nx.DiGraph, betweenness_k: int | None = None, seed: int = 0) -> pd.DataFrame:
    """Per-node measures. Betweenness is computed on the undirected, unweighted graph
    (who lies on shortest paths between others), normalised to 0-1."""
    U = undirected(G)
    bt = nx.betweenness_centrality(U, k=betweenness_k, seed=seed, normalized=True)
    comp = {}
    for i, c in enumerate(sorted(nx.connected_components(U), key=len, reverse=True)):
        for n in c:
            comp[n] = i
    df = pd.DataFrame({
        "letters_sent": dict(G.out_degree(weight="weight")),
        "letters_received": dict(G.in_degree(weight="weight")),
        "correspondents_out": dict(G.out_degree()),
        "correspondents_in": dict(G.in_degree()),
        "correspondents": dict(U.degree()),
        "betweenness": bt,
        "component": comp,
    })
    df["letters_total"] = df["letters_sent"] + df["letters_received"]
    df["type"] = [entity_type(n) for n in df.index]
    return df.sort_values("letters_total", ascending=False)


def summary(G: nx.DiGraph) -> dict:
    U = undirected(G)
    comps = sorted((len(c) for c in nx.connected_components(U)), reverse=True)
    return dict(nodes=G.number_of_nodes(), ties=U.number_of_edges(),
                letters=int(sum(d["weight"] for *_, d in G.edges(data=True))),
                density=round(nx.density(U), 5), components=len(comps),
                largest_component=comps[0] if comps else 0,
                isolated_pairs=sum(1 for c in comps if c == 2))


def without(G: nx.DiGraph, nodes: list[str]) -> nx.DiGraph:
    H = G.copy()
    H.remove_nodes_from([n for n in nodes if n in H])
    H.remove_nodes_from(list(nx.isolates(H)))
    return H


def communities(G: nx.DiGraph, seed: int = 42, resolution: float = 1.0) -> dict:
    U = undirected(G)
    parts = nx.community.louvain_communities(U, weight="weight", seed=seed, resolution=resolution)
    parts = sorted(parts, key=len, reverse=True)
    return {n: i for i, c in enumerate(parts) for n in c}


def node_editions(edges: pd.DataFrame) -> pd.DataFrame:
    """For each correspondent, how many of their letters each edition supplies."""
    long = pd.concat([edges[["source", "edition"]].rename(columns={"source": "name"}),
                      edges[["target", "edition"]].rename(columns={"target": "name"})])
    return long.groupby(["name", "edition"]).size().unstack(fill_value=0)


def rank_stability(edges: pd.DataFrame, measure: str, keep_share: float = 0.8, reps: int = 20,
                   top: int = 20, seed: int = 1, exclude: list[str] | None = None) -> pd.DataFrame:
    """Drop a random share of *documents* (simulated archival loss) and compare the top-N
    by `measure` with the full-data top-N. Nodes in `exclude` are removed from the graph
    before measuring (as in Stage 7). Returns one row per replicate."""
    exclude = list(exclude or [])
    full = metric_table(without(build_graph(edges), exclude))
    ref = list(full.sort_values(measure, ascending=False).index[:top])
    docs = edges["doc_id"].unique().tolist()
    rng = random.Random(seed)
    out = []
    for i in range(reps):
        kept = set(rng.sample(docs, int(len(docs) * keep_share)))
        m = metric_table(without(build_graph(edges[edges["doc_id"].isin(kept)]), exclude))
        cur = list(m.sort_values(measure, ascending=False).index[:top])
        common = [n for n in ref if n in m.index]
        rho = pd.Series({n: ref.index(n) for n in common}).corr(
            m.loc[common, measure].rank(ascending=False), method="spearman") if len(common) > 2 else float("nan")
        out.append(dict(rep=i, overlap=len(set(ref) & set(cur)) / top, spearman=round(rho, 3)))
    return pd.DataFrame(out)


def top(df: pd.DataFrame, col: str, n: int = 15, cols: list[str] | None = None) -> pd.DataFrame:
    cols = cols or ["letters_sent", "letters_received", "correspondents", "betweenness", "type"]
    return df.sort_values(col, ascending=False)[cols].head(n)


# ---------------------------------------------------------------- name variants and time

def _plain(s: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z ]", " ", s)


def variant_candidates(records: pd.DataFrame, min_letters: int = 3) -> pd.DataFrame:
    """Pairs of person names that share a surname and have overlapping given-name words,
    for a human to judge. High string similarity is NOT evidence of identity (John Adams /
    John Quincy Adams); these are only candidates."""
    from difflib import SequenceMatcher
    cnt, eds = Counter(), {}
    for r in records.itertuples(index=False):
        for n in r.authors + r.recipients:
            cnt[n] += 1
            eds.setdefault(n, set()).add(r.edition)
    names = [n for n, c in cnt.items() if c >= min_letters and entity_type(n) == "person"]
    by_sur = {}
    for n in names:
        by_sur.setdefault(_plain(n.split(",")[0]).strip(), []).append(n)
    rows = []
    for sur, L in by_sur.items():
        for i in range(len(L)):
            for j in range(i + 1, len(L)):
                a, b = L[i], L[j]
                ga = set(_plain(a.split(",", 1)[1] if "," in a else "").split())
                gb = set(_plain(b.split(",", 1)[1] if "," in b else "").split())
                if not ga or not gb or not (ga & gb):
                    continue
                rows.append(dict(name_a=a, letters_a=cnt[a], editions_a="+".join(sorted(eds[a])),
                                 name_b=b, letters_b=cnt[b], editions_b="+".join(sorted(eds[b])),
                                 string_similarity=round(SequenceMatcher(None, _plain(a), _plain(b)).ratio(), 2)))
    return pd.DataFrame(rows).sort_values("string_similarity", ascending=False).reset_index(drop=True)


def yearly(edges: pd.DataFrame, exclude: list[str] | None = None, top_n: int = 5) -> pd.DataFrame:
    """Top correspondents by betweenness for each calendar year."""
    rows = []
    for y, e in edges.groupby(edges["date"].str[:4]):
        G = build_graph(e)
        if exclude:
            G = without(G, exclude)
        m = metric_table(G)
        for name, r in m.sort_values("betweenness", ascending=False).head(top_n).iterrows():
            rows.append(dict(year=int(y), name=name, betweenness=round(r["betweenness"], 3),
                             letters=int(r["letters_total"])))
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- figures

PALETTE = {"Franklin": "#2a78d6", "Adams": "#eb6834", "Jefferson": "#1baf7a", "Jay": "#6f6e69"}
INK, MUTED, GRID = "#0b0b0b", "#52514e", "#e4e3df"


def style(ax):
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(GRID)
    ax.tick_params(colors=MUTED, labelsize=9)
    ax.title.set_color(INK)
    return ax


def bar(series: pd.Series, title: str, xlabel: str = "", ax=None, color: str = "#2a78d6"):
    """Horizontal bar chart of a ranked Series (largest at top), values labelled at bar ends."""
    import matplotlib.pyplot as plt
    s = series.iloc[::-1]
    if ax is None:
        _, ax = plt.subplots(figsize=(7, 0.32 * len(s) + 0.8))
    ax.barh(range(len(s)), s.values, color=color, height=0.7)
    ax.set_yticks(range(len(s)))
    ax.set_yticklabels([n if len(n) <= 38 else n[:36] + "…" for n in s.index], fontsize=9, color=INK)
    fmt = (lambda v: f"{v:.3f}") if s.max() <= 1 else (lambda v: f"{int(v):,}")
    for i, v in enumerate(s.values):
        ax.text(v, i, " " + fmt(v), va="center", fontsize=8, color=MUTED)
    ax.set_xlabel(xlabel, color=MUTED, fontsize=9)
    ax.set_title(title, loc="left", fontsize=11)
    ax.grid(axis="x", color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    return style(ax)


def draw(G: nx.DiGraph, color_by: dict | None = None, size_by: dict | None = None, labels: list[str] | None = None,
         title: str = "", seed: int = 7, ax=None, min_letters: int = 1, pos: dict | None = None):
    """Force-directed drawing. Node area ~ letters; colour = edition that supplies most of a
    correspondent's letters (Jay shown in grey as the fourth, smallest edition)."""
    import matplotlib.pyplot as plt
    U = undirected(G)
    keep = [n for n in U if U.degree(n, weight="weight") >= min_letters]
    U = U.subgraph(keep).copy()
    if len(U) and not nx.is_connected(U):
        U = U.subgraph(max(nx.connected_components(U), key=len)).copy()
    if ax is None:
        _, ax = plt.subplots(figsize=(8, 8))
    if pos is None:
        init = nx.spring_layout(U, seed=seed, weight=None)
        pos = nx.kamada_kawai_layout(U, pos=init, weight=None) if len(U) <= 900 else init
    sizes = [6 + 0.6 * (size_by or dict(U.degree(weight="weight"))).get(n, 1) ** 0.85 for n in U]
    cols = [PALETTE.get(color_by.get(n, ""), "#9c9b96") for n in U] if color_by else "#2a78d6"
    nx.draw_networkx_edges(U, pos, ax=ax, edge_color="#c9c8c3", width=0.4, alpha=0.7)
    nx.draw_networkx_nodes(U, pos, ax=ax, node_size=sizes, node_color=cols, edgecolors="#fcfcfb", linewidths=0.6)
    for n in labels or []:
        if n in pos:
            x, y = pos[n]
            ax.annotate(short(n), (x, y), xytext=(4, 3), textcoords="offset points", fontsize=8,
                        color=INK, bbox=dict(boxstyle="round,pad=0.15", fc="#fcfcfbcc", ec="none"))
    ax.set_title(title, loc="left", fontsize=11, color=INK)
    ax.axis("off")
    return ax, pos


def short(n: str) -> str:
    """'Franklin, William Temple' -> 'Franklin, W. T.'; groups and firms unchanged."""
    if entity_type(n) != "person" or "," not in n:
        return n if len(n) < 32 else n[:30] + "…"
    sur, given = n.split(",", 1)
    ini = " ".join(w[0] + "." for w in re.split(r"[\s-]+", given.strip()) if w[:1].isalpha() and w[0].isupper())
    return f"{sur}, {ini}" if ini else sur


def legend_editions(ax):
    from matplotlib.lines import Line2D
    h = [Line2D([], [], marker="o", ls="", color=c, label=e + " Papers", markersize=7) for e, c in PALETTE.items()]
    ax.legend(handles=h, loc="lower left", frameon=False, fontsize=8)
