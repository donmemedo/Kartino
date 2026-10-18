# کارت‌بک · CardBack

Card-linked cashback for Iran — the Birdback model on Shetab cards. Customers link an existing bank card, activate offers, pay as usual, and cashback lands in their wallet. Merchants run pay-per-performance campaigns and see attributed sales, redemption rate, ROI and CAC.

- `backend/` — FastAPI + SQLModel (SQLite). Cards are stored as an HMAC token + last 4 digits only.
- `frontend/` — Next.js 16, Tailwind v4, Motion. Persian (RTL, default) / English, light / dark / system.

## Run with Docker

```bash
docker compose up --build
```

- App: http://localhost:3470
- API docs: http://localhost:8470/docs

## Run locally

```bash
# backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
.venv/bin/uvicorn app.main:app --port 8470

# frontend (proxies /api to http://localhost:8470)
cd frontend && npm install && npm run build && npm start   # http://localhost:3470
```

## Demo

- On the login page press «ورود با حساب نمایشی» / "Explore with demo account" (preloaded cards, offers, rewards).
- Or use any `09xxxxxxxxx` number — the OTP is shown on screen (demo mode, no SMS is sent).
- Wallet → «پرداخت آزمایشی» simulates a card purchase and runs the offer-matching engine.
- `/merchant` is the merchant dashboard (demo merchant «کافه نارنج»).

## Next steps

PWA (service worker on top of the existing manifest), then APK/IPA via a native wrapper (e.g. Capacitor).
