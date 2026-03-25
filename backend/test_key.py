import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

async def test():
    print(f"Testing Tavily with key: {TAVILY_API_KEY[:5]}...")
    async with httpx.AsyncClient() as client:
        payload = {
            "api_key": TAVILY_API_KEY,
            "query": "stripe news 2026",
            "search_depth": "news",
            "max_results": 3
        }
        res = await client.post("https://api.tavily.com/search", json=payload, timeout=10.0)
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(test())
