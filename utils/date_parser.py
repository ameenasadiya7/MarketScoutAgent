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
        
        # If it's surprisingly in the future, we still treat it as recent
        if age.total_seconds() < 0:
            return True
            
        return age <= timedelta(days=max_days)
    except Exception as e:
        # We can't parse a meaningful date, we assume recent or unparsable
        print(f"Failed to parse date '{date_string}': {e}")
        return True
