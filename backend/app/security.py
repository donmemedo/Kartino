import hashlib
import hmac
import os
import time

SECRET = os.environ.get("CARDBACK_SECRET", "cardback-dev-secret-change-me").encode()
TOKEN_TTL = 30 * 24 * 3600


def _hmac(msg: str) -> str:
    return hmac.new(SECRET, msg.encode(), hashlib.sha256).hexdigest()


def make_token(user_id: int) -> str:
    msg = f"{user_id}.{int(time.time()) + TOKEN_TTL}"
    return f"{msg}.{_hmac(msg)}"


def read_token(token: str) -> int | None:
    try:
        uid, exp, sig = token.split(".")
        if hmac.compare_digest(sig, _hmac(f"{uid}.{exp}")) and int(exp) > time.time():
            return int(uid)
    except (ValueError, TypeError):  # malformed / non-ASCII token
        pass
    return None


def pan_token(pan: str) -> str:
    """The only thing stored about a PAN besides bin6/last4."""
    return _hmac(pan)


def luhn_ok(pan: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(pan)):
        n = int(ch) * (2 if i % 2 else 1)
        total += n - 9 if n > 9 else n
    return total % 10 == 0


def luhn_complete(prefix15: str) -> str:
    return next(prefix15 + d for d in "0123456789" if luhn_ok(prefix15 + d))


if __name__ == "__main__":
    assert luhn_ok("4111111111111111") and not luhn_ok("4111111111111112")
    assert luhn_ok(luhn_complete("603799123456789"))
    assert read_token(make_token(7)) == 7 and read_token("7.9999999999.bad") is None
    assert read_token("7.9999999999.\u06f1") is None
    print("ok")
