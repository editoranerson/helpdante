"""Backend persistence tests for Help, Querido Dante portal.
Tests that data survives a `sudo supervisorctl restart backend`.
"""
import os
import subprocess
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "dante@2026"


def restart_backend():
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
    # Wait for backend to come up
    for _ in range(20):
        time.sleep(1)
        try:
            r = requests.get(f"{API}/portal-config", timeout=5)
            if r.status_code == 200:
                return
        except Exception:
            pass
    raise RuntimeError("Backend didn't come back up")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=10)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- TITLE TEST ---
def test_html_title():
    r = requests.get(BASE_URL + "/", timeout=10)
    assert r.status_code == 200
    assert "<title>Help, Querido Dante</title>" in r.text, f"Title tag not found. Snippet: {r.text[:500]}"


# --- PORTAL CONFIG PERSISTENCE ---
def test_portal_config_persistence(auth):
    payload = {
        "book_site_url": "https://meu-livro-test.com",
        "about_text": "Sobre TEST persistência 2026",
        "terms_text": "Termos TEST persistência 2026",
        "footer_text": "Footer TEST persistência 2026",
    }
    # Save original
    orig = requests.get(f"{API}/portal-config", timeout=10).json()

    r = requests.put(f"{API}/portal-config", json=payload, headers=auth, timeout=10)
    assert r.status_code == 200

    got = requests.get(f"{API}/portal-config", timeout=10).json()
    for k, v in payload.items():
        assert got[k] == v, f"pre-restart mismatch on {k}"

    restart_backend()

    got2 = requests.get(f"{API}/portal-config", timeout=10).json()
    for k, v in payload.items():
        assert got2[k] == v, f"POST-RESTART persistence failed on {k}: got {got2.get(k)!r}"

    # restore
    keep = {k: orig.get(k, "") for k in ["book_site_url", "about_text", "terms_text", "footer_text"]}
    requests.put(f"{API}/portal-config", json=keep, headers=auth, timeout=10)


# --- PLAYLIST CRUD PERSISTENCE ---
def test_playlists_persistence(auth):
    before = requests.get(f"{API}/playlists", timeout=10).json()
    before_count = len(before)

    created_ids = []
    for i in range(1, 4):
        r = requests.post(f"{API}/playlists", headers=auth, json={
            "category": "TESTE_PERSIST",
            "song_name": f"TESTE_PERSIST_{i}",
            "artist": "TestArtist",
            "youtube_url": "https://youtu.be/dQw4w9WgXcQ",
        }, timeout=10)
        assert r.status_code == 200, r.text
        created_ids.append(r.json()["id"])

    mid = requests.get(f"{API}/playlists", timeout=10).json()
    assert len(mid) == before_count + 3

    restart_backend()

    after = requests.get(f"{API}/playlists", timeout=10).json()
    after_names = {p["song_name"] for p in after}
    for i in range(1, 4):
        assert f"TESTE_PERSIST_{i}" in after_names, f"TESTE_PERSIST_{i} missing after restart"
    assert len(after) == before_count + 3, f"Count changed after restart: before={before_count} after={len(after)}"

    for cid in created_ids:
        requests.delete(f"{API}/playlists/{cid}", headers=auth, timeout=10)


# --- VIDEOS PERSISTENCE ---
def test_videos_persistence(auth):
    before = requests.get(f"{API}/videos", timeout=10).json()
    ids = []
    for i in range(1, 3):
        r = requests.post(f"{API}/videos", headers=auth, json={
            "title": f"TESTE_VID_{i}",
            "youtube_url": "https://youtu.be/dQw4w9WgXcQ",
        }, timeout=10)
        assert r.status_code == 200
        ids.append(r.json()["id"])

    restart_backend()

    after = requests.get(f"{API}/videos", timeout=10).json()
    titles = {v["title"] for v in after}
    assert "TESTE_VID_1" in titles and "TESTE_VID_2" in titles
    assert len(after) == len(before) + 2

    for cid in ids:
        requests.delete(f"{API}/videos/{cid}", headers=auth, timeout=10)


# --- ACTION CARDS ---
def test_action_cards_persistence(auth):
    r = requests.post(f"{API}/action-cards", headers=auth, json={
        "kind": "fazer", "icon": "Heart", "title": "TESTE_AC", "text": "test text"
    }, timeout=10)
    assert r.status_code == 200
    cid = r.json()["id"]
    restart_backend()
    after = requests.get(f"{API}/action-cards", timeout=10).json()
    assert any(a["id"] == cid for a in after)
    requests.delete(f"{API}/action-cards/{cid}", headers=auth, timeout=10)


# --- EMERGENCY CHANNELS ---
def test_emergency_channels_persistence(auth):
    r = requests.post(f"{API}/emergency-channels", headers=auth, json={
        "kind": "preciso", "name": "TESTE_EC", "description": "d", "phone": "0", "whatsapp": "", "email": "", "website": ""
    }, timeout=10)
    assert r.status_code == 200
    cid = r.json()["id"]
    restart_backend()
    after = requests.get(f"{API}/emergency-channels", timeout=10).json()
    assert any(a["id"] == cid for a in after)
    requests.delete(f"{API}/emergency-channels/{cid}", headers=auth, timeout=10)


# --- PSYCHOLOGISTS ---
def test_psychologists_persistence(auth):
    r = requests.post(f"{API}/psychologists", headers=auth, json={
        "name": "TESTE_PSY", "crp": "99/999999", "whatsapp": "", "instagram": "", "photo_url": ""
    }, timeout=10)
    assert r.status_code == 200
    cid = r.json()["id"]
    restart_backend()
    after = requests.get(f"{API}/psychologists", timeout=10).json()
    assert any(a["id"] == cid for a in after)
    requests.delete(f"{API}/psychologists/{cid}", headers=auth, timeout=10)


# --- LAWS ---
def test_laws_persistence(auth):
    r = requests.post(f"{API}/laws", headers=auth, json={
        "kind": "lei", "title": "TESTE_LAW", "description": "d", "platform": "", "link": ""
    }, timeout=10)
    assert r.status_code == 200
    cid = r.json()["id"]
    restart_backend()
    after = requests.get(f"{API}/laws", timeout=10).json()
    assert any(a["id"] == cid for a in after)
    requests.delete(f"{API}/laws/{cid}", headers=auth, timeout=10)


# --- DANTE CONFIG PERSISTENCE ---
def test_dante_config_persistence(auth):
    orig = requests.get(f"{API}/dante-config", headers=auth, timeout=10).json()
    custom = "PROMPT TEST 2026 xyz"
    r = requests.put(f"{API}/dante-config", headers=auth, json={"system_prompt": custom}, timeout=10)
    assert r.status_code == 200

    restart_backend()

    got = requests.get(f"{API}/dante-config", headers=auth, timeout=10).json()
    assert got["system_prompt"] == custom, f"Dante config didn't persist: {got}"

    # restore
    requests.put(f"{API}/dante-config", headers=auth, json={"system_prompt": orig.get("system_prompt", "")}, timeout=10)


# --- SEED IDEMPOTENCE: counts stable across restart ---
def test_seed_no_duplicate_on_restart(auth):
    counts_before = {
        c: len(requests.get(f"{API}/{c}", timeout=10).json())
        for c in ["playlists", "videos", "action-cards", "emergency-channels", "psychologists", "laws"]
    }
    restart_backend()
    counts_after = {
        c: len(requests.get(f"{API}/{c}", timeout=10).json())
        for c in ["playlists", "videos", "action-cards", "emergency-channels", "psychologists", "laws"]
    }
    assert counts_before == counts_after, f"Seed re-ran or dup: {counts_before} vs {counts_after}"
