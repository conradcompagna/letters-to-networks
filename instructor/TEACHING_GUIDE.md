# Teaching guide: From Letters to Networks

## Place in the course

This lab belongs in the network-analysis unit of a digital-history methods course, after a lecture that introduces nodes, edges, degree and paths. It assumes no programming: students run cells and change marked arguments. The lab uses network analysis to teach source criticism, so it also works as the first practical session of the unit, before students build a network of their own.

The case (American diplomacy in Europe, 1777–1784) needs no specialist background. A five-minute orientation is enough: the commission to France (Franklin, Deane, Lee; Adams replaces Deane in 1778), Franklin as sole minister from 1779, Adams in the Netherlands, Jay in Spain, the peace negotiations of 1782–1783, and Jefferson's arrival in Paris in 1784.

## Preparation

- **Install once** (instructor or lab technician): Python 3.10+ and `pip install -r requirements.txt`. Or upload the repository to a JupyterHub or Google Colab; the notebook needs only the files in this repository.
- **Check the run time** on the classroom machines: *Run All* takes about 1–2 minutes on a recent laptop. Most of it is Stage 9 (40 network rebuilds). If machines are slow, tell students to skip Stage 9 or set `reps=5`.
- **Open the explorer** (`explorer/index.html`) on the projector. It starts with seven unconnected people beside ten source records and reveals the four network views after students build; it needs no installation.
- **Read** `data/README.md` and the answer key.
- **Optional pre-reading** (15 minutes): a short introduction to historical network analysis, e.g. the *Programming Historian* lesson "Exploring and Analyzing Network Data with Python" (Ladd, Otis, Warren and Weingart, 2017), sections on centrality.

## Browser workshop (90 minutes)

Use `explorer/index.html` as the student workspace. Students first see an empty graph with seven people. They use ten actual records to draw ties, compare their result with the production transformation of those same records, and then use the full network and supplied algorithms to make a historical interpretation. The single learning goal is to build and analyze a network.

| Time | Student action |
|---|---|
| 0–10 | Use the unconnected graph to define a person node and a correspondence tie; open the first source and draw one tie together. |
| 10–40 | Students read the ten linked documents and connect people directly on the graph, or mark a record "No tie." Ask why the journal and duplicate printing need different decisions. |
| 40–50 | Count one person's distinct neighbours and the documents behind those ties by hand on the student graph. |
| 50–65 | Compare the student graph with the production build on the same records; identify differences and state the tie rule that produced them. Then examine the full four-edition network. |
| 65–85 | In the Four editions view, choose two people and use degree, betweenness, community, and linked documents to test a historical interpretation. |
| 85–90 | Discuss one claim that the graph supports and one that still needs source reading; download the lab file and finish the interpretation after class. |

An internet connection is needed for the Founders Online transcriptions; the records, graph builder, and full-network visualization run offline. The production comparison is a reference transformation, not an answer key: different tie rules can be defensible if students explain them. The interface checks that every record has a decision before comparison; assess the quality of decisions and historical claims yourself. Use the notebook schedule below when the goal is to run and modify the full analysis.

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
