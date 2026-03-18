from dateutil import parser
from datetime import datetime, timezone, timedelta

def is_recent(date_string, max_days=7):
    """
    Parses a date string and checks if it falls within the last `max_days`.
    If parsing fails or date string is absent, it returns True (lenient approach)
    since Tavily already tries to fetch recent content and some articles hide dates.
    """
    if not date_string:
        return True
        
    try:
        # fuzzy=True enables parsing within text
        parsed_date = parser.parse(date_string, fuzzy=True)
        
        # Make timezone aware if naive
        if parsed_date.tzinfo is None:
            parsed_date = parsed_date.replace(tzinfo=timezone.utc)
            
        now = datetime.now(timezone.utc)
        age = now - parsed_date
        
        print(f"DEBUG: Parsed date '{date_string}' as {parsed_date}. Age is {age.days} days.")
        
        # If it's surprisingly in the future, we still treat it as recent
        if age.total_seconds() < 0:
            print("DEBUG: Date is in the future. Treating as recent.")
            return True
            
        is_recent_flag = age <= timedelta(days=max_days)
        print(f"DEBUG: is_recent={is_recent_flag} for age {age.days} <= {max_days}")
        return is_recent_flag
    except Exception as e:
        # We can't parse a meaningful date, we assume recent or unparsable
        print(f"Failed to parse date '{date_string}': {e}")
        return True

def filter_by_selected_date(article_date_str, selected_date_str):
    """
    Checks if the article date is strictly within 7 days BEFORE or ON the selected Date.
    """
    if not article_date_str or not selected_date_str:
        return True
        
    try:
        # Parse Dates
        article_date = parser.parse(article_date_str, fuzzy=True)
        selected_date = parser.parse(selected_date_str)
        
        # Make timezone aware if naive
        if article_date.tzinfo is None:
            article_date = article_date.replace(tzinfo=timezone.utc)
        if selected_date.tzinfo is None:
            selected_date = selected_date.replace(tzinfo=timezone.utc)
            
        delta = selected_date - article_date
        return 0 <= delta.days <= 7
    except Exception as e:
        print(f"Failed to filter by selected date: {e}")
        return True
