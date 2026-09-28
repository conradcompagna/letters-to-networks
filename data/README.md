# Data

## Source

**Founders Online metadata.** The National Archives (NHPRC) and the University of Virginia Press publish a bulk metadata file for every document on [Founders Online](https://founders.archives.gov):
<https://founders.archives.gov/Metadata/founders-online-metadata.json>. Each entry has `title`, `permalink`, `project`, `authors`, `recipients`, `date-from` and `date-to`. The copy used here was downloaded on 24 September 2026; the server listed the file as last modified on 26 September 2025. The file had 184,138 entries.

The metadata directory's own README (`raw/founders-00README.html`, kept here) describes the file but states no licence. This repository therefore ships only the derived subset described below, which is limited to bibliographic facts (who wrote to whom, when, and the editors' document titles) and permalinks back to Founders Online. `scripts/build_records.py` downloads the full file if `raw/founders-online-metadata.json` is missing; the raw file itself is excluded from the repository by `.gitignore`.

The modern transcriptions and annotations on Founders Online belong to the editorial projects; this repository contains none of that text. The classroom's 300 complete printed letters instead come from Jared Sparks's 1830 edition, *The Diplomatic Correspondence of the American Revolution*, volumes [I](https://www.gutenberg.org/ebooks/27371), [III](https://www.gutenberg.org/ebooks/42355), [IV](https://www.gutenberg.org/ebooks/41640), [V](https://www.gutenberg.org/ebooks/41833), [VI](https://www.gutenberg.org/ebooks/39344), [VII](https://www.gutenberg.org/ebooks/37898), [VIII](https://www.gutenberg.org/ebooks/27372), [IX](https://www.gutenberg.org/ebooks/29438), and [X](https://www.gutenberg.org/ebooks/38642). Project Gutenberg marks these editions public domain in the USA; see its [license and trademark terms](https://www.gutenberg.org/policy/license.html). The browser preserves the dateline, salutation, body, sign-off, and postscript as printed, removing page markers and separating subsequent editorial narrative where a signature makes the boundary clear. Printed headings are shown as editorial context. Wording may differ from modern Founders Online transcriptions.

## Files

| File | Rows | What it is |
|---|---|---|
| `records.csv` | 20,747 | Every document in the Franklin, Adams, Jefferson and Jay Papers dated 1 January 1777 – 31 December 1784. Columns: `doc_id`, `edition`, `date` (the `date-from` field), `title`, `authors`, `recipients` (lists joined with ` \| `), `permalink`. |
| `name_authority.csv` | 34 | Decisions about name variants, made for this lab: `merge` (19), `probable` (4), `keep separate` (11), each with the reason. `variant` is replaced by `canonical` when a decision is applied. |
| `classroom_letters.json` | 300 | Complete printed letters matched to individual Founders Online catalog records; 30 nonoverlapping ten-letter assignments. The generated browser data is `explorer/classroom_data.js`. |
| `sample_annotations.json` | 12 | Hand-authored simulated class relation tags for eleven selected letters; the browser copy is `explorer/sample_data.js`. |
| `starter_letters.json` | 10 | Earlier pilot deck retained for reference; it is no longer used by the classroom browser. |
| `raw/founders-00README.html` | – | The metadata directory's description page, as downloaded. |

Records per edition: Franklin 9,841 · Adams 6,257 · Jefferson 3,800 · Jay 849.

`scripts/build_classroom.py` scans the printed letter headings and paragraphs, requires a dated one-person writer and recipient match in the catalog, rejects ambiguous same-date matches, and then selects 300 different records with preference for spring 1782. It balances assignments by word count (about 3,500 words each). The selected material spans 1777–1784; that breadth is a property of the available matched texts, not a claim of one continuous historical episode. The matching rules reduce obvious false matches but do not constitute a full scholarly collation of all 300 transcriptions. Source-volume links, catalog permalinks, and printed headings are retained for checking.

## Transformations

`records.csv` makes three changes to the source and no others. It keeps four projects. It keeps documents whose `date-from` falls in 1777–1784; undated documents are dropped. It shortens `project` to the edition name. Names, titles and dates are unchanged, including the editions' own inconsistencies, because those inconsistencies are what Stages 1, 2 and 6 of the lab examine.

Everything else is done in `netlab.py` and is controlled by the notebook:

- **Entity type** (`entity_type`): `group` if the part of the name before the first comma contains a word such as *Commissioners, Congress, Committee, Board, Council, Assembly*; `firm` if the name contains *&, Co., Cie., fils, (business)*; `unknown` for *Unknown/Anonymous*; `pseudonym` for quoted names; otherwise `person`. Names with an unknown forename (`Faesch, ——`) are persons.
- **Edges** (`to_edges`): one edge per sender–recipient pair per document. Documents without a recipient or without a sender produce none. The `group_policy` argument decides what happens when a group and its members are both listed.
- **Duplicates** (`dedupe`): documents with the same date, senders and recipients in *different* editions are treated as one letter; the copy in the first edition of the preference order (Franklin, Adams, Jefferson, Jay) is kept. Same-key documents within one edition are kept, because they are usually separate letters of the same day.

## Known limitations

- **Coverage is uneven.** A documentary edition contains the papers of, to or about its subject, so each edition is an ego network. The Jefferson Papers for 1779–1781 are dominated by Jefferson's governorship of Virginia, not by diplomacy.
- **Dates.** `date-from` is the editors' date, sometimes inferred ("[before 26 May 1777]"). A duplicate dated differently in two editions will not be matched.
- **Record ≠ letter.** 161 Franklin Papers records group several letters under one title ("Two Letters"). They count as one edge.
- **Name reconciliation is partial.** The authority file covers the variants examined for this lab, not every variant in the data. `netlab.variant_candidates()` lists more pairs for review.
- **Text encoding.** A few titles in the source contain mis-encoded characters (for example `â€”` for an em dash). They are left as they appear in the source file.
