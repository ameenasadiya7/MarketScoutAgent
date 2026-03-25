from datetime import datetime

# Helper to track search frequencies and user notifications locally or via mock DB call
class NotificationService:
    def __init__(self):
        # We simulate DB tracking
        self.search_frequencies = {} # user_id -> dict(company_name -> list(timestamps))
        
    def track_search(self, user_id: str, company: str):
        if user_id not in self.search_frequencies:
            self.search_frequencies[user_id] = {}
        
        if company not in self.search_frequencies[user_id]:
            self.search_frequencies[user_id][company] = []
            
        self.search_frequencies[user_id][company].append(datetime.utcnow())
        
        recent_searches = [t for t in self.search_frequencies[user_id][company] if (datetime.utcnow() - t).days < 7]
        
        if len(recent_searches) >= 3: # User searched 3 times in 7 days
            return True # Trigger notification as highly interested
        return False
        
    def process_new_updates(self, user_id: str, company: str, new_update_count: int):
        # If new updates come and it's a tracked company, we create a notification object
        # In actual implementation: Supabase write to Notifications table
        return {
            "user_id": user_id,
            "company_name": company,
            "message": f"{new_update_count} new updates found for {company}!",
            "is_read": False,
            "created_at": datetime.utcnow()
        }

notification_service = NotificationService()
