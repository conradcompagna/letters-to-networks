"""Build the browser workshop's small record bundle and production comparison.

The comparison applies the same name authority, group policy, and cross-edition
deduplication as build_explorer.py, but only to these selected source records.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import netlab as nl  # noqa: E402

DOC_IDS = [
    "Adams/06-12-02-0115",          # Adams -> Franklin
    "Franklin/01-36-02-0249",       # Hartley -> Franklin
    "Franklin/01-36-02-0250",       # Morris -> Franklin
    "Franklin/01-36-02-0267",       # Livingston -> Franklin
    "Adams/06-12-02-0119",          # Livingston -> Adams
    "Franklin/01-36-02-0274",       # Franklin -> Morris (another document)
    "Franklin/01-36-02-0279",       # Dumas -> Franklin
    "Franklin/01-36-02-0285",       # Jay -> Franklin
    "Franklin/01-36-02-0252",       # same Adams letter in Franklin edition
    "Franklin/01-36-02-0245",       # journal: no recipient
]


def main():
    records = nl.load_records(os.path.join(ROOT, "data", "records.csv"))
    found = records.set_index("doc_id")
    missing = set(DOC_IDS) - set(found.index)
    if missing:
        raise ValueError(f"Missing workshop records: {sorted(missing)}")
    selected = found.loc[DOC_IDS].reset_index()
    authority = nl.load_authority(os.path.join(ROOT, "data", "name_authority.csv"))
    edges, _ = nl.dedupe(nl.to_edges(selected, authority, group_policy="individuals"))
    payload = {
        "records": [
            {
                "id": r.doc_id, "edition": r.edition, "date": r.date,
                "title": r.title, "authors": r.authors, "recipients": r.recipients,
                "url": r.permalink,
            }
            for r in selected.itertuples(index=False)
        ],
        "referenceEdges": [
            [r.doc_id, r.source, r.target]
            for r in edges.itertuples(index=False)
        ],
        "referenceRule": "One tie for each correspondence document with named people at both ends; remove cross-edition duplicate printings of the same letter.",
    }
    dest = os.path.join(ROOT, "explorer", "starter_data.js")
    with open(dest, "w", encoding="utf-8") as f:
        f.write("window.STARTER_DATA = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"{len(payload['records'])} records; {len(payload['referenceEdges'])} production document edges")


if __name__ == "__main__":
    main()
