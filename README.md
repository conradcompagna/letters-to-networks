# Letters to Networks

A digital humanities methods lab in which a class builds an evidence-backed relationship network from historical letters.

[Open the public sample and individual assignment preview](https://conradcompagna.github.io/letters-to-networks/explorer/)

## Classroom activity

Thirty students each receive **ten different complete letters**: 300 letters in all. The letters are transcribed from Jared Sparks's public-domain *Diplomatic Correspondence of the American Revolution* and matched to the author and recipient fields of the corresponding Founders Online catalog records. The resulting classroom corpus has 43 fixed person nodes and 81 directed correspondence ties. No student has to identify all 43 people or read all 300 letters.

1. Open an individual assignment with an access code and read its ten complete letters.
2. For each letter, choose any relationships it supports between the fixed people. Classify each tie, select an exact passage, and explain the inference. A letter can support multiple ties or no additional tie; every letter also needs a short reading note.
3. Save all ten letters. The app reveals the graph of **only those 300 letters**, overlaid with the class's submitted relationship annotations.
4. Switch correspondence and interpreted relationship layers on or off, filter relationship types, inspect the passages behind ties, and compare neighbor counts, strength, and betweenness as the shared graph grows.
5. Submit a roughly 500-word interpretation of a pattern supported by at least three letters.

The [public browser page](https://conradcompagna.github.io/letters-to-networks/explorer/) works as a preview: individual work stays in that browser, and **View annotated sample** displays twelve example interpretations from eleven letters. It does not collect class submissions. Run the classroom server below to share annotations and collect responses in the project's `.classroom_private/submissions/` folder.

## Run the shared class

Requires Python 3.10+ and no extra packages for normal classroom use.

```bash
python classroom_server.py --host 0.0.0.0 --port 8767
```

The server prints 30 individual access codes. Give each student only their numbered code, then direct them to `http://YOUR-COMPUTER-IP:8767/explorer/` on the same network. The default host is `127.0.0.1` for use on one computer; `--host 0.0.0.0` makes it reachable from classroom devices. Keep the server running during the session. It creates a private roster and per-student JSON submissions on first use. That folder is excluded from Git.

A student's correspondence graph appears after all ten readings are saved. The class graph refreshes every eight seconds as others submit. In a 30-person class, all 300 readings can be saved once; students may revise their own work. The saved response belongs to the same student record. This small server is intended for a trusted classroom network; an internet-facing deployment needs authentication and HTTPS.

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
