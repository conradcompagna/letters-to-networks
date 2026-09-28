"""Small shared classroom server for the 30-person letters lab.

Run from this directory: python classroom_server.py --host 0.0.0.0 --port 8767
The private roster and submissions are created under .classroom_private/.
"""
from __future__ import annotations

import argparse
import json
import re
import secrets
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
PRIVATE = ROOT / ".classroom_private"
DATA = json.loads((ROOT / "data" / "classroom_letters.json").read_text(encoding="utf-8"))
LETTERS = {letter["docId"]: letter for letter in DATA["letters"]}
NODES = {letter[key] for letter in DATA["letters"] for key in ("writer", "addressee")}
TYPES = {"reports", "requests", "supports", "opposes", "delegates", "introduces", "consults", "negotiates", "other"}
LOCK = threading.RLock()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def roster() -> dict[str, str]:
    path = PRIVATE / "roster.json"
    if not path.exists():
        write_json(path, {str(i): secrets.token_hex(4).upper() for i in range(1, 31)})
    return json.loads(path.read_text(encoding="utf-8"))


def submission_path(student: str) -> Path:
    return PRIVATE / "submissions" / f"student-{int(student):02}.json"


def submission(student: str) -> dict:
    path = submission_path(student)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"student": student, "letters": {}, "response": ""}


def student_for(code: str) -> str | None:
    return next((student for student, key in roster().items() if secrets.compare_digest(code.upper(), key)), None)


def validate_annotations(doc_id: str, annotations: object) -> list[dict]:
    if not isinstance(annotations, list) or len(annotations) > 15:
        raise ValueError("Provide at most 15 relationships for one letter.")
    letter = LETTERS[doc_id]
    full_text = " ".join(letter["paragraphs"])
    normalized_text = " ".join(full_text.casefold().split())
    clean = []
    seen = set()
    for item in annotations:
        if not isinstance(item, dict):
            raise ValueError("Invalid relationship.")
        source, target = item.get("source"), item.get("target")
        kind = item.get("type")
        evidence = str(item.get("evidence", "")).strip()
        note = str(item.get("note", "")).strip()
        if source not in NODES or target not in NODES or source == target or kind not in TYPES:
            raise ValueError("Choose two distinct listed people and a relationship type.")
        if not 20 <= len(evidence) <= 600 or " ".join(evidence.casefold().split()) not in normalized_text:
            raise ValueError("Evidence must be an exact 20–600 character excerpt from this letter.")
        if not 12 <= len(note) <= 500:
            raise ValueError("Explain the relationship in 12–500 characters.")
        key = (source, target, kind, " ".join(evidence.casefold().split()))
        if key in seen:
            raise ValueError("That relationship and passage are already recorded for this letter.")
        seen.add(key)
        clean.append({"source": source, "target": target, "type": kind, "evidence": evidence, "note": note})
    return clean


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, value: object, status: int = 200):
        payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            code = self.headers.get("X-Student-Code", "")
            student = student_for(code)
            if not student:
                self.send_json({"error": "Enter a valid student code."}, 403)
                return
            with LOCK:
                own = submission(student)
                completed = len(own["letters"])
                if parsed.path == "/api/state":
                    if completed < 10:
                        self.send_json({"student": student, "own": own, "completed": completed,
                                        "required": 10, "revealed": False})
                        return
                    all_submissions = [submission(str(i)) for i in range(1, 31)]
                    annotations = [dict(item, docId=doc_id, student=entry["student"])
                                   for entry in all_submissions for doc_id, reading in entry["letters"].items()
                                   for item in reading["annotations"]]
                    self.send_json({"student": student, "own": own, "completed": completed,
                                    "required": 10, "revealed": True,
                                    "classCompleted": sum(len(entry["letters"]) for entry in all_submissions),
                                    "annotations": annotations})
                    return
            self.send_json({"error": "Unknown API route."}, 404)
            return
        if parsed.path == "/":
            self.send_response(302)
            self.send_header("Location", "/explorer/")
            self.end_headers()
            return
        requested = (ROOT / unquote(parsed.path).lstrip("/")).resolve()
        if not requested.is_relative_to((ROOT / "explorer").resolve()):
            self.send_error(404)
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/letter", "/api/response"):
            self.send_json({"error": "Unknown API route."}, 404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 20000:
            self.send_json({"error": "Invalid submission size."}, 400)
            return
        try:
            body = json.loads(self.rfile.read(length))
            student = student_for(str(body.get("code", "")))
            if not student:
                self.send_json({"error": "Enter a valid student code."}, 403)
                return
            with LOCK:
                own = submission(student)
                if parsed.path == "/api/letter":
                    doc_id = body.get("docId")
                    if doc_id not in DATA["assignments"][student]:
                        raise ValueError("This letter is not in your assignment.")
                    note = str(body.get("readingNote", "")).strip()
                    if not 40 <= len(note) <= 1000:
                        raise ValueError("Add a 40–1000 character reading note for this letter.")
                    own["letters"][doc_id] = {"readingNote": note,
                                               "annotations": validate_annotations(doc_id, body.get("annotations"))}
                else:
                    if len(own["letters"]) < 10:
                        raise ValueError("Finish your ten letters before submitting the response.")
                    response = str(body.get("response", "")).strip()
                    words = len(re.findall(r"\b[\w’'-]+\b", response))
                    if words < 450 or words > 600:
                        raise ValueError("Write approximately 500 words (450–600).")
                    own["response"] = response
                write_json(submission_path(student), own)
            self.send_json({"ok": True, "completed": len(own["letters"])})
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, 400)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8767)
    args = parser.parse_args()
    keys = roster()
    print("Student access codes (keep this terminal private):")
    for student, code in keys.items():
        print(f"  {int(student):02}: {code}")
    print(f"Classroom: http://{args.host}:{args.port}/explorer/")
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
