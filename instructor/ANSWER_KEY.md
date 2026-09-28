# Answer key: From Letters to Networks

Figures below are the outputs of the executed notebook with its default arguments. They are deterministic: rerunning the notebook reproduces them, except Stage 9, which depends on its random seed. Interpretive answers are examples of strong responses, not the only acceptable ones.

## Classroom lab checks

The curated lab uses **300 distinct, complete printed letters**, assigned ten per individual to a 30-person class. Their archival writer/addressee fields yield **43 fixed people and 81 directed correspondence ties**. The 46 simulated interpretations come from 45 letters across all 30 assignment groups. None appear on the current student's ten letters, and they are labeled as simulated in the graph.

A relationship annotation describes the letter's fixed writer-to-addressee tie, uses a tag the student created, and gives one sentence explaining what in the text supports that relation. A letter may warrant several tags. The app asks for at least one on each assigned letter before it reveals the graph, and the skip button permits an early demonstration.

No specific historical network pattern is prescribed, because the submitted edges depend on students' close readings. Do not treat an annotation count as a count of historical events: several students may describe the same relation, and a single letter may support multiple inferences.

---

## Stage 1 · Documents become records

**Expected output.** 20,747 documents (Franklin 9,841; Adams 6,257; Jefferson 3,800; Jay 849).

| record kind | Adams | Franklin | Jay | Jefferson | all |
|---|---|---|---|---|---|
| no recipient | 1,423 | 306 | 53 | 392 | 2,174 |
| one record = several letters | 0 | 161 | 0 | 0 | 161 |
| one sender, one recipient | 3,856 | 7,989 | 770 | 3,244 | 15,859 |
| several senders or recipients | 978 | 1,385 | 26 | 164 | 2,553 |

**Q1, strong answer.** "No recipient" covers diaries (the Adams Papers print John Adams's and John Quincy Adams's diaries entry by entry, which is why the Adams column is large), accounts, bills in the Jefferson Papers ("A Bill for Apprehending Deserters"), memoranda and passports ("Benjamin Franklin to All Captains of Armed Vessels"). They record activity but not correspondence and should be excluded from a correspondence network, although a passport addressed to "all captains" is arguably a communication to a class of recipients. "Several senders or recipients" is mostly the commission: letters to "the American Commissioners" listed with Franklin, Lee and Adams. These belong in the network, but the student must decide how (Stage 3). Strong answers also notice that "Two Letters" records exist only in the Franklin Papers: the difference is an editorial convention, not a difference in the past.

## Stage 2 · Names become entities

**Expected output.** 3,106 person names, 153 firms, 122 groups, 9 pseudonyms, 2 unknown. The largest groups: *American Commissioners* (1,151 mentions), *First Joint Commission at Paris* (417), *President of Congress* (302), *Committee of the Virginia Assembly* (128), *American Peace Commissioners* (112).

`variant_candidates` returns 40 pairs. The authority file holds 19 merges, 4 probables and 11 explicit keep-separate decisions.

**Q2.** Any well-evidenced decision is acceptable. Examples:

- *Morris, Lewis* (Jay Papers, 4) / *Morris, Lewis R.* (other editions, 7). The Jay Papers letters of 1777 are between Jay and a New York political colleague. Lewis Morris the signer and his nephew Lewis R. Morris were both active New York politicians, so the student must read the letters. The right decision is **keep separate unless the documents identify the man**.
- *Vernon, William, Sr.* / *Vernon, William, Jr.*: father and son; keep separate.
- *La Luzerne, Anne-César, chevalier de* / *La Luzerne, César Henri, Comte de*: brothers (the French minister to the United States and the naval officer later minister of marine); keep separate.
- *Neufville, Jean (John) de* / *Neufville, Leendert (Leonard) de*: father and son in the Amsterdam firm; keep separate, and note the separate question of whether the firm *Jean de Neufville & fils* is a third node.

On costs: a **false merge** creates a correspondent who never existed, inflates their degree and can create bridges between unrelated parts of the network (John Adams and John Quincy Adams merged would join the diplomatic network to the family correspondence even more tightly). A **missed merge** splits a correspondent, lowers their measures, and prevents duplicate letters from being recognised (Stage 6).

## Stage 3 · Records become edges

| policy | edges | nodes | ties |
|---|---|---|---|
| individuals | 12,448 | 2,329 | 2,926 |
| collective | 9,873 | 2,332 | 2,572 |
| both | 13,690 | 2,332 | 3,154 |

**Q3.** For a question about *who* connected the diplomatic effort, `individuals` fits: it credits each commissioner with the commission's correspondence, which matches how contemporaries addressed them and how the commissioners divided the work. Its weakness is that it assumes every listed commissioner took part in every letter, when Lee and Deane often did not. `collective` fits a question about *institutions*, for example how the commission as a body related to French ministries. `both` double-counts. A strong answer notes that the editions sometimes list members and sometimes do not (see Stage 6), so no policy produces fully consistent data.

## Stage 4 · One edition, one network

Franklin: 9,729 documents, betweenness 0.991. The next highest betweenness scores are William Temple Franklin 0.009, Arthur Lee 0.003, John Adams 0.003, *American Commissioners* 0.003.

**Q4, strong answer.** The Franklin Papers collect documents to and from Franklin, so almost every other correspondent is linked to the network only through him. The shortest path between any two of them therefore runs through Franklin by construction. His betweenness measures the design of the edition, and would be about the same whether he was the centre of American diplomacy or a marginal figure who kept good files.

## Stage 5 · Remove the editor

| | with Franklin | without Franklin |
|---|---|---|
| nodes | 2,329 | 296 |
| ties | 2,926 | 621 |
| document edges | 12,448 | 2,719 |
| components | 2 | 3 |

1,279 of 9,530 documents with edges do not involve Franklin directly.

**Q5, strong answer.** Removing Franklin removes 87% of the correspondents. What remains is held together by Arthur Lee, John Adams, Silas Deane, William Temple Franklin and the commission. The surviving documents are mostly the commission's letters, where Franklin's colleagues are co-recipients, plus letters to William Temple Franklin as his grandfather's secretary. This is not "Franklin's circle"; it is the paper trail of the American legation in Paris, filed in Franklin's papers. The picture is of an office, and its shape depends on the edition's rule of including the commission's correspondence.

## Stage 6 · Merge four editions

| authority | distinct names | documents | after dedupe | duplicate letters |
|---|---|---|---|---|
| none | 3,318 | 18,511 | 18,126 | 354 |
| merges | 3,299 | 18,511 | 18,063 | 392 |
| merges + probable | 3,295 | 18,511 | 18,058 | 397 |

Duplicates by edition: Adams + Franklin 236; Franklin + Jay 51; Adams + Adams + Franklin 43; Adams + Jay 30; Franklin + Jefferson 14; others fewer than 10.

**Why the authority file matters.** Duplicates are matched on names, so reconciling names (for example the two spellings of Dumas) lets 38 more duplicate letters be found.

**Q6, strong answer.** The cross-edition pairs checked (for example Jefferson to Adams, 16 May 1777, in the Adams and Jefferson Papers) are genuine duplicates. The same-edition pairs are genuinely separate letters: John Adams wrote to James Warren twice on 3 February 1777, and the Franklin Papers print two commissioners' letters to Vergennes dated 5 January 1777.

Errors the rule makes:

- **Different encodings of the same recipient.** The Bondfield letter of 10 April 1778 is addressed to *First Joint Commission at Paris* in the Adams Papers and to *American Commissioners; Franklin; Lee; Adams* in the Franklin Papers. Merging the two group names does not fix this, because the Franklin Papers also list the members. Of the 320 Adams Papers documents addressed to the First Joint Commission, 193 have a Franklin Papers document of the same date from the same sender; of 97 sent by the commission, 59 have a match. Roughly 250 probable duplicates are missed, a number comparable to the 392 that are found.
- **Different dates.** An inferred date ("[before 26 May 1777]") may differ between editions.
- **Different titles for enclosures and drafts.** A draft in one edition and the recipient's copy in another may carry different dates.

Effect: missed duplicates **inflate** the ties among Franklin, Adams and Lee, because each missed letter is counted twice. They make the commission look busier and more connected than it was.

## Stage 7 · Communities: people or archives?

Merged network: 3,299 correspondents, 4,395 ties, 21,709 document edges. NMI between Louvain communities and main edition: **0.772**. The five largest communities are almost pure: community 0 is 2,036 Franklin correspondents; community 1 is 551 Jefferson correspondents; community 2 is 382 Adams correspondents; community 3 mixes 85 Jay correspondents with Franklin and Jefferson ones.

Without the four editors: 561 correspondents, 28 components, NMI **0.409**.

Highest betweenness without the editors: Arthur Lee 0.603; Abigail Adams 0.180; William Temple Franklin 0.135; Henry Laurens 0.090; Penet, D'Acosta frères & Cie. 0.083 (2 documents); Virginia Board of Trade 0.083; George Muter 0.069; Virginia Executive Council 0.067; American Commissioners 0.063; Silas Deane 0.062.

**Q7(a), strong answer.** With the editors present, the communities are the editions. Even without them, knowing which edition supplies a correspondent's documents tells you much of their community (NMI 0.41). The communities reflect the collecting policies of four editorial projects before they reflect any historical grouping. They can be used only after that explanation has been ruled out for a specific community, by reading its documents.

**Q7(b), examples.**

- **Arthur Lee** (1,277 of his documents come from the Franklin Papers, 82 from the Adams Papers): partly historical, since Lee was a commissioner who corresponded widely, and partly archival, since most of his ties are co-addressed commission letters.
- **Abigail Adams**: archival. Her high betweenness comes from the Adams Papers' family correspondence series, which links the diplomatic network to the family's Massachusetts network through one household.
- **William Temple Franklin**: historical *and* archival. As secretary to his grandfather and to the peace commission he did route correspondence. His letters are also filed in the Franklin Papers.
- **Penet, D'Acosta frères & Cie.**: an artefact. Two documents give it high betweenness because it links a tiny cluster to the rest; betweenness is sensitive to such bridges.
- **Board of Trade, George Muter, Virginia Executive Council**: a scope problem, not diplomacy. They come from Jefferson's governorship of Virginia (1779–1781).

## Stage 8 · (optional) The network over time

Top broker per year, editors removed: 1777–1779 Arthur Lee; 1780 Abigail Adams; 1781 William Davies; 1782 William Temple Franklin; 1783 *American Peace Commissioners*; 1784 *American Commissioners*.

**Q8, examples.** 1782–1783: William Temple Franklin, Robert R. Livingston (Secretary for Foreign Affairs), Henry Laurens and the peace commission match the peace negotiations; Abigail Adams is there for archival reasons. 1780–1781: Muter, Davies and the Virginia boards reflect Jefferson's governorship, not diplomacy in Europe. 1784: *American Commissioners* is a **different body** from the group of the same name in 1777–1778: the 1784 commission of Adams, Franklin and Jefferson for treaties of commerce. One node name covers two institutions, which a strong student will flag as a further entity problem.

## Stage 9 · (optional) How fragile are the rankings?

With 20% of documents dropped at random (20 replicates, seed 1):

| measure | mean overlap of top 20 | minimum | mean Spearman | minimum |
|---|---|---|---|---|
| betweenness | 0.80 | 0.65 | 0.68 | 0.30 |
| documents | 0.99 | 0.95 | 0.98 | 0.96 |

**Answer.** Counts degrade gracefully: losing a fifth of a correspondent's letters lowers their count proportionally. Betweenness depends on a few bridging ties; losing one letter can disconnect a bridge and move a correspondent far down the ranking. Claims about "brokers" from betweenness therefore need a robustness check and, above all, the documents behind the bridging ties.

## Stage 10 · Memo: what a strong memo does

> Once the editions' subjects are removed, the tie most consistently present across the four editions is the commission's office in Paris: its correspondence joins Arthur Lee, William Temple Franklin and the commission's agents (Jonathan Williams Jr. at Nantes, Dumas at The Hague) to French ministers. […] Two decisions drive this: treating co-addressed commission letters as ties to each commissioner (`individuals`), and removing duplicates, which misses about 250 commission letters because the Adams and Franklin Papers name the commission differently. […] [Two documents the student has read, cited by permalink, showing what one of these ties consisted of: for example a letter from an agent to the commissioners and the commissioners' reply.] […] The network cannot show correspondence that none of the four editors kept, such as the French ministers' own exchanges or British negotiators' letters to each other.

The memo should make a limited claim, show how that claim depends on specific data decisions, and support it with documents.

## Common misconceptions

- "The biggest node is the most important person." Here it is the person whose papers were edited.
- "Communities are social groups." Here they are mostly editions.
- "Merging names is cleaning." It is interpretation; every merge is a historical claim.
- "Removing duplicates is a technical step." Which letters count as duplicates depends on how each edition encodes names and groups.
- "Betweenness identifies brokers." It identifies nodes on shortest paths, which in sparse archival networks are often artefacts of collection.
