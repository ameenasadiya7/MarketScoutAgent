import asyncio
import os
import httpx
import json
import datetime

from dotenv import load_dotenv
load_dotenv()

async def test_execute():
    company = "Stripe"
    target_date_str = "2026-03-23"
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

    async def search_tavily(company: str, target_date: str):
        from datetime import timedelta
        try:
            end = datetime.datetime.fromisoformat(target_date)
        except ValueError:
            end = datetime.datetime.utcnow()
        start = end - datetime.timedelta(days=7)
        month_year = end.strftime("%B %Y")
        
        payload = {
            "api_key": TAVILY_API_KEY,
            "query": f"{company} news updates {month_year}",
            "search_depth": "basic",
            "max_results": 10,
            "include_answer": False,
            "include_raw_content": False,
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post("https://api.tavily.com/search", json=payload)
            resp.raise_for_status()
            raw = resp.json().get("results", [])
            print(f"[TAVILY] Got {len(raw)} results for '{company}'")
            return raw

    try:
        raw_results = await search_tavily(company, target_date_str)
    except Exception as e:
        print("Tavily search failed", e)
        return

    def smart_filter(results, target_date):
        from dateutil import parser as dp
        from datetime import timedelta
        try:
            end_dt = datetime.datetime.fromisoformat(target_date)
        except ValueError:
            end_dt = datetime.datetime.utcnow()
        start_dt = end_dt - datetime.timedelta(days=7)

        def parse_dt(r):
            raw = r.get("published_date") or r.get("publishedDate") or ""
            try:
                dt = dp.parse(str(raw), ignoretz=True) if raw else None
                if dt and hasattr(dt, 'date'):
                    return datetime.datetime.combine(dt.date(), datetime.time.min)
                return dt
            except:
                return None

        for r in results:
            r["_dt"] = parse_dt(r)

        tier1 = [r for r in results if r["_dt"] and start_dt <= r["_dt"] <= end_dt]
        if len(tier1) >= 1:
            return tier1, "in_range", start_dt, end_dt

        fallback_30 = end_dt - datetime.timedelta(days=30)
        tier2 = [r for r in results if r["_dt"] and r["_dt"] >= fallback_30]
        if len(tier2) >= 1:
            tier2.sort(key=lambda x: x["_dt"], reverse=True)
            return tier2, "fallback_30", fallback_30, end_dt

        dated = sorted([r for r in results if r["_dt"]], 
                       key=lambda x: x["_dt"], reverse=True)
        undated = [r for r in results if not r["_dt"]]
        tier3 = dated + undated
        if tier3:
            return tier3, "fallback_all", None, end_dt

        return [], "no_results", None, end_dt

    filtered_results, mode, range_start, range_end = smart_filter(raw_results, target_date_str)

    from datetime import timedelta
    try:
        req_end = datetime.datetime.fromisoformat(target_date_str)
    except ValueError:
        req_end = datetime.datetime.utcnow()
    req_start = req_end - datetime.timedelta(days=7)
    requested_from = req_start.strftime("%Y-%m-%d")
    requested_to = req_end.strftime("%Y-%m-%d")

    print("len raw_results:", len(raw_results))
    print("mode:", mode)
    print("requested_from:", requested_from)

if __name__ == "__main__":
    asyncio.run(test_execute())
