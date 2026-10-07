"""Run: python3 server/test_app.py. Uses disposable data and no real model."""
import json
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path
import app

with tempfile.TemporaryDirectory() as directory:
    app.DATA = Path(directory)
    app.initialize()
    server = app.Server(("127.0.0.1", 0))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"

    def post(path, value, token="", origin="https://frangga99999.github.io"):
        request = urllib.request.Request(base + path, data=json.dumps(value).encode(), headers={"Origin": origin, "Content-Type": "application/json", "Authorization": "Bearer " + token})
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    assert post("/connect", {"code": "wrong"})[0] == 401
    assert post("/connect", {"code": "wrong"}, origin="https://untrusted.example")[0] == 403
    assert post("/backup", {})[0] == 401
    status, session = post("/connect", {"code": (app.DATA / "access-code").read_text()})
    assert status == 200
    token = session["token"]
    device = "12345678-1234-1234-1234-123456789abc"
    snapshot = {key: {} for key in app.KEYS}
    snapshot.update(logs=[], journalEntries=[], profile=None, settings=None, goal=None)
    assert post("/backup", {"device": device, "snapshot": snapshot}, token)[0] == 200
    assert post("/restore", {"device": device}, token)[1]["snapshot"] == snapshot
    assert post("/backups", {}, token)[1]["backups"][0]["device"] == device
    assert post("/backup", {"device": device, "snapshot": {}}, token)[0] == 400
    assert post("/wellbeing", {"mode": "fasting", "context": {"sleep": "nan"}}, token)[0] == 400
    answer = {"questions": ["Apa yang kamu rasakan?", "Apa langkah kecilmu?"], **{key: "" for key in ("reflection", "nutrition", "sleep", "health", "spiritual")}}
    app.ask_ai = lambda value: answer
    for _ in range(20):
        assert post("/wellbeing", {"mode": "questions", "context": {}}, token) == (200, answer)
    assert post("/wellbeing", {"mode": "questions", "context": {}}, token)[0] == 429
    assert post("/delete-backup", {"device": device}, token)[0] == 200
    assert post("/restore", {"device": device}, token)[1]["snapshot"] is None
    assert post("/disconnect", {}, token)[0] == 200
    assert post("/restore", {"device": device}, token)[0] == 401
    server.shutdown()
    server.server_close()
    server.pool.shutdown()
print("ok — SQLite persistence, authentication, origins, validation, logout, and AI quota")
