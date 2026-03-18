import os
import json
from google import genai

def summarize_article(company_name, text, source_url):
    """
    Summarize the article as a technical product update using Google Gemini API.
    Enforces strict formatting and prevents hallucination.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
Analyze the following article text about '{company_name}'.
Summarize the article as a technical product update.

Return JSON format strictly:
{{
  "title": "Short title of feature release",
  "summary": "2-3 sentence explanation of the feature",
  "technical_impact": "Why the update matters technically",
  "date": "Publication date in YYYY-MM-DD or standard format"
}}

Rules:
1. ONLY summarize real technical feature launches or technology updates.
2. DO NOT invent or hallucinate information. Ignore financial or stock updates.
3. If no feature release exists in the text, return exactly {{"error": "No feature release"}} or null values.
4. Output must be raw valid JSON without markdown codeblock wrapping if possible.

Article Text:
{text[:15000]}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        response_text = response.text.strip()
        print(f"DEBUG: Gemini raw response for {source_url}:\n{response_text}")
        
        # Clean markdown codeblock formatting if Gemini includes it
        if response_text.startswith("```json"):
            response_text = response_text[7:-3].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:-3].strip()
            
        data = json.loads(response_text)
        
        # Validation checks
        if "error" in data or not data.get("title"):
            print(f"DEBUG: Gemini returns error or missing title: {data}")
            return None
            
        if str(data.get("title")).lower() == "null":
            print(f"DEBUG: Gemini title is null: {data}")
            return None
            
        # Add the source link manually
        data["source"] = source_url
        return data
        
    except json.JSONDecodeError as e:
        print(f"DEBUG: Failed to parse JSON from Gemini for {source_url}: {e}")
    except Exception as e:
        print(f"DEBUG: Error summarizing {source_url} with API: {e}")
        
    # FALLBACK if API fails
    print(f"DEBUG: Using fallback summarizer for {source_url}")
    import re
    sentences = re.split(r'(?<=[.!?]) +', text.replace('\n', ' '))
    fallback_summary = " ".join(sentences[:3]) if sentences else text[:300]
    return {
        "title": f"{company_name} Update",
        "summary": fallback_summary[:300] + "...",
        "technical_impact": "Could not determine technical impact due to AI service error.",
        "date": None,
        "source": source_url
    }
