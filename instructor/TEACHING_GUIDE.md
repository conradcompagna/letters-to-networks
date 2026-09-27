# Teaching guide: From Letters to Networks

## Place in the course

This lab belongs in the network-analysis unit of a digital-history methods course, after a lecture that introduces nodes, edges, degree and paths. It assumes no programming: students run cells and change marked arguments. The lab uses network analysis to teach source criticism, so it also works as the first practical session of the unit, before students build a network of their own.

The case (American diplomacy in Europe, 1777–1784) needs no specialist background. A five-minute orientation is enough: the commission to France (Franklin, Deane, Lee; Adams replaces Deane in 1778), Franklin as sole minister from 1779, Adams in the Netherlands, Jay in Spain, the peace negotiations of 1782–1783, and Jefferson's arrival in Paris in 1784.

## Preparation

- **Install once** (instructor or lab technician): Python 3.10+ and `pip install -r requirements.txt`. Or upload the repository to a JupyterHub or Google Colab; the notebook needs only the files in this repository.
- **Check the run time** on the classroom machines: *Run All* takes about 1–2 minutes on a recent laptop. Most of it is Stage 9 (40 network rebuilds). If machines are slow, tell students to skip Stage 9 or set `reps=5`.
- **Open the explorer** (`explorer/index.html`) on the projector. It starts with an empty graph and ten complete letters, then reveals the full network after students code them; it needs no installation.
- **Read** `data/README.md` and the answer key.
- **Optional pre-reading** (15 minutes): a short introduction to historical network analysis, e.g. the *Programming Historian* lesson "Exploring and Analyzing Network Data with Python" (Ladd, Otis, Warren and Weingart, 2017), sections on centrality.

## Browser workshop (90 minutes)

Use `explorer/index.html` as the student workspace. Students read ten complete letters, extract each writer and addressee, and build directed edges from their decisions. They compare their graph with the archive catalog's author–recipient fields for those same letters, then use the full network to interpret degree, betweenness, and communities. The single learning goal is to build and analyze a network.

| Time | Student action |
|---|---|
| 0–10 | Read the first full letter together. Identify its signature, addressee evidence, and the writer → addressee edge. |
| 10–45 | Students read the other nine letters, record evidence for each identification, and watch nodes and directed ties appear. They can consult the separately marked printed heading when an addressee is not clear in the letter body. |
| 45–55 | Count one person's distinct neighbours and distinguish that from the number of letters on those ties. |
| 55–65 | Compare the student graph with the catalog coding of the same ten letters; discuss any different identities or directions. |
| 65–85 | Reveal the full four-edition graph. Compare degree with betweenness, inspect community placement, and open linked documents for two people. |
| 85–90 | Begin the 500-word response in class; download the assignment file and finish it for submission through the course site. |

The ten letters and network views run offline; source links need internet. The 1830 edition's printed headings and modern catalog titles are editorial aids, and the wording may differ between editions. The interface requires a writer, addressee, and evidence note for each letter before reveal, but does not grade their historical reasoning. Use the notebook schedule below when the goal is to run and modify the full analysis.

## Notebook schedule (90 minutes)

| Time | Activity |
|---|---|
| 0–8 | Orientation: the question, the four editions, what a documentary edition is. Show one document on Founders Online and its metadata row. |
| 8–18 | Stage 1 in pairs. Collect examples of documents that are not letters. |
| 18–33 | Stage 2. Pairs each take two rows of `cands` and report a decision with evidence. Tally false friends on the board. |
| 33–43 | Stage 3. Short whole-class vote on the group policy; the minority explains its choice. |
| 43–53 | Stages 4–5. Project the explorer: switch from *Franklin Papers* to *without Franklin*. |
| 53–68 | Stage 6. Each pair opens one duplicate pair and the Bondfield example. |
| 68–83 | Stage 7. Whole-class discussion (questions below). |
| 83–90 | Stage 10: students write the memo's first sentence (the claim) and name their two decisions; they finish at home. |

Stages 8 and 9 are optional extensions or a second session.

**Shorter version (60 minutes):** Stages 1, 3, 4, 5 and 7, with the authority file and group policy set by the instructor.
**Longer version (two sessions):** add Stages 8–9 and have students extend `name_authority.csv` with five decisions of their own, then re-run Stages 6–7 and report what changed.

## Concepts to explain before students begin

- **Documentary edition.** A scholarly publication of the papers of one person or family. It includes letters *to* the subject and some third-party papers found in the subject's files, so it is an ego network by construction.
- **Degree, weighted degree, betweenness.** Draw a star and a chain on the board. Show that the centre of a star has maximal betweenness whatever else is true of it.
- **Community detection.** An algorithm that maximises a density score. It always returns communities, even in random data. Communities are hypotheses.
- **Normalised mutual information.** How much knowing one grouping tells you about another (0 = nothing, 1 = everything).

## Likely difficulties

- **Treating the edition as the world.** Students will read Franklin's centrality as a finding about Franklin. Stage 4, Question 4 is designed to surface this; do not resolve it for them before they write their answer.
- **Treating the authority file as settled.** Point out that `probable` decisions are left out by default, and ask what would justify including them.
- **Reading betweenness as influence.** Stage 7 lists *Penet, D'Acosta frères & Cie.* with two documents and a high betweenness score. Ask why a firm with two letters can be a 'broker'.
- **Scope.** The Jefferson Papers for 1779–1781 are about Jefferson's governorship of Virginia (the Board of Trade, the Board of War, George Muter, William Davies). Students often notice this only in Stage 8. It is a good moment to ask whether the data answer the research question as posed.
- **Technical.** A student who changes an argument and runs a later cell without re-running the cells in between gets confusing results. *Kernel → Restart and Run All* fixes it.

## Discussion questions (Stage 7)

1. The Louvain communities match the editions with NMI 0.77. What is a community in this network actually evidence of?
2. After the editors are removed, NMI is still 0.41. Which ties survive, and why do they still follow the editions?
3. Arthur Lee has the highest betweenness once the editors are removed. Most of his documents come from the Franklin Papers. Is Lee a broker of American diplomacy, or of the commission's paperwork?
4. Which *historical* relationships in 1777–1784 are invisible here because none of the four editions collected them? (Correspondence among French ministers, British peace negotiators among themselves, Spanish officials, merchants' own papers.)
5. If you were designing the data collection for this question from scratch, what would you add first?

## Extensions

- **Tolerant matching.** Write a duplicate rule that allows dates to differ by up to three days, and count how many more duplicates it finds. Then inspect ten of them.
- **Member expansion.** Replace every *American Commissioners* recipient with the commissioners in office on that date, and re-run Stages 6–7.
- **Another corridor.** Change `PROJECTS` and the dates in `scripts/build_records.py` (for example, Jefferson and Madison, 1784–1789) and repeat the lab.
- **Full text.** Each permalink leads to a transcription. Students can code the people *mentioned* in 20 letters and compare a mention network with the correspondence network.

## What successful completion looks like

A successful student can say, with numbers from their notebook: the edition makes Franklin central by construction; the authority file and the group policy change what counts as the same person and the same letter; communities largely reproduce the editions; and a ranking by document counts is more stable than one by betweenness. Their memo makes a modest claim about a historical intermediary (for example William Temple Franklin, Arthur Lee or the commission itself), supports it with at least two documents they have read, and states clearly what the four editions cannot show.

## Assessment

| Criterion | Weight | Strong work |
|---|---|---|
| Data decisions (Q1–Q3, Q6) | 30% | Each decision is tied to the research question and to specific documents |
| Interpretation of measures (Q4, Q5, Q7) | 30% | Distinguishes what a measure computes from what it is taken to mean; separates archival from historical explanations |
| Use of sources | 20% | Opens and cites documents; notices when a record is not a letter |
| Memo | 20% | One clear claim, two decisions and their effects, two cited documents, one stated limit |
