import asyncio
import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from services.scout import get_competitor_updates_async, summarize_updates_strict_json

async def test():
    print("Testing Tavily...")
    target = datetime.utcnow()
    raw = await get_competitor_updates_async("OpenAI", target)
    print(f"Tavily returned {len(raw)} raw results.")
    if len(raw) == 0:
        print("Tavily failed or returned 0.")
        return
    
    print("Testing Gemini...")
    for idx, r in enumerate(raw[:2]):
        print(f"Item {idx}: url={r.get('url')}")
        result = await summarize_updates_strict_json("OpenAI", r)
        print(f"Gemini result {idx}:", result)

if __name__ == "__main__":
    asyncio.run(test())
