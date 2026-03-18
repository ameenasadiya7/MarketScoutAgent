import os
from dotenv import load_dotenv

load_dotenv()

from services.search import search_company_updates
from services.scraper import scrape_article
from services.summarizer import summarize_article
from utils.date_parser import is_recent

company = "Anthropic"
print("=== DEBUG START ===")
urls = search_company_updates(company)
print(f"=== URLs found: {urls} ===")

valid = []
for url in urls:
    text = scrape_article(url, min_length=500)
    if not text:
        print(f"=== Scrape failed for {url} ===")
        continue
    
    if not is_recent(None):
        print("=== Lenient is_recent failed ===")
        continue
        
    summary = summarize_article(company, text, url)
    print(f"=== Summary: {summary} ===")
    if summary:
        date = summary.get("date")
        print(f"=== Extracted date: {date} ===")
        if date and date != "null":
            recent = is_recent(date)
            print(f"=== is_recent strictly: {recent} ===")
            if recent:
                valid.append(summary)
        else:
            valid.append(summary)

print(f"=== FINAL VALID UPDATES: {len(valid)} ===")
