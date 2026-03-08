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
  "feature_update": "Short title of feature release",
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
        
        # Clean markdown codeblock formatting if Gemini includes it
        if response_text.startswith("```json"):
            response_text = response_text[7:-3].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:-3].strip()
            
        data = json.loads(response_text)
        
        # Validation checks
        if "error" in data or not data.get("feature_update"):
            return None
            
        if str(data.get("feature_update")).lower() == "null":
            return None
            
        # Add the source link manually
        data["source"] = source_url
        return data
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON from Gemini for {source_url}: {e}")
        return None
    except Exception as e:
        print(f"Error summarizing {source_url} with API: {e}")
        return None
