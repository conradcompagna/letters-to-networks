"""Hand-authored example interpretations, checked against the 300 letter texts."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "data" / "classroom_letters.json").read_text(encoding="utf-8"))
letters = {item["docId"]: item for item in data["letters"]}
people = {item[key] for item in data["letters"] for key in ("writer", "addressee")}


def person(surname):
    matches = [name for name in people if name.split(",", 1)[0] == surname]
    if surname == "Lafayette":
        matches = [name for name in matches if "marquis de" in name]
    if surname == "Laurens":
        matches = [name for name in matches if name.endswith(", Henry")]
    if surname == "Adams":
        matches = [name for name in matches if name.endswith(", John")]
    assert len(matches) == 1, (surname, matches)
    return matches[0]


# Source, target, and relationship are interpretations. The quote is copied
# from the cited letter; students can disagree with these examples.
SAMPLES = [
    ("Franklin/01-36-02-0493", "Franklin", "Livingston", "reports",
     "Your communications of the sentiments of Congress", "Franklin acknowledges Livingston's transmission of Congress's peace terms."),
    ("Franklin/01-36-02-0505", "Hartley", "Franklin", "reports",
     "Mr Digges, who will deliver this to you, informs me", "Hartley relays news about an attempted contact with Adams."),
    ("Franklin/01-37-02-0043", "Franklin", "Livingston", "reports",
     "I send you a letter of Mr Adams's, just received", "Franklin forwards an Adams letter to Livingston."),
    ("Jay/01-03-02-0008", "Jay", "Lafayette", "consults",
     "I have had the satisfaction of conferring with the Marquis de Lafayette, on several interesting subjects", "Jay reports a direct consultation with Lafayette; the subjects are not specified here."),
    ("Franklin/01-37-02-0048", "Franklin", "Hartley", "negotiates",
     "what has passed between us is to be considered merely as private conversation", "Franklin distinguishes exploratory peace talks with Hartley from an authorized negotiation."),
    ("Franklin/01-37-02-0068", "Shelburne", "Oswald", "delegates",
     "has made me send to you Mr Oswald", "Shelburne sends Oswald as an intermediary to Franklin."),
    ("Franklin/01-37-02-0182", "Franklin", "Vergennes", "reports",
     "Mr Oswald is just returned from London, and is now with me", "Franklin updates Vergennes on Oswald's arrival."),
    ("Franklin/01-37-02-0182", "Oswald", "Franklin", "reports",
     "He has delivered me a letter from Lord Shelburne", "Franklin says Oswald conveyed Shelburne's letter to him."),
    ("Franklin/01-37-02-0205", "Franklin", "Vergennes", "introduces",
     "I introduced him as soon as possible to Count de Vergennes", "Franklin introduces the British envoy Grenville to Vergennes."),
    ("Franklin/01-37-02-0074", "Laurens", "Oswald", "supports",
     "Richard Oswald, Esquire, who will do me the honor of delivering this, is a gentleman of the strictest candor and integrity", "Laurens endorses Oswald as a trustworthy intermediary to Franklin."),
    ("Franklin/01-37-02-0329", "Livingston", "Franklin", "requests",
     "I could wish to know from you what allowance you make to your private Secretary", "Livingston asks Franklin for an accounting of his office's expenses."),
    ("Adams/06-13-02-0001", "Adams", "Dumas", "supports",
     "you have my consent to transmit this opinion to Congress", "Adams supports Dumas's appointment to a formal legation role."),
]

out = []
for doc_id, source, target, kind, quote, note in SAMPLES:
    letter = letters[doc_id]
    full = " ".join(letter["paragraphs"])
    assert quote in full, (doc_id, quote)
    out.append({"docId": doc_id, "source": person(source), "target": person(target),
                "type": kind, "evidence": quote, "note": note, "student": "sample"})
(ROOT / "data" / "sample_annotations.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(ROOT / "explorer" / "sample_data.js").write_text("window.SAMPLE_ANNOTATIONS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"Validated {len(out)} sample annotations from {len({x['docId'] for x in out})} letters.")
