"""Public HTTPS smoke check using synthetic data; no personal journal is sent."""
import json
import uuid
import urllib.request
from pathlib import Path

base = "https://mathspeedy.duckdns.org/istiqamah-api"
code = (Path(__file__).resolve().parent.parent / ".istiqamah-vps-access.txt").read_text().strip()

def post(path, value, token=""):
    request = urllib.request.Request(base + path, data=json.dumps(value).encode(), headers={"Origin": "https://frangga99999.github.io", "Content-Type": "application/json", "Authorization": "Bearer " + token})
    with urllib.request.urlopen(request, timeout=55) as response:
        return json.loads(response.read())

token = post("/connect", {"code": code})["token"]
device = str(uuid.uuid4())
try:
    from app import KEYS, valid_result
    snapshot = {key: {} for key in KEYS}
    snapshot.update(logs=[], journalEntries=[], profile=None, settings=None, goal=None)
    post("/backup", {"device": device, "snapshot": snapshot}, token)
    assert post("/restore", {"device": device}, token)["snapshot"] == snapshot
    assert any(row["device"] == device for row in post("/backups", {}, token)["backups"])
    for mode, context in [("questions", {}), ("reflection", {"feeling": "Catatan uji: tenang", "goal": "Catatan uji: berhenti bekerja saat adzan"}), ("fasting", {"sleep": "7", "activity": "ringan", "health": "Tidak ada kondisi khusus yang diketahui", "food": "", "status": "planned"})]:
        answer = post("/wellbeing", {"mode": mode, "context": context}, token)
        assert valid_result(answer, mode)
        assert mode != "fasting" or all(answer[key].strip() for key in ("nutrition", "sleep", "health", "spiritual"))
        assert mode != "reflection" or answer["reflection"].strip()
        print(f"ok — live VPS-Combo-gue {mode}, validated JSON response")
    print("ok — public HTTPS authenticated SQLite backup/restore")
finally:
    post("/delete-backup", {"device": device}, token)
    post("/disconnect", {}, token)
