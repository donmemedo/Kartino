import os
import tempfile

DB_PATH = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.security import luhn_complete  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def login(client, phone):
    code = client.post("/api/auth/otp", json={"phone": phone}).json()["dev_code"]
    r = client.post("/api/auth/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_otp_flow(client):
    assert client.post("/api/auth/otp", json={"phone": "12345"}).json()["detail"] == "invalid_phone"
    r = client.post("/api/auth/otp", json={"phone": "09121112233"}).json()
    assert r["sent"] and len(r["dev_code"]) == 5 and r["expires_in"] == 120
    wrong = "00000" if r["dev_code"] != "00000" else "11111"
    bad = client.post("/api/auth/verify", json={"phone": "09121112233", "code": wrong})
    assert (bad.status_code, bad.json()["detail"]) == (400, "invalid_code")
    ok = client.post("/api/auth/verify", json={"phone": "09121112233", "code": r["dev_code"]}).json()
    assert ok["user"]["phone"] == "09121112233" and ok["user"]["name"] is None
    h = {"Authorization": f"Bearer {ok['token']}"}
    assert client.get("/api/me", headers=h).json()["id"] == ok["user"]["id"]
    assert client.patch("/api/me", json={"name": " علی "}, headers=h).json()["name"] == "علی"
    # code is single-use
    again = client.post("/api/auth/verify", json={"phone": "09121112233", "code": r["dev_code"]})
    assert again.json()["detail"] == "invalid_code"
    assert client.get("/api/me").status_code == 401


def test_demo_login(client):
    r = client.post("/api/auth/demo").json()
    assert r["user"]["phone"] == "09120000047" and r["user"]["name"] == "سارا"
    h = {"Authorization": f"Bearer {r['token']}"}
    assert len(client.get("/api/cards", headers=h).json()) == 2
    w = client.get("/api/wallet", headers=h).json()
    assert len(w["rewards"]) >= 8 and w["pending"] > 0 and w["balance"] > 0
    assert w["lifetime"] == w["balance"] + w["pending"]
    assert sum(o["activated"] for o in client.get("/api/offers", headers=h).json()) >= 4


def test_cards(client):
    h = login(client, "09125550001")
    pan = luhn_complete("610433" + "123456789")
    r = client.post("/api/cards", json={"pan": f"{pan[:4]} {pan[4:8]}-{pan[8:12]} {pan[12:]}"}, headers=h)
    assert r.status_code == 200
    card = r.json()
    assert card["bank"]["code"] == "mellat" and card["last4"] == pan[-4:]
    assert card["masked"] == f"6104 33•• •••• {pan[-4:]}"

    def detail(p):
        return client.post("/api/cards", json={"pan": p}, headers=h).json()["detail"]

    assert detail(pan) == "duplicate_card"
    assert detail(pan[:-1] + str((int(pan[-1]) + 1) % 10)) == "invalid_pan"
    assert detail("1234") == "invalid_pan"
    assert detail(luhn_complete("111111" + "123456789")) == "unknown_bank"
    assert pan.encode() not in open(DB_PATH, "rb").read()  # full PAN never stored

    assert client.delete(f"/api/cards/{card['id']}", headers=h).status_code == 204
    assert client.get("/api/cards", headers=h).json() == []


def test_activate_and_purchase(client):
    h = login(client, "09125550002")
    card = client.post("/api/cards", json={"pan": luhn_complete("603799" + "555000111")}, headers=h).json()
    offers = client.get("/api/offers").json()
    assert all(not o["activated"] for o in offers)
    # Narenj Café breakfast: 15%, cap 60,000, min 150,000
    offer = next(o for o in offers if o["title_en"] == "15% back on breakfast")
    mid = offer["merchant"]["id"]

    def buy(amount):
        return client.post("/api/simulate/purchase", json={"card_id": card["id"], "merchant_id": mid, "amount": amount}, headers=h).json()

    assert buy(500_000)["reason"] == "no_active_offer"
    a = client.post(f"/api/offers/{offer['id']}/activate", headers=h).json()
    assert a["activated"]
    assert client.post(f"/api/offers/{offer['id']}/activate", headers=h).json()["activated"]  # idempotent

    r = buy(200_000)
    assert r["matched"] and r["reward"]["reward"] == 30_000 and r["reward"]["status"] == "pending"
    capped = buy(1_000_000)
    assert capped["reward"]["reward"] == 60_000  # 15% would be 150,000
    low = buy(100_000)
    assert (low["matched"], low["reason"], low["reward"]) == (False, "below_min_purchase", None)
    assert low["transaction"]["amount"] == 100_000 and low["transaction"]["card_last4"] == card["last4"]

    w = client.get("/api/wallet", headers=h).json()
    assert w["pending"] == 90_000 and w["balance"] == 0 and w["rewards"][0]["reward"] == 60_000

    assert not client.delete(f"/api/offers/{offer['id']}/activate", headers=h).json()["activated"]
    other = login(client, "09125550003")
    r = client.post("/api/simulate/purchase", json={"card_id": card["id"], "merchant_id": mid, "amount": 1}, headers=other)
    assert (r.status_code, r.json()["detail"]) == (404, "card_not_found")


def test_campaigns(client):
    h = login(client, "09125550004")
    body = dict(title_fa="کمپین تست", title_en="Test campaign", cashback_percent=12, max_reward=40_000,
                min_purchase=0, budget=5_000_000, channel="both", days=10)
    assert client.post("/api/merchant/campaigns", json=body | {"cashback_percent": 60}, headers=h).status_code == 422
    c = client.post("/api/merchant/campaigns", json=body, headers=h).json()
    assert c["status"] == "active" and c["spent"] == 0 and c["merchant"]["id"] == 1
    assert any(o["id"] == c["id"] for o in client.get("/api/offers?q=test").json())
    assert any(o["id"] == c["id"] for o in client.get("/api/offers?category=cafe").json())
    assert not any(o["id"] == c["id"] for o in client.get("/api/offers?category=online").json())

    assert client.patch(f"/api/merchant/campaigns/{c['id']}", json={"status": "paused"}, headers=h).json()["status"] == "paused"
    assert not any(o["id"] == c["id"] for o in client.get("/api/offers").json())
    statuses = {x["status"] for x in client.get("/api/merchant/campaigns", headers=h).json()}
    assert statuses == {"active", "paused", "ended"}


def test_dashboard(client):
    h = login(client, "09125550005")
    d = client.get("/api/merchant/dashboard", headers=h).json()
    assert d["merchant"]["name_en"] == "Narenj Café"
    k = d["kpis"]
    assert set(k) == {"attributed_sales", "rewards_paid", "redemptions", "activations", "redemption_rate", "roi", "cac", "new_customers"}
    assert 0 < k["redemption_rate"] <= 1 and k["roi"] > 1 and k["cac"] > 0
    assert len(d["series"]) == 30 and set(d["series"][0]) == {"date", "sales", "redemptions"}
    assert sum(p["sales"] for p in d["series"]) == k["attributed_sales"]
    assert d["top_offers"] and set(d["top_offers"][0]) == {"offer_id", "title_fa", "title_en", "activations", "redemptions"}
    assert client.get("/api/merchant/dashboard").status_code == 401


def test_reference_data(client):
    assert len(client.get("/api/categories").json()) == 8
    assert len(client.get("/api/merchants").json()) == 12
    banks = client.get("/api/banks").json()
    assert any("603799" in b["bins"] for b in banks)
    assert 14 <= len(client.get("/api/offers").json()) <= 17


def test_persian_digits(client):
    fa = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
    code = client.post("/api/auth/otp", json={"phone": "09125550009".translate(fa)}).json()["dev_code"]
    r = client.post("/api/auth/verify", json={"phone": "09125550009", "code": code.translate(fa)})
    assert r.status_code == 200 and r.json()["user"]["phone"] == "09125550009"
    assert client.get("/api/me", headers={"Authorization": "Bearer 1.2.\u00e9".encode("latin-1")}).status_code == 401
