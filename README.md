# Letters to Networks

A digital humanities methods lab in which a class builds an evidence-backed relationship network from historical letters.

[Open the lab](https://conradcompagna.github.io/letters-to-networks/explorer/)

## Classroom activity

Thirty students each receive **ten different complete letters**: 300 letters in all. The letters are transcribed from Jared Sparks's public-domain *Diplomatic Correspondence of the American Revolution* and matched to the writer and addressee fields of the corresponding Founders Online records. The writer and addressee of each letter are fixed by the archive.

1. Open the lab and read the ten complete letters assigned to you.
2. Give each relationship between that letter's writer and addressee your own short tag and a one-sentence explanation of the evidence. Add as many relations as the letter supports, then choose another letter in the side panel.
3. Examine the archive graph and write about 250 words on one large-scale pattern, referring to at least five different class-annotated letters. The letters, graph, and writing area are all available from the start.

The [public browser page](https://conradcompagna.github.io/letters-to-networks/explorer/) stores one student's annotations and analysis in that browser; it cannot collect a class. Its graph includes 46 source-backed simulated example relations drawn from all 30 assignment groups, excluding the ten letters assigned to that visitor. These examples illustrate a partial class overlay. Run the classroom server below to collect real class annotations and analyses in `.classroom_private/submissions/`.

## Run the shared class

Requires Python 3.10+ and no extra packages for normal classroom use.

```bash
python classroom_server.py --host 0.0.0.0 --port 8767
```

Direct students to `http://YOUR-COMPUTER-IP:8767/explorer/` on the same network. Each visitor receives the next unclaimed ten-letter assignment automatically; the browser remembers its access code for return visits. The server also prints the 30 codes, which can be used in a link ending `#code=CODE` if a student changes devices. The default host is `127.0.0.1` for use on one computer; `--host 0.0.0.0` makes it reachable from classroom devices. Keep the server running during the session. It creates a private roster and per-student JSON submissions on first use. That folder is excluded from Git.

The graph is available immediately and refreshes every eight seconds as classmates submit annotations. Real submissions replace simulated examples for those documents. Simulated annotations never appear on a student's assigned ten letters. The writing response is saved in that student's private submission. This small server is intended for a trusted classroom network; an internet-facing deployment needs authentication and HTTPS.

## Rebuild the curated corpus

```bash
python -m pip install requests beautifulsoup4 networkx
python scripts/build_classroom.py
python scripts/build_samples.py
python scripts/build_class_overlay.py
```

The curation script selects 300 different 1777–1784 printed letters, each matched to one person-to-person Founders Online record by date, printed heading, correspondent names, and signature. It rejects ambiguous matches and balances the ten-letter assignments by word count. See [data/README.md](data/README.md) for provenance and limitations.

## Optional computational notebook

The graph uses the original four-edition archive network built from the 20,747-record metadata corpus, with the class relations overlaid. For legibility, the drawing shows its largest connected network above the archive explorer's display threshold, plus every person in the 300 class letters. The original node coordinates are preserved; eight extra class correspondents are placed by a constrained spring layout. The [Jupyter notebook](lab.ipynb) remains an optional longer methods exercise. Install [requirements.txt](requirements.txt) and open it with JupyterLab if you want that route.

Metadata: [Founders Online](https://founders.archives.gov), National Archives and University of Virginia Press. Printed letter texts: [Project Gutenberg's Sparks edition](https://www.gutenberg.org/ebooks/search/?query=Diplomatic+Correspondence+American+Revolution+Sparks). Lab design and code: Conrad Compagna.
