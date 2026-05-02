import os
import random
import httpx

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Fast model — used for role suggestion (card titles + preview scores only)
GROQ_MODEL_FAST = "llama-3.1-8b-instant"

# Quality model — used for deep role analysis (evidence, improvements, roadmap)
GROQ_MODEL_QUALITY = "llama-3.3-70b-versatile"

# Keep GROQ_MODEL as alias so any other callers don't break
GROQ_MODEL = GROQ_MODEL_QUALITY


def _load_keys() -> list[str]:
    multi = os.getenv("GROQ_API_KEYS", "")
    if multi:
        keys = [k.strip() for k in multi.split(",") if k.strip()]
        if keys:
            return keys
    single = os.getenv("GROQ_API_KEY", "").strip()
    if single:
        return [single]
    return []


def has_keys() -> bool:
    return bool(_load_keys())


def _rotated_keys() -> list[str]:
    keys = _load_keys()
    if not keys:
        return keys
    start = random.randint(0, len(keys) - 1)
    return keys[start:] + keys[:start]


def groq_chat_sync(payload: dict, timeout: float = 60.0) -> dict:
    keys = _rotated_keys()
    if not keys:
        raise RuntimeError("No Groq API keys configured.")
    for key in keys:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {key}"},
                json=payload,
            )
            if resp.status_code in (429, 403):
                continue
            resp.raise_for_status()
            return resp.json()
    raise RuntimeError("All Groq API keys exhausted (rate limited). Try again later.")


async def groq_chat_async(payload: dict, timeout: float = 60.0) -> dict:
    keys = _rotated_keys()
    if not keys:
        raise RuntimeError("No Groq API keys configured.")
    async with httpx.AsyncClient(timeout=timeout) as client:
        for key in keys:
            resp = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {key}"},
                json=payload,
            )
            if resp.status_code in (429, 403):
                continue
            resp.raise_for_status()
            return resp.json()
    raise RuntimeError("All Groq API keys exhausted (rate limited). Try again later.")
