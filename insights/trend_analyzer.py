import os
from google import genai
from models import SearchHistory, db

def generate_industry_trends(recent_companies=None):
    """
    Analyzes recent company searches to generate a generic AI trend summary.
    If no companies are provided, it attempts to fetch recent unique searches.
    """
    if not recent_companies:
        # Fetch the last 10 unique companies searched
        recent_searches = SearchHistory.query.order_by(SearchHistory.search_time.desc()).limit(20).all()
        recent_companies = list(set([s.company_name for s in recent_searches]))
        
    if not recent_companies:
        return {
            "title": "No Current Data",
            "insight": "Not enough search data to generate an industry trend."
        }
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "title": "API Configuration Error",
            "insight": "AI Trends cannot be generated without an API key."
        }
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
You are an expert market analyst. 
Based on the following recently searched companies in our competitive intelligence platform, identify a potential overarching technology or market trend they might share.

Companies: {', '.join(recent_companies)}

Write a very concise (2-3 sentences) trend insight. 
Example Format:
Title: AI Industry Trend Detected
Insight: Multiple companies including NVIDIA, OpenAI, and Meta have recently released updates related to generative AI infrastructure.

Return strictly in JSON format:
{{
    "title": "Short Trend Title",
    "insight": "2-3 sentence trend insight."
}}
DO NOT include markdown block wrappers.
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        response_text = response.text.strip()
        
        if response_text.startswith("```json"):
            response_text = response_text[7:-3].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:-3].strip()
            
        import json
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Error generating AI trend: {e}")
        return {
            "title": "Trend Processing Error",
            "insight": "Unable to analyze trends from recent companies at this time."
        }
