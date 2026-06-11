"""
LLM Router — Priority: Ollama (local) → Groq → Gemini Flash
- Ollama is zero-cost, zero-latency, runs on your Mac
- Groq is free tier: 1,000 req/day on Llama-3
- Gemini is free tier: ~1,500 req/day on Flash
All fallbacks are transparent — caller doesn't care which model ran.
"""
import os
import json
import asyncio
import httpx
import datetime
import google.generativeai as genai
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

# ── Client initialization ───────────────────────────────────────────────────
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY   = os.getenv("GROQ_API_KEY", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")  # or phi3, mistral, etc.

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

_groq_client: AsyncGroq | None = AsyncGroq(api_key=GROQ_KEY) if GROQ_KEY else None

# ── Ollama health (checked once per process, cached) ────────────────────────
_ollama_available: bool | None = None

async def _check_ollama() -> bool:
    global _ollama_available
    if _ollama_available is not None:
        return _ollama_available
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            _ollama_available = resp.status_code == 200
    except Exception:
        _ollama_available = False
    status = "✅ available" if _ollama_available else "❌ not running"
    print(f"[LLM Router] Ollama {status} at {OLLAMA_URL}")
    return _ollama_available


# ── Quota tracking (Redis-backed, falls back to in-memory) ──────────────────
_in_memory_counts: dict[str, int] = {"gemini": 0, "groq": 0}

async def _get_count(key: str, redis_client) -> int:
    try:
        val = await redis_client.get(f"llm_quota:{key}")
        return int(val) if val else 0
    except Exception:
        return _in_memory_counts.get(key, 0)

async def _increment_count(key: str, redis_client):
    _in_memory_counts[key] = _in_memory_counts.get(key, 0) + 1
    try:
        now = datetime.datetime.now()
        midnight = datetime.datetime(now.year, now.month, now.day) + datetime.timedelta(days=1)
        ttl = int((midnight - now).total_seconds())
        pipe = redis_client.pipeline()
        pipe.incr(f"llm_quota:{key}")
        pipe.expire(f"llm_quota:{key}", ttl)
        await pipe.execute()
    except Exception:
        pass


# ── Provider implementations ─────────────────────────────────────────────────

async def _call_ollama(prompt: str, system: str, max_tokens: int, json_mode: bool) -> str:
    """Call local Ollama — completely free, no rate limits."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        "stream": False,
        "options": {"num_predict": max_tokens, "temperature": 0.0},
    }
    if json_mode:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["message"]["content"]


async def _call_groq(prompt: str, system: str, max_tokens: int,
                     json_mode: bool, redis_client) -> str:
    """Call Groq Llama-3 — free tier 1,000 req/day."""
    if not _groq_client:
        raise RuntimeError("Groq API key not configured")

    count = await _get_count("groq", redis_client)
    if count >= 950:  # keep 50 calls in reserve for coach
        raise RuntimeError("Groq daily quota approaching limit")

    messages = [
        {"role": "system", "content": system},
        {"role": "user",   "content": prompt},
    ]
    kwargs: dict = {"model": "llama-3.3-70b-versatile", "messages": messages, "max_tokens": max_tokens, "temperature": 0.0}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp = await _groq_client.chat.completions.create(**kwargs)
    await _increment_count("groq", redis_client)
    return resp.choices[0].message.content


async def _call_gemini(prompt: str, system: str, max_tokens: int,
                       json_mode: bool, redis_client) -> str:
    """Call Gemini 2.0 Flash — free tier ~1,500 req/day."""
    if not GEMINI_KEY:
        raise RuntimeError("Gemini API key not configured")

    count = await _get_count("gemini", redis_client)
    if count >= 1400:
        raise RuntimeError("Gemini daily quota approaching limit")

    model = genai.GenerativeModel("gemini-2.0-flash", system_instruction=system)
    config = genai.GenerationConfig(
        max_output_tokens=max_tokens,
        temperature=0.0,
        response_mime_type="application/json" if json_mode else "text/plain",
    )
    response = await asyncio.to_thread(model.generate_content, prompt, generation_config=config)
    await _increment_count("gemini", redis_client)
    return response.text


# ── Public interface ─────────────────────────────────────────────────────────

async def call_llm(
    prompt: str,
    system: str,
    redis_client,
    max_tokens: int = 500,
    json_mode: bool = True,
) -> str:
    """
    Smart LLM router with transparent fallback chain:
      1. Ollama (local llama3) — zero cost, zero latency
      2. Groq (cloud llama3)   — free tier, 1k req/day
      3. Gemini Flash           — free tier, 1.5k req/day

    Returns the raw text response from whichever provider succeeds.
    Raises RuntimeError only if ALL three fail.
    """
    errors: list[str] = []

    # ── Priority 1: Ollama (local, always preferred) ─────────────────────────
    if await _check_ollama():
        try:
            result = await _call_ollama(prompt, system, max_tokens, json_mode)
            print("[LLM Router] ✅ Responded via Ollama (local)")
            return result
        except Exception as e:
            errors.append(f"Ollama: {e}")
            print(f"[LLM Router] Ollama failed: {e} — trying Groq")

    # ── Priority 2: Groq ─────────────────────────────────────────────────────
    if GROQ_KEY:
        try:
            result = await _call_groq(prompt, system, max_tokens, json_mode, redis_client)
            print("[LLM Router] ✅ Responded via Groq")
            return result
        except Exception as e:
            errors.append(f"Groq: {e}")
            print(f"[LLM Router] Groq failed: {e} — trying Gemini")

    # ── Priority 3: Gemini ───────────────────────────────────────────────────
    if GEMINI_KEY:
        try:
            result = await _call_gemini(prompt, system, max_tokens, json_mode, redis_client)
            print("[LLM Router] ✅ Responded via Gemini")
            return result
        except Exception as e:
            errors.append(f"Gemini: {e}")
            print(f"[LLM Router] Gemini failed: {e}")

    raise RuntimeError(f"All LLM providers failed: {'; '.join(errors)}")


async def get_router_status(redis_client) -> dict:
    """Returns the current health/quota status of all providers."""
    ollama_ok = await _check_ollama()
    gemini_count = await _get_count("gemini", redis_client)
    groq_count   = await _get_count("groq", redis_client)
    return {
        "ollama":  {"available": ollama_ok, "model": OLLAMA_MODEL, "cost": "FREE (local)"},
        "groq":    {"available": bool(GROQ_KEY), "daily_used": groq_count, "daily_limit": 1000, "cost": "FREE"},
        "gemini":  {"available": bool(GEMINI_KEY), "daily_used": gemini_count, "daily_limit": 1500, "cost": "FREE"},
        "active_provider": "ollama" if ollama_ok else ("groq" if GROQ_KEY else "gemini"),
    }
