from datetime import UTC, datetime, timedelta

from sqlmodel import Field, SQLModel, UniqueConstraint


def now() -> datetime:
    # aware UTC everywhere: SQLModel's UTCDateTime rejects naive values and reads back aware UTC
    return datetime.now(UTC)


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    phone: str = Field(unique=True, index=True)
    name: str | None = None
    created_at: datetime = Field(default_factory=now)


class Card(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "token"),)
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str  # HMAC-SHA256(secret, pan). The full PAN is never stored.
    bin6: str
    last4: str
    created_at: datetime = Field(default_factory=now)


class Merchant(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name_fa: str
    name_en: str
    category: str
    city_fa: str
    city_en: str
    color: str
    emoji: str


class Offer(SQLModel, table=True):
    """An offer is a merchant campaign; campaign fields live here too."""

    id: int | None = Field(default=None, primary_key=True)
    merchant_id: int = Field(foreign_key="merchant.id", index=True)
    title_fa: str
    title_en: str
    description_fa: str = ""
    description_en: str = ""
    cashback_percent: int
    max_reward: int
    min_purchase: int = 0
    channel: str = "both"
    ends_at: datetime
    featured: bool = False
    status: str = "active"  # active | paused ("ended" is derived)
    budget: int
    spent: int = 0
    activations: int = 0
    redemptions: int = 0
    created_at: datetime = Field(default_factory=now)


class Activation(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "offer_id"),)
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    offer_id: int = Field(foreign_key="offer.id")
    created_at: datetime = Field(default_factory=now)


class Purchase(SQLModel, table=True):
    """A card transaction seen by the matching engine ("transaction" in the API)."""

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    merchant_id: int = Field(foreign_key="merchant.id")
    card_last4: str
    amount: int
    created_at: datetime = Field(default_factory=now)


class Reward(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    offer_id: int = Field(foreign_key="offer.id")
    merchant_id: int = Field(foreign_key="merchant.id", index=True)
    card_last4: str
    amount: int  # purchase amount
    reward: int  # cashback
    created_at: datetime = Field(default_factory=now)
    # pending until this moment; created_at + 30s for live purchases, later for seeded pending ones
    settles_at: datetime = Field(default_factory=lambda: now() + timedelta(seconds=30))
