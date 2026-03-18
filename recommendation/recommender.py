from models import db, SearchHistory, UserPreferences
from flask_socketio import emit

def check_and_update_favorite(user_id, company_name):
    """
    Checks if a user has searched a company 3 or more times.
    If so, adds or updates the UserPreferences to mark it as a favorite.
    """
    try:
        search_count = SearchHistory.query.filter_by(user_id=user_id, company_name=company_name).count()
        
        pref = UserPreferences.query.filter_by(user_id=user_id, company_name=company_name).first()
        
        if not pref:
            pref = UserPreferences(user_id=user_id, company_name=company_name, search_count=search_count)
            db.session.add(pref)
        else:
            pref.search_count = search_count
            
        db.session.commit()
    except Exception as e:
        print(f"Error checking and updating favorites: {e}")
        db.session.rollback()

def emit_new_update_notification(socketio, company_name, update_summary):
    """
    Emits a notification over WebSockets to any connected clients 
    (ideally broadcasting. In a real app we'd target the specific room of interested users).
    """
    try:
        socketio.emit("new_update", {
            "company": company_name,
            "message": "New technical update detected",
            "summary": update_summary
        })
    except Exception as e:
        print(f"Error emitting websocket notification: {e}")
