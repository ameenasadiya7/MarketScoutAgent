import os
from tavily import TavilyClient
from urllib.parse import urlparse

def get_search_queries(company_name):
    """Generate 5 targeted search queries for technical product updates."""
    return [
        f"{company_name} new product feature release",
        f"{company_name} AI model launch",
        f"{company_name} developer API update",
        f"{company_name} platform update announcement",
        f"{company_name} technology release"
    ]

def search_company_updates(company_name):
    """
    Search the web for recent company updates using Tavily API.
    Returns up to 5 unique URLs across different domains.
    """
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        raise ValueError("TAVILY_API_KEY environment variable not set.")
    
    tavily = TavilyClient(api_key=tavily_key)
    queries = get_search_queries(company_name)
    
    unique_domains = set()
    final_urls = []
    
    # We query each and gather unique domains
    # To reduce API calls and time, we stop once we find 5 unique URLs
    for query in queries:
        try:
            print(f"DEBUG: Tavily searching for: {query}")
            # We use search_depth="basic" for speed.
            response = tavily.search(query=query, search_depth="basic", max_results=3, include_raw_content=False)
            results = response.get("results", [])
            print(f"DEBUG: Tavily found {len(results)} results for query: {query}")
            
            for result in results:
                url = result.get("url")
                if not url:
                    continue
                
                domain = urlparse(url).netloc
                print(f"DEBUG: Checking domain {domain} from url {url}")
                # Simple exclusion of generic sites, though Tavily acts as a search engine
                if domain and domain not in unique_domains:
                    unique_domains.add(domain)
                    final_urls.append(url)
                    
                if len(final_urls) >= 5:
                    return final_urls
                    
        except Exception as e:
            print(f"Error searching for query '{query}': {e}")
            
    return final_urls[:5]
