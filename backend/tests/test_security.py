import time
from typing import Any

import jwt
import pytest

from app.core.config import get_settings
from app.core.errors import Unauthorized
from app.core.security import ACCESS, ALGORITHM, IAT_LEEWAY_SECONDS, decode_token


def token(**claims: Any) -> str:
    now = time.time()
    payload = {"sub": "user", "typ": ACCESS, "iat": now, "exp": now + 900, **claims}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=ALGORITHM)


def test_token_issued_slightly_in_the_future_is_accepted() -> None:
    # The issuing clock was ahead (or this one was stepped back) by a fraction of a second.
    payload = decode_token(get_settings(), token(iat=time.time() + 0.5), kind=ACCESS)
    assert payload["sub"] == "user"


def test_token_issued_beyond_the_leeway_is_rejected() -> None:
    future = time.time() + IAT_LEEWAY_SECONDS + 60
    with pytest.raises(Unauthorized) as exc:
        decode_token(get_settings(), token(iat=future, exp=future + 900), kind=ACCESS)
    assert exc.value.code == "UNAUTHORIZED"


def test_non_numeric_iat_is_rejected() -> None:
    with pytest.raises(Unauthorized) as exc:
        decode_token(get_settings(), token(iat="soon"), kind=ACCESS)
    assert exc.value.code == "UNAUTHORIZED"


def test_expiry_gets_no_leeway() -> None:
    now = time.time()
    with pytest.raises(Unauthorized) as exc:
        decode_token(get_settings(), token(iat=now - 905, exp=now - 5), kind=ACCESS)
    assert exc.value.code == "TOKEN_EXPIRED"
