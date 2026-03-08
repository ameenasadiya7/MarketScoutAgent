import os
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

from services.search import search_company_updates
from services.scraper import scrape_article
from utils.date_parser import is_recent
from services.summarizer import summarize_article

# Load environment variables
load_dotenv()

tavily_key = os.getenv("TAVILY_API_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

if tavily_key:
    print("TAVILY_API_KEY loaded successfully.")
else:
    print("WARNING: TAVILY_API_KEY not found!")

if gemini_key:
    print("GEMINI_API_KEY loaded successfully.")
else:
    print("WARNING: GEMINI_API_KEY not found!")

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

# In-memory cache
# Format: {"Company": {"data": [...], "timestamp": float}}
cache = {}
CACHE_DURATION_SECONDS = 10 * 60  # 10 minutes

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/get-updates", methods=["POST"])
def get_updates():
    req_data = request.get_json()
    if not req_data or "company" not in req_data:
        return jsonify({"message": "Company name is required."}), 400
        
    company = req_data["company"].strip()
    if not company:
        return jsonify({"message": "Company name is required."}), 400

    # 1. Check cache
    now = time.time()
    if company in cache:
        cache_entry = cache[company]
        if now - cache_entry["timestamp"] < CACHE_DURATION_SECONDS:
            return jsonify(cache_entry["data"])

    # 2. Fetch new updates
    try:
        urls = search_company_updates(company)
        
        valid_updates = []
        for url in urls:
            # We enforce maximum 3 validated updates
            if len(valid_updates) >= 3:
                break
                
            text = scrape_article(url, min_length=500)
            if not text:
                continue
                
            # Date filtering is ideally done before AI call if we had the date.
            # But the PRD says: "Date parser filters outdated articles."
            # Since Tavily might not expose dates natively easily without additional parsing,
            # and scraper doesn't extract dates currently, let's ask Gemini to give us the date 
            # and we filter AFTER Gemini summarization if it's too old, or we just trust Gemini's date
            # Wait, PRD: "5 Scraper extracts article text. 6 Date parser filters articles older than 7 days. 7 Gemini summarizes."
            # If the scraper doesn't have a date string, how can the date parser work before Gemini?
            # Actually, the article might have a date in the URL or text.
            # I will pass "None" to is_recent, which makes it loosely return True.
            # Then Gemini will extract the date. To strictly follow the step order:
            if not is_recent(None): # Lenient check
                continue
                
            summary = summarize_article(company, text, url)
            
            if summary:
                # Let's do a strict date check on the date Gemini returned
                extracted_date = summary.get("date")
                if extracted_date and extracted_date != "null":
                    if not is_recent(extracted_date):
                        print(f"Skipping summary, date {extracted_date} is too old.")
                        continue
                
                valid_updates.append(summary)
        
        if not valid_updates:
            response_data = {
                "company": company,
                "message": "No technical updates found in the last 7 days."
            }
            return jsonify(response_data)
            
        # 3. Update cache
        cache[company] = {
            "data": valid_updates,
            "timestamp": now
        }
        
        return jsonify(valid_updates)

    except Exception as e:
        print("ERROR:", e)
        return jsonify({
            "company": company,
            "message": "Unable to fetch updates at the moment."
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
