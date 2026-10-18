import hmac
import os
import random
import re
import secrets
import time
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, BeforeValidator, Field, StringConstraints
from sqlmodel import Session, SQLModel, create_engine, select

from . import seed as data
from .models import Activation, Card, Merchant, Offer, Purchase, Reward, User, now
from .security import luhn_ok, make_token, pan_token, read_token

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./cardback.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})


@asynccontextmanager
async def lifespan(_app):
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        data.seed(s)
    yield


app = FastAPI(title="CardBack API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3470"], allow_methods=["*"], allow_headers=["*"])


def get_session():
    with Session(engine) as s:
        yield s


DB = Annotated[Session, Depends(get_session)]
bearer = HTTPBearer(auto_error=False)


def optional_user(s: DB, creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> User | None:
    uid = read_token(creds.credentials) if creds else None
    return s.get(User, uid) if uid else None


def current_user(user: User | None = Depends(optional_user)) -> User:
    if not user:
        raise HTTPException(401, "unauthorized")
    return user


Me = Annotated[User, Depends(current_user)]


# ---- serializers ----
def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def user_out(u: User):
    return dict(id=u.id, phone=u.phone, name=u.name, created_at=iso(u.created_at))


def merchant_out(m: Merchant):
    return m.model_dump()


def card_out(c: Card):
    return dict(id=c.id, bank=data.BANK_BY_BIN[c.bin6], last4=c.last4,
                masked=f"{c.bin6[:4]} {c.bin6[4:]}•• •••• {c.last4}", created_at=iso(c.created_at))


def is_live(o: Offer) -> bool:
    return o.status == "active" and o.ends_at > now() and o.spent < o.budget


def offer_out(s: Session, o: Offer, user: User | None):
    activated = bool(user and s.exec(select(Activation).where(Activation.user_id == user.id, Activation.offer_id == o.id)).first())
    return dict(
        id=o.id, merchant=merchant_out(s.get(Merchant, o.merchant_id)), title_fa=o.title_fa, title_en=o.title_en,
        description_fa=o.description_fa, description_en=o.description_en, cashback_percent=o.cashback_percent,
        max_reward=o.max_reward, min_purchase=o.min_purchase, channel=o.channel, ends_at=iso(o.ends_at),
        featured=o.featured, activated=activated, redemptions=o.redemptions,
    )


def campaign_out(s: Session, o: Offer, user: User):
    status = "ended" if o.ends_at <= now() or o.spent >= o.budget else o.status
    return offer_out(s, o, user) | dict(status=status, budget=o.budget, spent=o.spent, activations=o.activations)


def reward_out(s: Session, r: Reward):
    return dict(id=r.id, offer_id=r.offer_id, merchant=merchant_out(s.get(Merchant, r.merchant_id)), amount=r.amount,
                reward=r.reward, status="pending" if now() < r.settles_at else "settled",
                card_last4=r.card_last4, created_at=iso(r.created_at))


# ---- auth ----
PHONE_RE = re.compile(r"09[0-9]{9}")
OTP_TTL = 120
# ponytail: in-process OTP store; move to the DB/redis if running more than one worker.
otps: dict[str, list] = {}  # phone -> [code, expires_at, failed_tries]


FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "0123456789" * 2)
# Persian/Arabic keyboards type ۰۹۱۲...; accept them anywhere the user types digits
Digits = Annotated[str, BeforeValidator(lambda v: v.translate(FA_DIGITS).strip() if isinstance(v, str) else v)]


class OtpIn(BaseModel):
    phone: Digits


class VerifyIn(OtpIn):
    code: Digits


def check_phone(phone: str) -> str:
    if not PHONE_RE.fullmatch(phone):
        raise HTTPException(400, "invalid_phone")
    return phone


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/otp")
def send_otp(body: OtpIn):
    code = f"{secrets.randbelow(100_000):05d}"
    otps[check_phone(body.phone)] = [code, time.time() + OTP_TTL, 0]
    # DEMO mode: no SMS gateway, the code is handed back to the client
    return {"sent": True, "dev_code": code, "expires_in": OTP_TTL}


@app.post("/api/auth/verify")
def verify_otp(body: VerifyIn, s: DB):
    entry = otps.get(check_phone(body.phone))
    if not entry or entry[1] < time.time() or entry[2] >= 5:
        raise HTTPException(400, "invalid_code")
    if not hmac.compare_digest(entry[0].encode(), body.code.encode()):
        entry[2] += 1
        raise HTTPException(400, "invalid_code")
    del otps[body.phone]
    user = s.exec(select(User).where(User.phone == body.phone)).first()
    if not user:
        user = User(phone=body.phone)
        s.add(user)
        s.commit()
        s.refresh(user)
    return {"token": make_token(user.id), "user": user_out(user)}


@app.post("/api/auth/demo")
def demo_login(s: DB):
    user = s.exec(select(User).where(User.phone == data.DEMO_PHONE)).one()
    return {"token": make_token(user.id), "user": user_out(user)}


class MeIn(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)] | None = None


@app.get("/api/me")
def get_me(user: Me):
    return user_out(user)


@app.patch("/api/me")
def patch_me(body: MeIn, user: Me, s: DB):
    user.name = body.name or None
    s.add(user)
    s.commit()
    s.refresh(user)
    return user_out(user)


# ---- reference data ----
@app.get("/api/banks")
def banks():
    return data.BANKS


@app.get("/api/categories")
def categories():
    return data.CATEGORIES


@app.get("/api/merchants")
def merchants(s: DB):
    return [merchant_out(m) for m in s.exec(select(Merchant).order_by(Merchant.id))]


# ---- cards ----
class CardIn(BaseModel):
    pan: Digits


def my_card(s: Session, user: User, card_id: int) -> Card:
    card = s.get(Card, card_id)
    if not card or card.user_id != user.id:
        raise HTTPException(404, "card_not_found")
    return card


@app.get("/api/cards")
def list_cards(user: Me, s: DB):
    return [card_out(c) for c in s.exec(select(Card).where(Card.user_id == user.id).order_by(Card.id))]


@app.post("/api/cards")
def add_card(body: CardIn, user: Me, s: DB):
    pan = re.sub(r"[\s-]", "", body.pan)
    if not re.fullmatch(r"[0-9]{16}", pan) or not luhn_ok(pan):
        raise HTTPException(400, "invalid_pan")
    if pan[:6] not in data.BANK_BY_BIN:
        raise HTTPException(400, "unknown_bank")
    token = pan_token(pan)
    if s.exec(select(Card).where(Card.user_id == user.id, Card.token == token)).first():
        raise HTTPException(400, "duplicate_card")
    card = Card(user_id=user.id, token=token, bin6=pan[:6], last4=pan[-4:])
    s.add(card)
    s.commit()
    s.refresh(card)
    return card_out(card)


@app.delete("/api/cards/{card_id}", status_code=204)
def delete_card(card_id: int, user: Me, s: DB):
    s.delete(my_card(s, user, card_id))
    s.commit()
    return Response(status_code=204)


# ---- offers ----
def get_offer(s: Session, offer_id: int) -> Offer:
    offer = s.get(Offer, offer_id)
    if not offer:
        raise HTTPException(404, "offer_not_found")
    return offer


@app.get("/api/offers")
def list_offers(s: DB, user: User | None = Depends(optional_user), category: str | None = None, q: str | None = None):
    rows = s.exec(select(Offer, Merchant).join(Merchant).order_by(Offer.featured.desc(), Offer.id)).all()
    needle = (q or "").strip().casefold()
    return [
        offer_out(s, o, user) for o, m in rows
        if is_live(o)
        and (not category or m.category == category)
        and (not needle or any(needle in t.casefold() for t in (o.title_fa, o.title_en, m.name_fa, m.name_en)))
    ]


@app.post("/api/offers/{offer_id}/activate")
def activate(offer_id: int, user: Me, s: DB):
    offer = get_offer(s, offer_id)
    if not s.exec(select(Activation).where(Activation.user_id == user.id, Activation.offer_id == offer_id)).first():
        if not is_live(offer):
            raise HTTPException(400, "offer_inactive")
        s.add(Activation(user_id=user.id, offer_id=offer_id))
        offer.activations += 1
        s.add(offer)
        s.commit()
    return offer_out(s, offer, user)


@app.delete("/api/offers/{offer_id}/activate")
def deactivate(offer_id: int, user: Me, s: DB):
    offer = get_offer(s, offer_id)
    act = s.exec(select(Activation).where(Activation.user_id == user.id, Activation.offer_id == offer_id)).first()
    if act:
        s.delete(act)
        offer.activations = max(0, offer.activations - 1)
        s.add(offer)
        s.commit()
    return offer_out(s, offer, user)


# ---- wallet & matching engine ----
@app.get("/api/wallet")
def wallet(user: Me, s: DB):
    rewards = [reward_out(s, r) for r in s.exec(select(Reward).where(Reward.user_id == user.id).order_by(Reward.created_at.desc(), Reward.id.desc()))]
    balance = sum(r["reward"] for r in rewards if r["status"] == "settled")
    pending = sum(r["reward"] for r in rewards if r["status"] == "pending")
    return {"balance": balance, "pending": pending, "lifetime": balance + pending, "rewards": rewards}


class PurchaseIn(BaseModel):
    card_id: int
    merchant_id: int
    amount: int = Field(gt=0, le=10_000_000_000)


@app.post("/api/simulate/purchase")
def simulate_purchase(body: PurchaseIn, user: Me, s: DB):
    card = my_card(s, user, body.card_id)
    merchant = s.get(Merchant, body.merchant_id)
    if not merchant:
        raise HTTPException(404, "merchant_not_found")
    tx = Purchase(user_id=user.id, merchant_id=merchant.id, card_last4=card.last4, amount=body.amount)
    s.add(tx)
    offers = [o for o in s.exec(select(Offer).join(Activation, Activation.offer_id == Offer.id)
                                .where(Activation.user_id == user.id, Offer.merchant_id == merchant.id)) if is_live(o)]
    eligible = [o for o in offers if body.amount >= o.min_purchase]

    def payout(o: Offer) -> int:
        return min(body.amount * o.cashback_percent // 100, o.max_reward, o.budget - o.spent)

    reward, reason = None, None
    if not offers:
        reason = "no_active_offer"
    elif not eligible:
        reason = "below_min_purchase"
    else:
        best = max(eligible, key=payout)  # the card network hits one offer: the best one for the customer
        reward = Reward(user_id=user.id, offer_id=best.id, merchant_id=merchant.id, card_last4=card.last4,
                        amount=body.amount, reward=payout(best))
        best.spent += reward.reward
        best.redemptions += 1
        s.add_all([reward, best])
    s.commit()
    s.refresh(tx)
    return {
        "matched": reward is not None,
        "reason": reason,
        "reward": reward_out(s, reward) if reward else None,
        "transaction": dict(id=tx.id, amount=tx.amount, merchant=merchant_out(merchant),
                            card_last4=tx.card_last4, created_at=iso(tx.created_at)),
    }


# ---- merchant panel (always the demo merchant) ----
def baseline(day: date) -> tuple[int, int, int, int]:
    """Deterministic synthetic (sales, redemptions, rewards, new_customers) for one day."""
    rng = random.Random(f"narenj-{day.isoformat()}")
    red = rng.randint(8, 22) + (6 if day.weekday() in (3, 4) else 0)  # Thu/Fri busier
    sales = red * rng.randint(180, 320) * 1000
    return sales, red, sales * rng.randint(7, 10) // 100, red * rng.randint(35, 60) // 100


@app.get("/api/merchant/dashboard")
def dashboard(user: Me, s: DB):
    merchant = s.get(Merchant, data.DEMO_MERCHANT_ID)
    today = now().date()
    days = [today - timedelta(days=i) for i in range(29, -1, -1)]
    series = {d: list(baseline(d)) for d in days}
    since = datetime.combine(days[0], datetime.min.time(), UTC)
    real = s.exec(select(Reward).where(Reward.merchant_id == merchant.id, Reward.created_at >= since)).all()
    for r in real:
        row = series[r.created_at.date()]
        row[0] += r.amount
        row[1] += 1
        row[2] += r.reward
    sales, redemptions, rewards_paid, new_customers = (sum(col) for col in zip(*series.values()))
    new_customers += len({r.user_id for r in real})
    offers = s.exec(select(Offer).where(Offer.merchant_id == merchant.id)).all()
    activations = sum(o.activations for o in offers)
    return {
        "merchant": merchant_out(merchant),
        "kpis": {
            "attributed_sales": sales, "rewards_paid": rewards_paid, "redemptions": redemptions,
            "activations": activations,
            "redemption_rate": round(min(1.0, redemptions / activations), 4) if activations else 0.0,
            "roi": round(sales / rewards_paid, 2) if rewards_paid else 0.0,
            "cac": rewards_paid // new_customers if new_customers else 0,
            "new_customers": new_customers,
        },
        "series": [{"date": d.isoformat(), "sales": v[0], "redemptions": v[1]} for d, v in series.items()],
        "top_offers": [
            {"offer_id": o.id, "title_fa": o.title_fa, "title_en": o.title_en, "activations": o.activations, "redemptions": o.redemptions}
            for o in sorted(offers, key=lambda o: o.redemptions, reverse=True)[:5]
        ],
    }


def my_campaign(s: Session, campaign_id: int) -> Offer:
    offer = s.get(Offer, campaign_id)
    if not offer or offer.merchant_id != data.DEMO_MERCHANT_ID:
        raise HTTPException(404, "campaign_not_found")
    return offer


Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Desc = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class CampaignIn(BaseModel):
    title_fa: Title
    title_en: Title
    description_fa: Desc = ""
    description_en: Desc = ""
    cashback_percent: int = Field(ge=1, le=50)
    max_reward: int = Field(gt=0)
    min_purchase: int = Field(ge=0)
    budget: int = Field(gt=0)
    channel: Literal["online", "in_store", "both"]
    days: int = Field(ge=1, le=90)
    featured: bool = False


class CampaignPatch(BaseModel):
    status: Literal["active", "paused"]


@app.get("/api/merchant/campaigns")
def list_campaigns(user: Me, s: DB):
    rows = s.exec(select(Offer).where(Offer.merchant_id == data.DEMO_MERCHANT_ID).order_by(Offer.id.desc()))
    return [campaign_out(s, o, user) for o in rows]


@app.post("/api/merchant/campaigns")
def create_campaign(body: CampaignIn, user: Me, s: DB):
    offer = Offer(merchant_id=data.DEMO_MERCHANT_ID, ends_at=now() + timedelta(days=body.days), **body.model_dump(exclude={"days"}))
    s.add(offer)
    s.commit()
    s.refresh(offer)
    return campaign_out(s, offer, user)


@app.patch("/api/merchant/campaigns/{campaign_id}")
def patch_campaign(campaign_id: int, body: CampaignPatch, user: Me, s: DB):
    offer = my_campaign(s, campaign_id)
    offer.status = body.status
    s.add(offer)
    s.commit()
    s.refresh(offer)
    return campaign_out(s, offer, user)
