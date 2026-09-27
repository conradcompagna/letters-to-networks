"""Build the ten-letter reader and its catalog-based comparison network."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import netlab as nl  # noqa: E402

DISPLAY_NAMES = {
    "Adams, John": "John Adams",
    "Alexander, William": "William Alexander",
    "Franklin, Benjamin": "Benjamin Franklin",
    "Hartley, David": "David Hartley",
    "Jay, John": "John Jay",
    "Livingston, Robert R.": "Robert R. Livingston",
    "Vergennes, Charles Gravier, comte de": "Count de Vergennes",
}


def main():
    with open(os.path.join(ROOT, "data", "starter_letters.json"), encoding="utf-8") as f:
        source = json.load(f)
    letters = source["letters"]
    doc_ids = [letter["doc_id"] for letter in letters]
    if len(doc_ids) != 10 or len(set(doc_ids)) != 10:
        raise ValueError("The starter bundle must contain ten distinct letters")

    records = nl.load_records(os.path.join(ROOT, "data", "records.csv"))
    found = records.set_index("doc_id")
    missing = set(doc_ids) - set(found.index)
    if missing:
        raise ValueError(f"Missing catalog records: {sorted(missing)}")
    selected = found.loc[doc_ids].reset_index()
    authority = nl.load_authority(os.path.join(ROOT, "data", "name_authority.csv"))
    edges, _ = nl.dedupe(nl.to_edges(selected, authority, group_policy="individuals"))
    if len(edges) != 10 or len(set(edges.doc_id)) != 10:
        raise ValueError("Each selected letter must yield one distinct catalog edge")
    catalog = {r.doc_id: r for r in selected.itertuples(index=False)}
    payload = {
        "records": [
            {
                "id": letter["doc_id"],
                "date": catalog[letter["doc_id"]].date,
                "title": catalog[letter["doc_id"]].title,
                "url": catalog[letter["doc_id"]].permalink,
                "sourceUrl": letter["source_url"],
                "volume": letter["volume"],
                "editionHeading": letter["edition_heading"],
                "paragraphs": letter["paragraphs"],
            }
            for letter in letters
        ],
        "referenceEdges": [
            [r.doc_id, DISPLAY_NAMES[r.source], DISPLAY_NAMES[r.target]]
            for r in edges.itertuples(index=False)
        ],
        "referenceRule": "One directed writer → addressee edge per letter, using the catalog's author and recipient fields. Degree and betweenness later use undirected ties between distinct people.",
    }
    dest = os.path.join(ROOT, "explorer", "starter_data.js")
    with open(dest, "w", encoding="utf-8") as f:
        f.write("window.STARTER_DATA = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"{len(payload['records'])} complete letters; {len(payload['referenceEdges'])} catalog edges")


if __name__ == "__main__":
    main()
