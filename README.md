# Letters to Networks

A digital humanities methods lab in which a class builds an evidence-backed relationship network from historical letters.

[Open the lab](https://conradcompagna.github.io/letters-to-networks/explorer/)

## Classroom activity

Thirty students each receive **ten different complete letters**: 300 letters in all. The letters are transcribed from Jared Sparks's public-domain *Diplomatic Correspondence of the American Revolution* and matched to the author and recipient fields of the corresponding Founders Online catalog records. The resulting classroom corpus has 43 fixed person nodes and 81 directed correspondence ties. No student has to identify all 43 people or read all 300 letters.

1. Open the lab and read the ten complete letters assigned to you.
2. For each letter, annotate every relationship you can defend between the fixed people: choose its direction and type, quote the supporting words, and explain your inference. If you find no supported relationship, explain why.
3. After all ten letters are annotated, the 300-letter graph appears with your own annotations and the available class annotations. Explore its people, ties, and measures. A **Skip exercise · reveal graph** button opens the graph immediately with simulated class annotations.

The [public browser page](https://conradcompagna.github.io/letters-to-networks/explorer/) stores one student's annotations in that browser; it cannot collect a class. The revealed graph includes twelve simulated example annotations, excluding the ten letters assigned to that visitor. Run the classroom server below to collect real class annotations in `.classroom_private/submissions/`.

## Run the shared class

Requires Python 3.10+ and no extra packages for normal classroom use.

```bash
python classroom_server.py --host 0.0.0.0 --port 8767
```

Direct students to `http://YOUR-COMPUTER-IP:8767/explorer/` on the same network. Each visitor receives the next unclaimed ten-letter assignment automatically; the browser remembers its access code for return visits. The server also prints the 30 codes, which can be used in a link ending `#code=CODE` if a student changes devices. The default host is `127.0.0.1` for use on one computer; `--host 0.0.0.0` makes it reachable from classroom devices. Keep the server running during the session. It creates a private roster and per-student JSON submissions on first use. That folder is excluded from Git.

A student's graph appears after all ten letters are reviewed, or when they skip the exercise. Once their ten are complete, it refreshes every eight seconds as others submit. Real submissions replace simulated examples for those documents. Simulated annotations never appear on a student's assigned ten letters. This small server is intended for a trusted classroom network; an internet-facing deployment needs authentication and HTTPS.

## Rebuild the curated corpus

```bash
python -m pip install requests beautifulsoup4
python scripts/build_classroom.py
python scripts/build_samples.py
```

The curation script selects 300 different 1777–1784 printed letters, each matched to one person-to-person Founders Online record by date, printed heading, correspondent names, and signature. It rejects ambiguous matches and balances the ten-letter assignments by word count. The sample script validates that every quoted excerpt occurs in its cited letter. See [data/README.md](data/README.md) for provenance and limitations.

## Optional computational notebook

The existing [Jupyter notebook](lab.ipynb) remains a separate, longer exercise on the 20,747-record metadata corpus. Its name reconciliation, duplicate, and community calculations do not feed the 300-letter classroom graph. Install [requirements.txt](requirements.txt) and open the notebook with JupyterLab if you want that route.

Metadata: [Founders Online](https://founders.archives.gov), National Archives and University of Virginia Press. Printed letter texts: [Project Gutenberg's Sparks edition](https://www.gutenberg.org/ebooks/search/?query=Diplomatic+Correspondence+American+Revolution+Sparks). Lab design and code: Conrad Compagna.
