import httpx
from config import AI_API_KEY, AI_BASE_URL, AI_MODEL


async def chat_completion(messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096) -> str:
    """Call DeepSeek API (OpenAI-compatible)"""
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": AI_MODEL,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": messages,
    }
    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(
            f"{AI_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def generate_with_system_prompt(system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
    """Generate with system + user prompt"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    return await chat_completion(messages, temperature=temperature)


async def count_tokens(text: str) -> int:
    """Rough token count estimation"""
    return len(text) // 2
