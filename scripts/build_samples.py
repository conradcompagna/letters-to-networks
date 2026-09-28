"""Hand-authored simulated class relations for the revealed 300-letter graph."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "data" / "classroom_letters.json").read_text(encoding="utf-8"))
letters = {item["docId"]: item for item in data["letters"]}

# Each tag describes the archival writer-to-addressee tie, not another pair
# of people mentioned inside the letter. The student's own ten documents
# are filtered out by the browser before these examples are shown.
SAMPLES = [
    ("Franklin/01-26-02-0294", "conveys royal approval",
     "Vergennes tells Franklin that the king welcomed the information in Franklin's previous letter."),
    ("Franklin/01-29-02-0552", "forwards congressional papers",
     "Lovell tells Franklin that he is forwarding gazettes, journals, and pamphlets by way of Martinique."),
    ("Franklin/01-31-02-0157", "acknowledges orders",
     "Jones tells Franklin that he received instructions about prisoners held aboard the Alliance."),
    ("Franklin/01-30-02-0204", "presents a ceremonial gift",
     "Franklin tells Lafayette that Congress has prepared a sword to acknowledge his service."),
    ("Jay/01-02-02-0006", "requests diplomatic intelligence",
     "Jay asks Arthur Lee for information about his efforts to negotiate a treaty with Spain."),
    ("Adams/06-08-02-0023", "requests help for an officer",
     "Lafayette asks Adams to help an officer travel to America aboard the Alliance."),
    ("Adams/06-09-02-0182-0001", "advises further inquiry",
     "Vergennes thanks Adams for his communications and urges him to verify a claim in a shared letter."),
    ("Franklin/01-33-02-0107", "shares private correspondence",
     "Vergennes tells Franklin that he is sending correspondence he had with Adams for Franklin's judgment."),
    ("Franklin/01-30-02-0051", "sends public records",
     "Lovell sends Franklin journals, gazettes, and letters and explains their delivery routes."),
    ("Franklin/01-24-02-0032", "shares American news",
     "Franklin sends Dumas the substance of new reports that arrived from North America."),
    ("Adams/06-06-02-0252", "warns about a British offer",
     "Adams warns Samuel Adams that Britain may offer independence if America breaks its alliance with France."),
    ("Adams/06-07-02-0277-0001", "assures continued esteem",
     "Vergennes tells Adams that his loss of an official role in France has not diminished his standing."),
    ("Adams/06-08-02-0083", "reports a political dispute",
     "Adams tells Lovell that questions about Vergennes and Arthur Lee are being debated in America."),
    ("Franklin/01-31-02-0286", "requests maritime intelligence",
     "Franklin asks Dumas for news about how the seizure of Dutch ships has been resolved."),
    ("Franklin/01-32-02-0082", "thanks for evidence",
     "Franklin thanks Reed for a pamphlet that he says clarifies disputed facts."),
    ("Adams/06-09-02-0162", "reports financial policy",
     "Gerry reports to Adams that Congress's plan to withdraw paper money has been well received."),
    ("Franklin/01-33-02-0132", "explains communication delays",
     "Franklin tells Lovell when he received several of Lovell's earlier letters to illustrate delays in correspondence."),
    ("Franklin/01-34-02-0129", "introduces a consul",
     "Lovell introduces the newly appointed consul William Palfrey to Franklin and asks for his patronage."),
    ("Franklin/01-35-02-0042", "thanks for frequent letters",
     "Franklin thanks Lafayette for writing often and explains that his own duties slow his replies."),
    ("Jay/01-02-02-0210", "proposes aid for seamen",
     "Morris proposes to Jay a way to support American seamen arriving from captivity at Cadiz."),
    ("Jay/01-02-02-0280", "corrects a cipher mistake",
     "Livingston explains to Jay that his previous letter used a cipher Jay had never received."),
    ("Franklin/01-36-02-0336", "forwards consular powers",
     "Livingston sends Franklin a convention and explains that Franklin may sign it in France."),
    ("Franklin/01-36-02-0451", "reports peace advocacy",
     "Hartley tells Franklin that he has repeatedly urged a route toward peace and awaits a response."),
    ("Franklin/01-37-02-0016", "opens a political channel",
     "Franklin writes Shelburne after learning of a more favorable British disposition toward America."),
    ("Franklin/01-37-02-0127", "relays an intermediary's authority",
     "Franklin tells Laurens that Oswald brought a letter from Shelburne authorizing confidence in him."),
    ("Adams/06-13-02-0032", "reports American resolve",
     "Livingston tells Adams that a change in the British ministry has not changed American opinion."),
    ("Franklin/01-37-02-0386", "shares diplomatic intelligence",
     "Lafayette tells Franklin that Grenville's express has arrived and promises to pass on further news."),
    ("Franklin/01-38-02-0057", "supplies treaty authority",
     "Oswald sends Franklin an extract from his instructions concerning the proposed American treaty."),
    ("Adams/06-14-02-0063", "transmits a treaty",
     "Adams sends Livingston the preliminary treaty between Britain and the United States."),
    ("Adams/06-14-02-0103", "forwards enclosed letters",
     "Adams tells Dumas that he will forward the letters Dumas enclosed with his recent correspondence."),
    ("Franklin/01-39-02-0026", "rebuts an appointment rumor",
     "Jay tells Franklin that he did not back the appointment of Franklin's grandson at Franklin's request."),
    ("Franklin/01-39-02-0219", "provides a recommendation",
     "Franklin tells Hartley that he wrote the requested recommendation for Joshua Grigby."),
    ("Franklin/01-39-02-0372", "shares reform proposals",
     "Franklin sends Hartley copies of papers they discussed about improving the law of nations."),
    ("Adams/06-15-02-0059", "reports negotiation papers",
     "Adams sends Livingston copies of papers exchanged with Hartley and explains why he did not answer them in writing."),
    ("Franklin/01-36-02-0493", "acknowledges peace instructions",
     "Franklin acknowledges Livingston's message conveying Congress's position on peace terms."),
    ("Franklin/01-36-02-0505", "passes diplomatic news",
     "Hartley tells Franklin that Digges has informed him about a possible contact with Adams."),
    ("Franklin/01-37-02-0043", "forwards a colleague's letter",
     "Franklin tells Livingston that he is sending on a letter he has just received from Adams."),
    ("Jay/01-03-02-0008", "reports a consultation",
     "Jay reports to Livingston that he and Franklin have advised Lafayette to remain in Paris."),
    ("Franklin/01-37-02-0048", "tests peace negotiations",
     "Franklin tells Hartley that their discussion must remain private while peace terms are explored."),
    ("Franklin/01-37-02-0068", "sends an intermediary",
     "Shelburne tells Franklin that he has sent Oswald as a trusted channel for discussion."),
    ("Franklin/01-37-02-0182", "reports an envoy's return",
     "Franklin tells Vergennes that Oswald has returned from London and is with him."),
    ("Franklin/01-37-02-0182", "shares British proposals",
     "Franklin sends Vergennes Shelburne's letter and reports a British decision to discuss peace in Paris."),
    ("Franklin/01-37-02-0205", "welcomes a peace envoy",
     "Franklin tells Fox that he has introduced Grenville to Vergennes and hopes the visit advances peace."),
    ("Franklin/01-37-02-0074", "vouches for an intermediary",
     "Laurens assures Franklin that Oswald is candid and safe to speak with about peace."),
    ("Franklin/01-37-02-0329", "requests an expense account",
     "Livingston asks Franklin what allowance he makes for his private secretary."),
    ("Adams/06-13-02-0001", "approves a recommendation",
     "Adams gives Dumas permission to transmit his opinion about a diplomatic appointment to Congress."),
]

out = []
for doc_id, tag, note in SAMPLES:
    letter = letters[doc_id]
    assert 2 <= len(tag) <= 60 and 12 <= len(note) <= 300
    out.append({"docId": doc_id, "source": letter["writer"], "target": letter["addressee"],
                "type": tag, "note": note, "student": "simulated"})

(ROOT / "data" / "sample_annotations.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(ROOT / "explorer" / "sample_data.js").write_text("window.SAMPLE_ANNOTATIONS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"Prepared {len(out)} simulated relations from {len({item['docId'] for item in out})} letters.")
