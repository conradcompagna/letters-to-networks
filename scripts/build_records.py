"""Extract the lab's record table from the Founders Online metadata dump.

Source: https://founders.archives.gov/Metadata/founders-online-metadata.json
(National Archives / University of Virginia Press; one JSON object per document
with title, permalink, project, authors, recipients, date-from, date-to).

Run  python scripts/build_records.py            (uses data/raw/ if present, else downloads)
Writes data/records.csv: every document in the Franklin, Adams, Jefferson and
Jay Papers dated 1 January 1777 - 31 December 1784.
"""
import csv
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw", "founders-online-metadata.json")
URL = "https://founders.archives.gov/Metadata/founders-online-metadata.json"
PROJECTS = ["Franklin Papers", "Adams Papers", "Jefferson Papers", "Jay Papers"]
START, END = "1777-01-01", "1784-12-31"


def main():
    if not os.path.exists(RAW):
        os.makedirs(os.path.dirname(RAW), exist_ok=True)
        print("downloading", URL, "(about 54 MB)")
        urllib.request.urlretrieve(URL, RAW)
    docs = json.load(open(RAW, encoding="utf-8"))
    rows = []
    for d in docs:
        if d["project"] not in PROJECTS:
            continue
        if not d.get("date-from") or not (START <= d["date-from"] <= END):
            continue
        rows.append(dict(
            doc_id=d["permalink"].rsplit("/documents/", 1)[1],
            edition=d["project"].replace(" Papers", ""),
            date=d["date-from"],
            title=d["title"],
            authors=" | ".join(d["authors"]),
            recipients=" | ".join(d["recipients"]),
            permalink=d["permalink"],
        ))
    rows.sort(key=lambda r: (r["date"], r["edition"], r["doc_id"]))
    out = os.path.join(ROOT, "data", "records.csv")
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(len(rows), "records ->", out)


if __name__ == "__main__":
    main()
