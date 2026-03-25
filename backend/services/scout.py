import os
import json
import asyncio
import datetime
from datetime import timedelta
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

from utils.ai_summarizer import summarize_single

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")


async def get_competitor_updates_async(company_name: str, target_date: datetime.datetime) -> List[Dict[str, Any]]:
    """Fetch recent updates asynchronously using Tavily API."""
    if not TAVILY_API_KEY:
        print("ERROR: TAVILY_API_KEY not set")
        return []

    queries = [
        f"{company_name} news 2025 2026",
        f"{company_name} product launch technology update",
        f"{company_name} business expansion announcement",
    ]

    all_results = []

    async with httpx.AsyncClient() as client:
        tasks = [
            client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": q,
                    "search_depth": "advanced",
                    "include_images": False,
                    "max_results": 4,
                },
                timeout=30.0,
            )
            for q in queries
        ]

        responses = await asyncio.gather(*tasks, return_exceptions=True)
        for res in responses:
            if isinstance(res, Exception):
                print(f"Tavily task failed: {res}")
                continue
            if isinstance(res, httpx.Response) and res.status_code == 200:
                data = res.json()
                if "results" in data:
                    all_results.extend(data["results"])

    if not all_results:
        print(f"Tavily returned 0 results for {company_name}")
        return []

    # Deduplicate by url
    unique: dict = {}
    for r in all_results:
        url = r.get("url", "")
        if url and url not in unique:
            unique[url] = r

    final = list(unique.values())

    # Try strict 7-day filter first
    min_date = target_date - datetime.timedelta(days=7)
    filtered = []
    for r in final:
        pub_str = r.get("published_date")
        if pub_str:
            try:
                pub_dt = datetime.datetime.fromisoformat(pub_str.replace("Z", "+00:00")).replace(tzinfo=None)
                if min_date <= pub_dt <= target_date:
                    filtered.append(r)
            except Exception:
                filtered.append(r)  # keep if date unreadable
        else:
            filtered.append(r)  # keep if no date

    # Fallback: if 7-day filter removes everything, return most recent raw results
    result_list = filtered if filtered else final
    print(f"Tavily: {len(all_results)} raw -> {len(result_list)} after filter for {company_name}")
    return result_list[:5]


def _build_fallback(company_name: str, update: dict) -> dict:
    """Build a clean structured result from raw Tavily data without AI."""
    title = update.get("title") or f"{company_name} Update"
    content = update.get("content") or update.get("snippet") or ""
    url = update.get("url", "")

    # Simple heuristic tag
    content_lower = (title + " " + content).lower()
    if any(k in content_lower for k in ["ai", "artificial", "machine learning", "gpt", "llm"]):
        tag = "AI"
    elif any(k in content_lower for k in ["cloud", "aws", "azure", "gcp"]):
        tag = "Cloud"
    elif any(k in content_lower for k in ["launch", "product", "release", "feature"]):
        tag = "Product"
    elif any(k in content_lower for k in ["security", "breach", "vulnerability", "cyberattack"]):
        tag = "Security"
    else:
        tag = "Business"

    # Split content into 2 summary bullets
    sentences = [s.strip() for s in content.replace("\n", " ").split(".") if len(s.strip()) > 20]
    summary = sentences[:3] if sentences else [content[:200]] if content else ["No summary available."]
    key_points = sentences[3:6] if len(sentences) > 3 else summary[:2]

    return {
        "title": title[:150],
        "summary": summary,
        "key_points": key_points,
        "source_url": url,
        "tag": tag,
    }


async def summarize_updates_strict_json(
    company_name: str, update: dict, retries: int = 1
) -> Optional[dict]:
    """Use Gemini to extract intelligence. Falls back to raw data if Gemini is unavailable."""

    # Use shared robust AI summarizer
    return await summarize_single(company_name, update)

    # --- FALLBACK: Use raw Tavily data directly ---
    print(f"Using Tavily fallback for: {update.get('title', 'Unknown')}")
    return _build_fallback(company_name, update)
