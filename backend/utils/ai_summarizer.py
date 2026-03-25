import os
import json
import asyncio
import datetime
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEFAULT_MODEL = "gemini-2.5-flash" # Use 2.5-flash as found in list_models

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

async def call_gemini_with_retry(prompt: str, response_mime_type: str = "application/json", retries: int = 2) -> Optional[str]:
    """Call Gemini with exponential backoff for 429 errors."""
    if not GEMINI_API_KEY:
        return None

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    model = genai.GenerativeModel(model_name)
    config = GenerationConfig(response_mime_type=response_mime_type)

    for attempt in range(retries + 1):
        try:
            response = await model.generate_content_async(prompt, generation_config=config)
            if response and response.text:
                return response.text
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str:
                wait_time = (2 ** attempt) * 10 # 10s, 20s, 40s...
                print(f"[AI] Quota hit. Attempt {attempt+1}/{retries+1}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"[AI] Gemini error: {type(e).__name__}: {str(e)[:200]}")
                break # Non-quota errors don't benefit much from simple retries here

    return None

def get_fallback_single(company_name: str, raw_data: dict) -> dict:
    """Simple rule-based summary fallback for a single article."""
    title = raw_data.get("title") or f"{company_name} Update"
    content = raw_data.get("content") or raw_data.get("snippet") or ""
    url = raw_data.get("url", "")

    # Heuristic tagging
    content_lower = (title + " " + content).lower()
    if any(k in content_lower for k in ["ai", "gpt", "model", "intelligence"]): tag = "AI"
    elif any(k in content_lower for k in ["cloud", "server", "infra"]): tag = "Cloud"
    elif any(k in content_lower for k in ["launch", "product", "feature"]): tag = "Product"
    elif any(k in content_lower for k in ["secure", "security", "hack", "patch", "breach"]): tag = "Security"
    else: tag = "Business"

    sentences = [s.strip() for s in content.replace("\n", " ").split(".") if len(s.strip()) > 30]
    summary = sentences[:2] if sentences else [content[:200]]
    key_points = sentences[2:4] if len(sentences) > 2 else summary

    return {
        "title": title[:100],
        "summary": summary,
        "key_points": key_points,
        "source_url": url,
        "tag": tag
    }

def get_fallback_batch(company_name: str, results: List[dict]) -> dict:
    """Generate a truthful batch response from raw results without AI."""
    updates = []
    for r in results[:5]:
        fb = get_fallback_single(company_name, r)
        updates.append({
            "title": fb["title"],
            "category": fb["tag"],
            "summary": ". ".join(fb["summary"]),
            "significance": "Medium",
            "source_url": fb["source_url"],
            "source_name": "Web Source",
            "published_date": r.get("published_date") or "Recent"
        })

    # Rule-based but grounded summary
    exec_sum = "No strategic AI summary available."
    if updates:
        top_titles = [u["title"] for u in updates[:2]]
        exec_sum = f"Recent updates for {company_name} include: " + " and ".join(top_titles) + ". (Limited information available for this period)."

    return {
        "result_mode": "fallback_all",
        "company": company_name,
        "period": "Recent",
        "executive_summary": exec_sum,
        "updates": updates,
        "technical_trends": [{"trend": "Market Activity", "description": "News signals suggest recent developments in the company's ecosystem.", "adoption_signal": "Growing"}],
        "competitive_takeaway": f"Monitor {company_name} closely for further developments related to these updates."
    }

async def summarize_batch(company_name: str, articles: List[dict], user_prompt_suffix: str = "") -> dict:
    """Summarize multiple articles using Gemini with fallback."""
    if not articles:
        return get_fallback_batch(company_name, [])

    articles_text = "\n\n".join([
        f"Title: {r.get('title', '')}\nURL: {r.get('url', '')}\nContent: {r.get('content', '')[:1000]}"
        for r in articles
    ])

    prompt = f"""Analyze these articles about '{company_name}' and return a structured JSON response.
    Return ONLY valid JSON.
    
    ### STRICT RULES:
    1. ONLY use information from the articles provided below.
    2. If an article does not contain specific facts, do NOT invent them.
    3. Do NOT write generic summaries like 'latest updates based on search results' — if you cannot extract real facts, say 'Limited information available for this period.'
    4. Every update in the updates array MUST reference a real article from the list provided. Never create fictional updates.
    5. The executive_summary must contain SPECIFIC facts (company names, numbers, dates, product names) from the articles. A vague summary means you failed this task.
    
    ### CRITICAL INSTRUCTIONS FOR JUDGE-READY INTELLIGENCE:
    1. **ROLE SEPARATION (CRITICAL)**:
       - **Executive Summary**: This is your "AI Strategic Insight". It MUST NOT repeat the "Latest Updates" feed. 
       - Focus on high-level strategy, emerging trends, risks, and market direction.
       - If you see conflicting signals (e.g., strong growth vs. regulatory issues), you MUST call them out: "The company shows growth, but faces headwinds..."
       - Answer: What happened? Why it matters? What should competitors do next?
       - **NEVER** start the summary with the same sentence as any update title or summary.
    
    2. **UPDATES FEED**:
       - Each entry must be a SINGLE specific event.
       - Avoid repeating strategic language from the executive summary.
       - NO repetition across updates.
    
    3. **ANTI-DUPLICATION**:
       - Ensure the executive summary provides broader context rather than just summarizing the first 3 articles.
    
    Schema:
    {{
      "company": "{company_name}",
      "period": "Set 'period' to the EXACT date range of articles you received. Format: 'March 17–24, 2026'. If all articles lack dates, use 'March 2026 (Recent)'. Never show just a month name without a day range.",
      "executive_summary": "3-4 sentence strategic overview answering what, why, and next steps for competitors.",
      "updates": [
        {{
          "title": "Specific Event Headline",
          "category": "Product Launch | Funding | Partnership | Leadership | Regulatory | Market Expansion | Tech Release | Other",
          "summary": "2-3 sentences explaining exactly what happened.",
          "significance": "High | Medium | Low",
          "source_url": "extract from input",
          "source_name": "extract publication name",
          "published_date": "extract or 'Recent' if missing"
        }}
      ],
      "technical_trends": [
        {{ "trend": "name", "description": "concise trend analysis", "adoption_signal": "Early | Growing | Mainstream" }}
      ],
      "competitive_takeaway": "Actionable recommendation for competitors."
    }}

    Articles:
    {articles_text}

    {user_prompt_suffix}
    """

    res_text = await call_gemini_with_retry(prompt)
    if res_text:
        try:
            # Clean up potential markdown fences
            json_str = res_text.strip()
            if json_str.startswith("```json"): json_str = json_str[7:]
            if json_str.endswith("```"): json_str = json_str[:-3]
            data = json.loads(json_str.strip())
            
            # Basic validation
            if "updates" in data and isinstance(data["updates"], list):
                return data
        except Exception as e:
            print(f"[AI] Failed to parse Gemini response: {e}")

    print(f"[AI] Falling back to rule-based summary for {company_name}")
    return get_fallback_batch(company_name, articles)

async def summarize_single(company_name: str, update: dict) -> dict:
    """Summarize a single article using Gemini with fallback."""
    prompt = f"""Analyze this article about '{company_name}' and return ONLY a valid JSON object.
    
    Article Title: {update.get('title', '')}
    URL: {update.get('url', '')}
    Content: {(update.get('content') or '')[:1500]}
    
    Schema:
    {{
      "title": "concise title",
      "summary": ["bullet 1", "bullet 2"],
      "key_points": ["point 1", "point 2"],
      "source_url": "{update.get('url', '')}",
      "tag": "AI | Cloud | Product | Business | Security"
    }}"""

    res_text = await call_gemini_with_retry(prompt)
    if res_text:
        try:
            json_str = res_text.strip()
            if json_str.startswith("```json"): json_str = json_str[7:]
            if json_str.endswith("```"): json_str = json_str[:-3]
            data = json.loads(json_str.strip())
            
            required = ["title", "summary", "key_points", "source_url", "tag"]
            if all(k in data for k in required):
                return data
        except Exception as e:
            print(f"[AI] Failed to parse single Gemini response: {e}")

    return get_fallback_single(company_name, update)
