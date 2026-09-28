# Teaching guide · Letters to Networks

## One learning goal

Students learn to **build and analyze a network from close reading**. The archival catalog supplies a fixed list of people and a writer-to-addressee correspondence layer; students supply a second layer of evidence-backed, typed relationships. The comparison makes visible how a graph changes when an edge means more than “sent a letter.”

## Preparation for 30 students

Run `python classroom_server.py --host 0.0.0.0 --port 8767` on a computer reachable by the class. The terminal prints 30 numbered access codes. Distribute one code to each individual and share the classroom URL. Check that every student can open it before the lab begins. Assignments are fixed: each code owns ten distinct complete letters, approximately 3,500 words in total. There is no need to split the letters manually.

The `.classroom_private` folder contains codes, reading notes, annotations, and final responses. Keep it on the instructor's machine; do not commit it. The server has no course-management login. Use it on a trusted class network or add authentication and HTTPS before public hosting.

The public GitHub Pages page demonstrates the interface and includes twelve **instructor sample** annotations from eleven letters. Its individual preview saves in the browser and cannot aggregate a class.

## Suggested session

| Time | Student work |
|---|---|
| 0–10 min | Read one full letter together. Distinguish the catalog's correspondence tie from a relationship inferred from its words. Discuss direction, type, and a quote that would justify it. |
| 10–55 min | Each student reads ten assigned letters and records any supported ties among the fixed people. Each tie has a type, exact excerpt, and explanation. They write a brief reading note even when they find no additional tie. |
| 55–70 min | After saving all ten, students reveal the 300-letter baseline with accumulating class annotations. They inspect a tie's passages and compare the two layers. |
| 70–90 min | Filter a relationship type and discuss who gains or loses neighbors or strength, why repeated assertions increase strength, and which apparent bridge depends on a small number of letters. Begin the 500-word analysis, completed after class. |

At a realistic reading pace, some students may need the last letters or the written response as homework. The server keeps each saved letter and response in the project folder.

## What to assess

- Are the source and target people genuinely identifiable in the cited passage? A name merely mentioned does not automatically imply a relationship.
- Is the direction and category defensible? “Reports to,” “requests from,” and “delegates to” describe different actions, even when two people appear in the same text.
- Does the student mark uncertainty or ambiguity in the reading note instead of inventing a tie?
- In the final response, is a claimed pattern supported by at least three actual letters and a comparison of archival correspondence with interpreted relationships?
- Does the student distinguish **strength** (counts of visible letters and annotations) from **neighbors** (distinct people), and explain the effect of filtering on betweenness?

There is no predetermined “correct” relationship network. Two students could reasonably classify the same passage differently. The sample annotations are examples of documented inferences, not an answer key; they are never inserted into student submissions.

## Method notes

The 300-letter baseline has 43 fixed person nodes and 81 directed writer-to-addressee ties. It is a curated subset from the longer 1777–1784 catalog, not the entire archive. The 1830 Sparks text can differ from the modern Founders Online transcription. All quoted evidence is taken from the printed letter text shown to students; editorial headings and catalog titles should be used for provenance, not treated as letter prose.

The graph reports visible distinct neighbors, weighted strength, and unweighted betweenness. Strength adds the count of letters or annotations on each visible tie, while betweenness measures shortest person-to-person paths and ignores tie weights. When both layers are shown, strength includes both kinds of counts, so students should toggle layers before interpreting the numbers. Relationship filters affect the interpreted layer only.

The [notebook](../lab.ipynb) is an optional separate route through the 20,747-record metadata corpus; its computational figures should not be substituted for the classroom graph.
