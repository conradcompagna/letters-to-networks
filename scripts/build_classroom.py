"""Curate 300 complete public-domain letters matched to Founders Online metadata.

The 1830 Sparks edition supplies text; the archive supplies author/recipient IDs.
This intentionally rejects ambiguous matches and non-person endpoints. Run with
requests and beautifulsoup4 installed. The generated classroom_data.js is used
by the browser, so ordinary classroom use needs neither package.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import requests
import networkx as nx
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import netlab as nl  # noqa: E402

VOLUMES = {
    "I": 27371, "III": 42355, "IV": 41640, "V": 41833, "VI": 39344,
    "VII": 37898, "VIII": 27372, "IX": 29438, "X": 38642,
}
MONTHS = {name.lower(): i for i, name in enumerate(
    "January February March April May June July August September October November December".split(), 1)}
DATE = re.compile(
    r"(?i)(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+(\d{1,2})(?:st|nd|rd|th|d)?[,.\s]+(17\d{2}|18\d{2})"
)
STOP = {"the", "count", "lord", "minister", "foreign", "affairs", "president",
        "congress", "secretary", "his", "excellency", "sir", "mr", "general"}


def norm(value: str) -> str:
    value = value.lower().replace("b. franklin", "benjamin franklin")
    return " ".join(re.sub(r"[^a-z ]", " ", value).split())


def date_of(value: str) -> str | None:
    match = DATE.search(value)
    if not match:
        return None
    return f"{int(match[3]):04}-{MONTHS[match[1].lower()]:02}-{int(match[2]):02}"


def source_letters():
    for volume, ebook in VOLUMES.items():
        url = f"https://www.gutenberg.org/files/{ebook}/{ebook}-h/{ebook}-h.htm"
        page = requests.get(url, timeout=35)
        page.raise_for_status()
        headings = BeautifulSoup(page.text, "html.parser").find_all("h3")
        for index, heading in enumerate(headings):
            label = " ".join(heading.get_text(" ", strip=True).split())
            if " TO " not in label.upper() and not label.upper().startswith("TO "):
                continue
            paragraphs = []
            for sibling in heading.next_siblings:
                if getattr(sibling, "name", None) == "h3":
                    break
                if getattr(sibling, "name", None) != "p":
                    continue
                for marker in sibling.select(".pagenum, .fnanchor"):
                    marker.decompose()
                text = " ".join(sibling.get_text(" ", strip=True).split())
                if text:
                    paragraphs.append(text)
            words = sum(len(part.split()) for part in paragraphs)
            if len(paragraphs) < 3 or not 75 <= words <= 900:
                continue
            date = date_of(paragraphs[0])
            if not date or not "1777-01-01" <= date <= "1784-12-31":
                continue
            yield dict(volume=volume, sourceUrl=url, sourceIndex=index,
                       heading=label, date=date, paragraphs=paragraphs, words=words)


def score(letter, record) -> float | None:
    heading = letter["heading"].upper()
    if " TO " in heading:
        printed_from, printed_to = heading.split(" TO ", 1)
    else:
        printed_from, printed_to = "", heading[3:]
    author = record["authors"][0]
    recipient = record["recipients"][0]
    author_surname = norm(author.split(",", 1)[0])
    recipient_surname = norm(recipient.split(",", 1)[0])
    if printed_from and author_surname not in norm(printed_from).split():
        return None
    target_tokens = {token for token in norm(printed_to).split() if len(token) > 2 and token not in STOP}
    heading_match = recipient_surname in norm(printed_to).split()
    generic_target = not target_tokens
    if not heading_match and not generic_target:
        return None
    sender_in_heading = bool(printed_from and author_surname in norm(printed_from).split())
    signature = norm(" ".join(letter["paragraphs"][-2:]))
    sender_in_signature = author_surname in signature.split()
    if not sender_in_heading and not sender_in_signature:
        return None
    title = record["title"]
    title_sim = SequenceMatcher(None, norm(letter["heading"]), norm(title)).ratio()
    if generic_target and title_sim < 0.58:
        return None
    return (2.0 if heading_match else 0) + (1.0 if sender_in_heading else 0) + \
        (1.0 if sender_in_signature else 0) + title_sim


def trim_edition_context(paragraphs: list[str], writer: str) -> list[str]:
    """Stop at the sign-off; Sparks sometimes appends memoir narrative to letters."""
    surname = writer.split(",", 1)[0].upper()
    for index, paragraph in enumerate(paragraphs[2:], 2):
        letters = [char for char in paragraph if char.isalpha()]
        if not letters or len(paragraph) > 100 or surname not in paragraph.upper():
            continue
        if sum(char.isupper() for char in letters) / len(letters) < .8:
            continue
        end = index + 1
        while end < len(paragraphs) and re.match(r'^\s*["“]?\s*(?:P\.?\s*S\.?|N\.?\s*B\.?)', paragraphs[end], re.I):
            end += 1
        return paragraphs[:end]
    return [p for p in paragraphs if not p.startswith("END OF THE ")]


def main():
    rows = list(csv.DictReader((ROOT / "data" / "records.csv").open(encoding="utf-8")))
    authority = nl.load_authority(str(ROOT / "data" / "name_authority.csv"))
    by_date = defaultdict(list)
    for row in rows:
        authors = [authority.get(n, n) for n in row["authors"].split(" | ") if n]
        recipients = [authority.get(n, n) for n in row["recipients"].split(" | ") if n]
        if len(authors) != 1 or len(recipients) != 1 or authors[0] == recipients[0]:
            continue
        if any(nl.entity_type(n) != "person" for n in authors + recipients):
            continue
        if "two letters" in row["title"].lower() or "translation" in row["title"].lower():
            continue
        row = {**row, "authors": authors, "recipients": recipients}
        by_date[row["date"]].append(row)

    candidates = []
    for letter in source_letters():
        matches = [(score(letter, record), record) for record in by_date[letter["date"]]]
        matches = sorted(((s, r) for s, r in matches if s is not None), key=lambda x: x[0], reverse=True)
        if not matches or matches[0][0] < 2.45:
            continue
        if len(matches) > 1 and matches[0][0] - matches[1][0] < 0.08:
            continue
        rank, record = matches[0]
        paragraphs = trim_edition_context(letter["paragraphs"], record["authors"][0])
        words = sum(len(part.split()) for part in paragraphs)
        if words < 60:
            continue
        candidates.append({**letter, "paragraphs": paragraphs, "words": words,
                           "docId": record["doc_id"], "title": record["title"],
                           "writer": record["authors"][0], "addressee": record["recipients"][0],
                           "catalogUrl": record["permalink"], "matchScore": round(rank, 3)})

    # Prefer the spring 1782 peace-negotiation episode and shorter letters, then
    # keep enough adjacent 1781–83 correspondence to include other routes.
    def priority(item):
        date = item["date"]
        episode = 0 if "1782-02-01" <= date <= "1782-06-30" else 1
        year = 0 if date.startswith("1782") else 1
        length = abs(item["words"] - 280)
        return (episode, year, -item["matchScore"], length, date)

    seen = set()
    chosen = []
    for item in sorted(candidates, key=priority):
        if item["docId"] in seen:
            continue
        seen.add(item["docId"])
        chosen.append(item)
        if len(chosen) == 300:
            break
    if len(chosen) != 300:
        raise ValueError(f"Only {len(chosen)} high-confidence complete letters; need 300")
    chosen.sort(key=lambda item: (item["date"], item["docId"]))
    # Distribute long letters evenly across the 30 individual assignments.
    groups = [[] for _ in range(30)]
    loads = [0] * 30
    for item in sorted(chosen, key=lambda item: item["words"], reverse=True):
        open_groups = [i for i in range(30) if len(groups[i]) < 10]
        group = min(open_groups, key=lambda i: (loads[i], len(groups[i]), i))
        groups[group].append(item["docId"])
        loads[group] += item["words"]
    assignments = {str(i + 1): sorted(group, key=lambda id: next(x["date"] for x in chosen if x["docId"] == id))
                   for i, group in enumerate(groups)}
    graph = nx.Graph()
    for item in chosen:
        source, target = item["writer"], item["addressee"]
        if graph.has_edge(source, target):
            graph[source][target]["weight"] += 1
        else:
            graph.add_edge(source, target, weight=1)
    positions = nx.spring_layout(graph, seed=17, iterations=600,
                                 weight="weight", k=1.8 / (len(graph) ** .5))
    xs = [point[0] for point in positions.values()]
    ys = [point[1] for point in positions.values()]
    layout = {name: [round(75 + 850 * (point[0] - min(xs)) / (max(xs) - min(xs)), 1),
                     round(65 + 480 * (point[1] - min(ys)) / (max(ys) - min(ys)), 1)]
              for name, point in positions.items()}
    payload = {"letters": [{k: v for k, v in item.items() if k != "matchScore"} for item in chosen],
               "assignments": assignments,
               "layout": layout,
               "sources": {volume: f"https://www.gutenberg.org/ebooks/{ebook}"
                           for volume, ebook in VOLUMES.items()}}
    source_path = ROOT / "data" / "classroom_letters.json"
    source_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "explorer" / "classroom_data.js").write_text(
        "window.CLASSROOM_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    print(f"{len(candidates)} candidates; 300 selected; assignment words {min(loads)}–{max(loads)}")
    print("Selected volumes:", dict((v, sum(x["volume"] == v for x in chosen)) for v in VOLUMES))
    print("Selected dates:", chosen[0]["date"], "through", chosen[-1]["date"])


if __name__ == "__main__":
    main()
