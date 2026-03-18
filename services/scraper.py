import requests
from bs4 import BeautifulSoup
import re

def scrape_article(url, min_length=500):
    """
    Scrapes the text content from a given URL.
    Returns the cleaned text if it meets the minimum length requirement, otherwise None.
    """
    try:
        # User-Agent to prevent basic blocking
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        # 10s timeout to avoid hanging on slow sites
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove noisy elements
        for script in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            script.decompose()
            
        text = soup.get_text(separator=' ')
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Enforce minimum article length requirement
        if len(text) < min_length:
            print(f"DEBUG: Article at {url} is too short ({len(text)} chars). Minimum {min_length} required. Ignored.")
            return None
            
        print(f"DEBUG: Successfully scraped {len(text)} chars from {url}")
        return text
    except requests.exceptions.Timeout:
        print(f"Timeout while scraping {url}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request error scraping {url}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error scraping {url}: {e}")
        return None
