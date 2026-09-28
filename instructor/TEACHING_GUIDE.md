# Teaching guide · Letters to Networks

## One learning goal

Students learn to **build and analyze a network from close reading**. Each letter's writer and addressee are fixed by the archive. Students create their own relation tags between that pair, with one sentence explaining the textual evidence. The revealed network places those relations over the original four-edition correspondence graph.

## Preparation for 30 students

Run `python classroom_server.py --host 0.0.0.0 --port 8767` on a computer reachable by the class and share the classroom URL. Each visitor automatically receives an unused assignment, and their browser remembers it. The terminal prints recovery codes if a student changes devices; a link ending `#code=CODE` restores that assignment. Assignments are fixed: each code owns ten distinct complete letters, approximately 3,500 words in total.

The `.classroom_private` folder contains codes and annotations. Keep it on the instructor's machine; do not commit it. The server has no course-management login. Use it on a trusted class network or add authentication and HTTPS before public hosting.

The public GitHub Pages page demonstrates the interface and includes twelve **simulated class** annotations from eleven letters. It saves one visitor's work in their browser and cannot aggregate a class. The simulated annotations are excluded from that visitor's ten letters.

## Suggested session

| Time | Student work |
|---|---|
| 0–10 min | Read one full letter together. Distinguish the fixed writer-to-addressee tie from the kinds of relationship its text suggests. |
| 10–55 min | Each student reads ten assigned letters, creates their own relation tags, and writes a one-sentence explanation for each. They add multiple relations when a letter supports them and move between letters using the side panel. |
| 55–70 min | Once all ten are annotated, students see the original archive graph with their own and available class relations overlaid. They select correspondents and ties to inspect linked sources. |
| 70–90 min | Toggle archive and class relation layers, compare neighbor count, weighted strength, and betweenness on the visible network, and discuss how the interpretation changes. |

At a realistic reading pace, some students may need to finish the last letters as homework. The server keeps each saved letter in the project folder. The skip button lets instructors demonstrate the graph without completing an assignment.

## What to assess

- Does the student's tag describe a defensible relation between the archival writer and addressee?
- Does the one-sentence explanation identify evidence in the letter, rather than merely restating the tag?
- Does the student distinguish **strength** (visible document edge weights plus relation counts) from **neighbors** (distinct people)?

There is no predetermined “correct” relationship network. Two students could reasonably classify the same passage differently. The simulated annotations are examples of documented inferences, not an answer key; they are never inserted into student submissions or shown on the current student's ten letters.

## Method notes

The ten-letter assignments draw from a curated 300-letter corpus with 43 fixed people and 81 directed writer-to-addressee ties. The revealed graph instead uses the original four-edition archive network from 20,747 records; its drawing shows 397 archive correspondents above the original display threshold plus eight more from the class letters. The 1830 Sparks text can differ from the modern Founders Online transcription. Editorial headings and catalog titles establish provenance but are not letter prose.

The graph reports distinct neighbors, weighted strength, and unweighted betweenness on the **displayed** people and ties. Strength adds archival document edge weights and class relation counts; betweenness measures shortest routes and ignores weights. The archive's summary count of 21,709 document edges refers to the whole four-edition network, including people below the drawing threshold.

The [notebook](../lab.ipynb) is an optional separate route through the 20,747-record metadata corpus; its computational figures should not be substituted for the classroom graph.
