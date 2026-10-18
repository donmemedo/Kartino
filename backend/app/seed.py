"""Static reference data (banks, categories) and the idempotent demo seed."""

from datetime import timedelta

from sqlmodel import Session, select

from .models import Activation, Card, Merchant, Offer, Reward, User, now
from .security import luhn_complete, pan_token

# (code, bins, name_fa, name_en, color)
_BANKS = [
    ("melli", ["603799"], "بانک ملی ایران", "Bank Melli Iran", "#0f4c81"),
    ("sepah", ["589210"], "بانک سپه", "Bank Sepah", "#1b4f9c"),
    ("tejarat", ["627353", "585983"], "بانک تجارت", "Tejarat Bank", "#1c3f94"),
    ("mellat", ["610433", "991975"], "بانک ملت", "Bank Mellat", "#d71920"),
    ("parsian", ["622106", "639194", "627884"], "بانک پارسیان", "Parsian Bank", "#8b1d3d"),
    ("eghtesad_novin", ["627412"], "بانک اقتصاد نوین", "EN Bank", "#6a2c8e"),
    ("pasargad", ["502229", "639347"], "بانک پاسارگاد", "Bank Pasargad", "#c99a06"),
    ("saderat", ["603769"], "بانک صادرات ایران", "Bank Saderat Iran", "#0b3d91"),
    ("tosee_saderat", ["627648", "207177"], "بانک توسعه صادرات", "Export Development Bank", "#00753a"),
    ("saman", ["621986"], "بانک سامان", "Saman Bank", "#0090d0"),
    ("sina", ["639346"], "بانک سینا", "Sina Bank", "#0066b3"),
    ("karafarin", ["627488", "502910"], "بانک کارآفرین", "Karafarin Bank", "#4a8c2a"),
    ("keshavarzi", ["603770", "639217"], "بانک کشاورزی", "Bank Keshavarzi", "#00843d"),
    ("maskan", ["628023"], "بانک مسکن", "Bank Maskan", "#f58220"),
    ("sanat_madan", ["627961"], "بانک صنعت و معدن", "Bank of Industry and Mine", "#0d4f8b"),
    ("sarmayeh", ["639607"], "بانک سرمایه", "Sarmayeh Bank", "#9c7a3c"),
    ("shahr", ["502806", "504706"], "بانک شهر", "Shahr Bank", "#e30613"),
    ("day", ["502938"], "بانک دی", "Day Bank", "#00818a"),
    ("iran_zamin", ["505785"], "بانک ایران زمین", "Iran Zamin Bank", "#5b2c83"),
    ("mehr_iran", ["606373"], "بانک قرض‌الحسنه مهر ایران", "Gharzolhasane Mehr Iran Bank", "#2e9e47"),
    ("ghavamin", ["639599"], "بانک قوامین", "Ghavamin Bank", "#1f6f5f"),
    ("ansar", ["627381"], "بانک انصار", "Ansar Bank", "#1e7b34"),
    ("ayandeh", ["636214"], "بانک آینده", "Ayandeh Bank", "#6b2d7b"),
    ("refah", ["589463"], "بانک رفاه کارگران", "Refah Kargaran Bank", "#1d5aa6"),
    ("hekmat", ["636949"], "بانک حکمت ایرانیان", "Hekmat Iranian Bank", "#2a6f97"),
    ("gardeshgari", ["505416"], "بانک گردشگری", "Gardeshgari Bank", "#c8102e"),
    ("noor", ["507677"], "موسسه اعتباری نور", "Noor Credit Institution", "#d99a00"),
    ("melal", ["606256"], "موسسه اعتباری ملل", "Melal Credit Institution", "#0077a8"),
    ("resalat", ["504172"], "بانک قرض‌الحسنه رسالت", "Resalat Bank", "#00a651"),
    ("tosee_taavon", ["502908"], "بانک توسعه تعاون", "Tosee Taavon Bank", "#008b8b"),
    ("mehr_eghtesad", ["639370"], "بانک مهر اقتصاد", "Mehr Eghtesad Bank", "#3b8d3b"),
    ("post", ["627760"], "پست بانک ایران", "Post Bank of Iran", "#0a8f3c"),
]
BANKS = [dict(code=c, bins=b, name_fa=fa, name_en=en, color=col) for c, b, fa, en, col in _BANKS]
BANK_BY_BIN = {bin6: bank for bank in BANKS for bin6 in bank["bins"]}

CATEGORIES = [
    dict(slug=s, name_fa=fa, name_en=en, icon=i)
    for s, fa, en, i in [
        ("cafe", "کافه", "Cafés", "coffee"),
        ("restaurant", "رستوران", "Restaurants", "utensils"),
        ("supermarket", "سوپرمارکت", "Supermarkets", "cart"),
        ("fashion", "مد و پوشاک", "Fashion", "shirt"),
        ("beauty", "آرایشی و زیبایی", "Beauty", "sparkles"),
        ("pharmacy", "داروخانه", "Pharmacy", "pill"),
        ("services", "خدمات", "Services", "wrench"),
        ("online", "فروشگاه آنلاین", "Online", "globe"),
    ]
]

DEMO_PHONE = "09120000047"
DEMO_MERCHANT_ID = 1  # the merchant panel always operates on this one

# All fictional. Order matters: id 1 is the demo merchant.
MERCHANTS = [
    ("کافه نارنج", "Narenj Café", "cafe", "تهران", "Tehran", "#f97316", "☕"),
    ("کافه پاییز", "Paeez Café", "cafe", "کرج", "Karaj", "#a16207", "🥐"),
    ("رستوران شب‌بو", "Shabbou Restaurant", "restaurant", "اصفهان", "Isfahan", "#b91c1c", "🍲"),
    ("پیتزا تندیس", "Tandis Pizza", "restaurant", "تهران", "Tehran", "#ea580c", "🍕"),
    ("سوپرمارکت سپیدار", "Sepidar Market", "supermarket", "تهران", "Tehran", "#16a34a", "🛒"),
    ("هایپر کوهسار", "Kouhsar Hyper", "supermarket", "کرج", "Karaj", "#15803d", "🧺"),
    ("پوشاک آبان", "Aban Wear", "fashion", "کرج", "Karaj", "#7c3aed", "👕"),
    ("آرایشی ماه‌رخ", "Mahrokh Beauty", "beauty", "شیراز", "Shiraz", "#db2777", "💄"),
    ("داروخانه مهرگان", "Mehregan Pharmacy", "pharmacy", "مشهد", "Mashhad", "#0891b2", "💊"),
    ("کارواش براق", "Barragh Car Wash", "services", "تبریز", "Tabriz", "#2563eb", "🚗"),
    ("کتاب‌فروشی ورق", "Varagh Books", "online", "تهران", "Tehran", "#92400e", "📚"),
    ("بازارچه نیلوفر", "Niloufar Bazaar", "online", "اصفهان", "Isfahan", "#4f46e5", "📦"),
]

# (merchant_id, title_fa, title_en, desc_fa, desc_en, pct, max_reward, min_purchase,
#  channel, days_left, featured, budget, activations, redemptions)
OFFERS = [
    (1, "۱۵٪ بازگشت وجه صبحانه", "15% back on breakfast", "برای هر صبحانه در کافه نارنج، ۱۵٪ مبلغ به کیف پولتان برمی‌گردد.", "Get 15% of every breakfast at Narenj Café back in your wallet.", 15, 60_000, 150_000, "in_store", 30, True, 40_000_000, 2600, 310),
    (1, "۱۰٪ بازگشت وجه قهوه بیرون‌بر", "10% back on takeaway coffee", "قهوه بیرون‌بر بخرید و ۱۰٪ آن را پس بگیرید.", "Buy takeaway coffee and get 10% back.", 10, 30_000, 80_000, "both", 45, False, 20_000_000, 1900, 190),
    (1, "جشنواره تابستانی", "Summer festival", "کمپین تابستانی کافه نارنج.", "Narenj Café summer campaign.", 20, 80_000, 200_000, "in_store", -5, False, 15_000_000, 700, 64),
    (2, "۱۲٪ بازگشت وجه شیرینی و قهوه", "12% back on pastry & coffee", "هر روز هفته در کافه پاییز.", "Every day of the week at Paeez Café.", 12, 50_000, 100_000, "in_store", 40, False, 12_000_000, 820, 71),
    (3, "۲۰٪ بازگشت وجه شام آخر هفته", "20% back on weekend dinner", "پنجشنبه و جمعه شب در رستوران شب‌بو.", "Thursday and Friday nights at Shabbou Restaurant.", 20, 150_000, 500_000, "in_store", 25, True, 60_000_000, 1450, 132),
    (4, "۱۰٪ بازگشت وجه سفارش آنلاین پیتزا", "10% back on online pizza orders", "از سایت پیتزا تندیس سفارش دهید.", "Order from Tandis Pizza's website.", 10, 70_000, 300_000, "online", 35, False, 25_000_000, 1100, 98),
    (5, "۵٪ بازگشت وجه خرید ماهانه", "5% back on your monthly groceries", "خرید از سوپرمارکت سپیدار با هر کارت بانکی.", "Shop at Sepidar Market with any bank card.", 5, 200_000, 1_000_000, "both", 60, True, 120_000_000, 3900, 402),
    (6, "۷٪ بازگشت وجه خرید بالای یک میلیون", "7% back on baskets over 1M", "در هایپر کوهسار، برای سبدهای بالای یک میلیون تومان.", "At Kouhsar Hyper, for baskets over 1M Toman.", 7, 250_000, 1_000_000, "in_store", 50, False, 80_000_000, 1700, 145),
    (7, "۱۵٪ بازگشت وجه کلکسیون پاییزه", "15% back on the fall collection", "کلکسیون جدید پوشاک آبان.", "Aban Wear's new collection.", 15, 300_000, 1_500_000, "both", 30, True, 90_000_000, 980, 77),
    (8, "۱۰٪ بازگشت وجه محصولات مراقبت پوست", "10% back on skincare", "همه برندهای مراقبت پوست در آرایشی ماه‌رخ.", "All skincare brands at Mahrokh Beauty.", 10, 120_000, 400_000, "both", 28, False, 30_000_000, 640, 51),
    (9, "۸٪ بازگشت وجه محصولات بهداشتی", "8% back on health products", "به‌جز داروهای نسخه‌ای.", "Excludes prescription medicine.", 8, 80_000, 200_000, "in_store", 45, False, 18_000_000, 530, 49),
    (10, "۲۵٪ بازگشت وجه اولین کارواش", "25% back on your first wash", "کارواش براق، تبریز.", "Barragh Car Wash, Tabriz.", 25, 100_000, 250_000, "in_store", 20, True, 10_000_000, 410, 58),
    (11, "۱۲٪ بازگشت وجه خرید کتاب", "12% back on books", "خرید آنلاین از کتاب‌فروشی ورق.", "Buy online from Varagh Books.", 12, 90_000, 300_000, "online", 55, False, 15_000_000, 760, 88),
    (11, "۲۰٪ بازگشت وجه کتاب کودک", "20% back on children's books", "ویژه ماه مهر.", "Back-to-school special.", 20, 60_000, 200_000, "online", 15, False, 8_000_000, 330, 41),
    (12, "۱۰٪ بازگشت وجه صنایع دستی", "10% back on handicrafts", "بازارچه آنلاین نیلوفر.", "Niloufar Bazaar online.", 10, 150_000, 500_000, "online", 40, False, 20_000_000, 450, 36),
    (12, "۶٪ بازگشت وجه ارسال رایگان", "6% back + free shipping", "برای سفارش‌های بالای ۸۰۰ هزار تومان.", "For orders over 800K Toman.", 6, 100_000, 800_000, "online", 33, False, 12_000_000, 280, 19),
    (5, "۱۰٪ بازگشت وجه میوه و سبزی", "10% back on fruit & veg", "هر صبح تا ظهر در سوپرمارکت سپیدار.", "Mornings at Sepidar Market.", 10, 50_000, 200_000, "in_store", 21, False, 10_000_000, 900, 83),
]

# demo user's rewards: (offer index into OFFERS, purchase amount, days ago, pending)
DEMO_REWARDS = [
    (0, 380_000, 0.1, True),
    (4, 720_000, 0.6, True),
    (6, 2_400_000, 1.2, True),
    (0, 260_000, 3, False),
    (1, 150_000, 6, False),
    (6, 1_800_000, 9, False),
    (12, 520_000, 14, False),
    (4, 950_000, 21, False),
]


def demo_pans() -> list[str]:
    """Luhn-valid demo PANs on real BINs (Melli, Mellat)."""
    return [luhn_complete("603799" + "112204712"), luhn_complete("610433" + "905531186")]


def seed(session: Session) -> None:
    if session.exec(select(Merchant)).first():
        return
    t = now()
    session.add_all(
        Merchant(id=i, name_fa=fa, name_en=en, category=cat, city_fa=cfa, city_en=cen, color=col, emoji=emo)
        for i, (fa, en, cat, cfa, cen, col, emo) in enumerate(MERCHANTS, 1)
    )
    # ponytail: ends_at is fixed at seed time, so a months-old DB eventually expires; delete the DB to reseed.
    offers = [
        Offer(merchant_id=m, title_fa=tfa, title_en=ten, description_fa=dfa, description_en=den,
              cashback_percent=pct, max_reward=cap, min_purchase=minp, channel=ch,
              ends_at=t + timedelta(days=days), featured=feat, budget=budget,
              spent=red * cap // 3, activations=act, redemptions=red)
        for m, tfa, ten, dfa, den, pct, cap, minp, ch, days, feat, budget, act, red in OFFERS
    ]
    session.add_all(offers)
    user = User(phone=DEMO_PHONE, name="سارا", created_at=t - timedelta(days=40))
    session.add(user)
    session.flush()

    cards = [Card(user_id=user.id, token=pan_token(p), bin6=p[:6], last4=p[-4:], created_at=t - timedelta(days=40 - i))
             for i, p in enumerate(demo_pans())]
    session.add_all(cards)
    for idx in sorted({r[0] for r in DEMO_REWARDS} | {7, 9}):
        session.add(Activation(user_id=user.id, offer_id=offers[idx].id, created_at=t - timedelta(days=30)))
    for n, (idx, amount, days_ago, pending) in enumerate(DEMO_REWARDS):
        o = offers[idx]
        created = t - timedelta(days=days_ago)
        session.add(Reward(
            user_id=user.id, offer_id=o.id, merchant_id=o.merchant_id, card_last4=cards[n % 2].last4,
            amount=amount, reward=min(amount * o.cashback_percent // 100, o.max_reward), created_at=created,
            # seeded pending rewards wait on a (pretend) bank settlement; live ones settle after 30s
            settles_at=t + timedelta(days=2) if pending else created + timedelta(seconds=30),
        ))
    session.commit()
