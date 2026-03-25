import os
import asyncio
import datetime
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()
from uuid import uuid4
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from tortoise.contrib.fastapi import register_tortoise
from tortoise import Tortoise
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth

from services.scout import get_competitor_updates_async, summarize_updates_strict_json
from utils.ai_summarizer import summarize_batch, get_fallback_batch
from models_db import User, Company, Update, SearchHistory, Notification
import schemas
import httpx
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user as get_current_user_token
)
import google.generativeai as genai
import json
from pydantic import BaseModel
import re
from dateutil import parser as dateparser
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    else:
        supabase = None
except Exception as e:
    print(f"CRITICAL WARNING: Supabase initialization failed: {e}")
    supabase = None

# OAuth configuration
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

async def get_current_user(token_data: dict = Depends(get_current_user_token)):
    user_id = token_data.get("sub")
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

app = FastAPI(title="MarketScout Production API")

# Add Session Middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET", "super-secret-key"))

# POLISHED CORS: Allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "MarketScout API is live", "version": "1.1.2"}

class ExecutePayload(BaseModel):
    company_name: str
    target_date: str 

@app.post("/api/auth/register")
async def register(payload: RegisterRequest):
    # Check if user exists
    existing = await User.get_or_none(email=payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = await User.create(
        id=uuid4(),
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={payload.name}"
    )
    
    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": str(user.id), "name": user.name, "email": user.email}}

@app.post("/api/auth/login")
async def login(payload: LoginRequest):
    user = await User.get_or_none(email=payload.email)
    if not user or not user.password or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": str(user.id), "name": user.name, "email": user.email}}

@app.get("/api/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"id": str(user.id), "name": user.name, "email": user.email, "avatar_url": user.avatar_url}

@app.get("/api/auth/google")
async def login_google(request: Request):
    # In production, redirect_uri should be your backend's external URL
    redirect_uri = request.url_for('auth_google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/api/auth/google/callback", name="auth_google_callback")
async def auth_google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")
        
        # Check if user exists
        user = await User.get_or_none(email=user_info['email'])
        if not user:
            user = await User.create(
                id=uuid4(),
                name=user_info['name'],
                email=user_info['email'],
                google_id=user_info.get('sub'),
                avatar_url=user_info.get('picture')
            )
        
        access_token = create_access_token(data={"sub": str(user.id)})
        
        # Redirect to frontend dashboard with token as a query parameter
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/?token={access_token}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/execute-scout")
async def execute_scout_endpoint(payload: ExecutePayload, user: User = Depends(get_current_user)):
    try:
        results = await execute_scout(payload)
        
        # Track search history
        history, created = await SearchHistory.get_or_create(
            user=user,
            company_name=payload.company_name,
            defaults={"search_count": 0}
        )
        history.search_count += 1
        history.searched_at = datetime.datetime.now(datetime.timezone.utc)
        await history.save()
        
        # Notification logic
        if history.search_count >= 3:
            await Notification.create(
                user=user,
                company_name=payload.company_name,
                message=f"You've researched {payload.company_name} {history.search_count} times recently."
            )
            
        # Supabase Persistence
        try:
            if supabase:
                supabase.table("scout_reports").insert({
                    "company": results.get("company"),
                    "period": results.get("period"),
                    "executive_summary": results.get("executive_summary"),
                    "updates": results.get("updates", []),
                    "technical_trends": results.get("technical_trends", []),
                    "competitive_takeaway": results.get("competitive_takeaway"),
                    "result_mode": results.get("result_mode"),
                    "requested_from": results.get("requested_from"),
                    "requested_to": results.get("requested_to")
                }).execute()
        except Exception as e:
            print(f"[SUPABASE ERROR] Failed to save to reports: {e}")
            import traceback
            with open("supabase_err.log", "a") as f:
                f.write(f"{e}\n{traceback.format_exc()}\n")

        return results
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[ENDPOINT ERROR] /api/execute-scout:\n{tb}")
        raise HTTPException(status_code=500, detail=f"{str(e)}\n\n{tb}")

@app.get("/api/updates")
async def get_updates(date: date = Query(...), user: User = Depends(get_current_user)):
    try:
        # Use naive datetimes for SQLite comparison if needed
        min_dt = datetime.datetime.combine(date, datetime.time.min) - timedelta(days=7)
        max_dt = datetime.datetime.combine(date, datetime.time.max)
        updates = await Update.filter(published_date__gte=min_dt, published_date__lte=max_dt).order_by('-published_date').limit(50).values()
        return updates
    except Exception as e:
        print(f"[API ERROR] /api/updates: {e}")
        return []

@app.get("/api/reports")
async def get_reports(company: str = Query(None)):
    if not supabase:
        return {"reports": []}
    
    try:
        query = supabase.table("scout_reports").select("*")
        if company:
            query = query.eq("company", company)
        
        response = query.order("created_at", desc=True).execute()
        return {"reports": response.data}
    except Exception as e:
        print(f"[SUPABASE ERROR] /api/reports: {e}")
        return {"reports": []}

@app.get("/api/competitors")
async def get_competitors(search: str = None):
    try:
        # Read from SAME table as Reports page
        query = supabase.table("scout_reports") \
                        .select("*") \
                        .order("created_at", desc=True) \
                        .execute()
        
        all_reports = query.data or []
        print(f"[COMPETITORS] Total rows from scout_reports: {len(all_reports)}")

        # Keep only the LATEST report per company
        seen = {}
        for report in all_reports:
            key = report.get("company", "").lower().strip()
            if key not in seen:
                seen[key] = report

        result = list(seen.values())

        # Apply search filter if provided
        if search:
            result = [
                r for r in result
                if search.lower() in r.get("company", "").lower()
            ]

        print(f"[COMPETITORS] Unique companies: {len(result)}")
        return {"competitors": result, "total": len(result)}

    except Exception as e:
        print(f"[COMPETITORS ERROR] {e}")
        return {"competitors": [], "error": str(e)}

@app.get("/api/competitors/{company}/history")
async def get_competitor_history(company: str):
    try:
        # Get ALL scout runs for this company from scout_reports
        result = supabase.table("scout_reports") \
                         .select("*") \
                         .ilike("company", f"%{company}%") \
                         .order("created_at", desc=True) \
                         .execute()

        history = result.data or []
        print(f"[HISTORY] {company}: {len(history)} runs found")
        return {"company": company, "history": history}

    except Exception as e:
        print(f"[HISTORY ERROR] {e}")
        return {"company": company, "history": [], "error": str(e)}

@app.get("/api/competitors/debug")
async def debug_competitors():
    """Test endpoint — open in browser to verify connection"""
    try:
        if not supabase:
            return {"status": "error", "detail": "Supabase client uninitialized in main.py"}
            
        result = supabase.table("scout_reports") \
                         .select("id, company, created_at") \
                         .order("created_at", desc=True) \
                         .limit(10) \
                         .execute()
        return {
            "status": "connected",
            "table": "scout_reports",
            "row_count": len(result.data),
            "companies": [r["company"] for r in result.data]
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.get("/api/history")
async def get_history(limit: int = 50):
    try:
        result = supabase.table("scout_reports") \
                         .select("*") \
                         .order("created_at", desc=True) \
                         .limit(limit) \
                         .execute()
        
        history = result.data or []
        print(f"[HISTORY] Returning {len(history)} log entries")
        return {"history": history, "total": len(history)}
    
    except Exception as e:
        print(f"[HISTORY ERROR] {e}")
        return {"history": [], "error": str(e)}

@app.get("/api/ping")
async def ping():
    return {"ping": "pong!"}

@app.get("/api/notifications/debug")
async def debug_notifications():
    try:
        result = supabase.table("scout_reports") \
                         .select("id, company, updates, created_at") \
                         .order("created_at", desc=True) \
                         .limit(10) \
                         .execute()
        
        rows = result.data or []
        debug_info = []
        
        for r in rows:
            updates = r.get("updates") or []
            
            # Check what type updates is
            if isinstance(updates, str):
                import json
                try:
                    updates = json.loads(updates)
                except:
                    updates = []
            
            significances = [u.get("significance","") 
                             for u in updates 
                             if isinstance(u, dict)]
            categories    = [u.get("category","") 
                             for u in updates 
                             if isinstance(u, dict)]
            
            debug_info.append({
                "company":       r.get("company"),
                "updates_type":  type(r.get("updates")).__name__,
                "updates_count": len(updates),
                "significances": significances,
                "categories":    categories,
                "created_at":    r.get("created_at")
            })
        
        return {
            "total_rows": len(rows),
            "debug": debug_info
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/notifications")
async def get_notifications():
    try:
        import json
        from collections import Counter

        result = supabase.table("scout_reports") \
                         .select("*") \
                         .order("created_at", desc=True) \
                         .execute()

        all_reports = result.data or []
        alerts = []
        company_counts = Counter(
            r.get("company","").lower().strip()
            for r in all_reports
        )

        for report in all_reports:
            company = report.get("company","Unknown")
            created = report.get("created_at","")
            rep_id  = str(report.get("id",""))

            # Parse updates safely
            raw = report.get("updates") or []
            if isinstance(raw, str):
                try: raw = json.loads(raw)
                except: raw = []
            updates = raw if isinstance(raw, list) else []

            # Parse trends safely
            raw_t = report.get("technical_trends") or []
            if isinstance(raw_t, str):
                try: raw_t = json.loads(raw_t)
                except: raw_t = []
            trends = raw_t if isinstance(raw_t, list) else []

            # Watchlist alert (2+ searches)
            count = company_counts.get(company.lower().strip(),0)
            if count >= 2:
                alerts.append({
                    "id":       f"watch-{company.lower()}",
                    "type":     "Watchlist Threshold",
                    "severity": "info",
                    "emoji":    "🔵",
                    "company":  company,
                    "message":  f"{company} scouted {count} times"
                                f" — active monitoring recommended",
                    "detail":   "",
                    "created_at": created
                })

            for u in updates:
                sig = str(u.get("significance","")).lower().strip()
                cat = str(u.get("category","")).lower().strip()
                title = str(u.get("title",""))

                if sig == "high":
                    alerts.append({
                        "id":f"high-{rep_id}-{len(alerts)}",
                        "type":"High Threat Detected",
                        "severity":"critical","emoji":"🔴",
                        "company":company,
                        "message":f"{company} — HIGH priority: "
                                  f"{title[:80]}",
                        "detail":title,"created_at":created
                    })

                if any(x in cat for x in
                       ["fund","invest","series","capital"]):
                    alerts.append({
                        "id":f"fund-{rep_id}-{len(alerts)}",
                        "type":"Funding Activity",
                        "severity":"critical","emoji":"💰",
                        "company":company,
                        "message":f"{company} funding detected"
                                  f" — threat level rising",
                        "detail":title,"created_at":created
                    })

                if any(x in cat for x in
                       ["product","launch","release","tech"]):
                    alerts.append({
                        "id":f"prod-{rep_id}-{len(alerts)}",
                        "type":"Product Launch",
                        "severity":"warning","emoji":"🚀",
                        "company":company,
                        "message":f"{company} product activity"
                                  f" — monitor closely",
                        "detail":title,"created_at":created
                    })

                if any(x in cat for x in
                       ["leader","executive","ceo","cto","hire"]):
                    alerts.append({
                        "id":f"lead-{rep_id}-{len(alerts)}",
                        "type":"Leadership Change",
                        "severity":"warning","emoji":"👤",
                        "company":company,
                        "message":f"{company} leadership change"
                                  f" — strategy may shift",
                        "detail":title,"created_at":created
                    })

            for t in trends:
                sig = str(t.get("adoption_signal","")).lower()
                if "mainstream" in sig:
                    alerts.append({
                        "id":f"trend-{rep_id}-{len(alerts)}",
                        "type":"Mainstream Trend",
                        "severity":"info","emoji":"📈",
                        "company":company,
                        "message":f"{company}: '"
                                  f"{t.get('trend','')}' is"
                                  f" Mainstream now",
                        "detail":"","created_at":created
                    })

        # Fallback — always show something
        if not alerts:
            seen = set()
            for r in all_reports:
                c = r.get("company","Unknown")
                if c.lower() not in seen:
                    seen.add(c.lower())
                    raw_u = r.get("updates") or []
                    if isinstance(raw_u, str):
                        try: raw_u = json.loads(raw_u)
                        except: raw_u = []
                    u_count = len(raw_u if isinstance(raw_u, list) else [])
                    alerts.append({
                        "id":f"basic-{c.lower()}",
                        "type":"Entity Monitored",
                        "severity":"info","emoji":"🔵",
                        "company":c,
                        "message":f"{c} is being monitored"
                                  f" — {u_count} updates stored",
                        "detail":"",
                        "created_at":r.get("created_at","")
                    })

        # Deduplicate
        seen_ids, final = set(), []
        for a in alerts:
            if a["id"] not in seen_ids:
                seen_ids.add(a["id"])
                final.append(a)

        # Sort critical first
        order = {"critical":0,"warning":1,"info":2}
        final.sort(key=lambda x: order.get(x["severity"],3))

        return {
            "alerts":   final,
            "total":    len(final),
            "critical": sum(1 for a in final
                            if a["severity"]=="critical"),
            "warning":  sum(1 for a in final
                            if a["severity"]=="warning"),
            "info":     sum(1 for a in final
                            if a["severity"]=="info")
        }

    except Exception as e:
        import traceback
        print(f"[ALERTS ERROR] {traceback.format_exc()}")
        return {
            "alerts":[],"total":0,
            "critical":0,"warning":0,"info":0
        }

@app.get("/api/settings/stats")
async def get_settings_stats():
    try:
        import json

        result = supabase.table("scout_reports") \
                         .select("*") \
                         .order("created_at", desc=True) \
                         .execute()

        all_reports = result.data or []

        # Total scout runs
        total_runs = len(all_reports)

        # Unique companies
        unique_companies = len({
            r.get("company","").lower().strip()
            for r in all_reports
            if r.get("company")
        })

        # Total updates found
        def parse_updates(r):
            raw = r.get("updates") or []
            if isinstance(raw, str):
                try: return json.loads(raw)
                except: return []
            return raw if isinstance(raw, list) else []

        total_updates = sum(
            len(parse_updates(r)) for r in all_reports
        )

        # Last scout run
        last_run = all_reports[0].get("created_at","") \
                   if all_reports else None

        # Format last run nicely
        if last_run:
            from datetime import datetime as dt_cls
            try:
                parsed_dt = dt_cls.fromisoformat(
                    last_run.replace("Z","+00:00")
                )
                last_run_display = parsed_dt.strftime(
                    "%B %d, %Y at %I:%M %p"
                )
            except:
                last_run_display = last_run
        else:
            last_run_display = "No runs yet"

        # Test Tavily connection
        tavily_status = "connected"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": os.getenv("TAVILY_API_KEY"),
                        "query":   "test",
                        "max_results": 1
                    }
                )
                tavily_status = "connected" \
                                if r.status_code == 200 \
                                else "error"
        except:
            tavily_status = "error"

        # Test Gemini connection
        gemini_status = "connected"
        try:
            genai.configure(
                api_key=os.getenv("GEMINI_API_KEY")
            )
            model = genai.GenerativeModel("gemini-2.0-flash")
            model.generate_content("ping")
        except:
            gemini_status = "error"

        return {
            "total_runs":        total_runs,
            "unique_companies":  unique_companies,
            "total_updates":     total_updates,
            "last_run_display":  last_run_display,
            "last_run_raw":      last_run,
            "tavily_status":     tavily_status,
            "gemini_status":     gemini_status,
            "supabase_status":   "connected",
            "notification_poll": "10,000ms"
        }

    except Exception as e:
        print(f"[SETTINGS ERROR] {e}")
        return {
            "total_runs": 0,
            "unique_companies": 0,
            "total_updates": 0,
            "last_run_display": "Unknown",
            "tavily_status": "unknown",
            "gemini_status": "unknown",
            "supabase_status": "connected",
            "error": str(e)
        }

@app.get("/api/dashboard")
async def get_dashboard():
    try:
        import json
        from collections import Counter
        from datetime import datetime, timedelta

        result = supabase.table("scout_reports") \
                         .select("*") \
                         .order("created_at", desc=True) \
                         .execute()

        all_reports = result.data or []

        if not all_reports:
            return {
                "competitors_tracked": 0,
                "new_updates_7d": 0,
                "trending_tech": "N/A",
                "alerts_triggered": 0,
                "technology_trends_chart": [],
                "company_activity_chart": [],
                "ai_insights": {},
                "recent_updates_feed": []
            }

        # --- Parse updates safely ---
        def parse_updates(report):
            raw = report.get("updates") or []
            if isinstance(raw, str):
                try: return json.loads(raw)
                except: return []
            return raw if isinstance(raw, list) else []

        def parse_trends(report):
            raw = report.get("technical_trends") or []
            if isinstance(raw, str):
                try: return json.loads(raw)
                except: return []
            return raw if isinstance(raw, list) else []

        # --- STAT 1: Competitors Tracked (unique companies) ---
        unique_companies = list({
            r.get("company","").lower().strip()
            for r in all_reports
            if r.get("company")
        })
        competitors_tracked = len(unique_companies)

        # --- STAT 2: New Updates in last 7 days ---
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_reports = []
        for r in all_reports:
            try:
                created = datetime.fromisoformat(
                    r.get("created_at","").replace("Z","+00:00")
                ).replace(tzinfo=None)
                if created >= seven_days_ago:
                    recent_reports.append(r)
            except:
                recent_reports.append(r)

        new_updates_7d = sum(
            len(parse_updates(r)) for r in recent_reports
        )

        # --- STAT 3: Trending Tech (most common trend) ---
        all_trend_names = []
        for r in all_reports:
            for t in parse_trends(r):
                name = t.get("trend","").strip()
                if name:
                    all_trend_names.append(name)

        if all_trend_names:
            trend_counter = Counter(all_trend_names)
            trending_tech = trend_counter.most_common(1)[0][0]
            # Shorten for display
            if len(trending_tech) > 15:
                trending_tech = trending_tech[:12] + "..."
        else:
            trending_tech = "AI/ML"

        # --- STAT 4: Alerts Triggered ---
        alerts_count = 0
        for r in all_reports:
            updates = parse_updates(r)
            for u in updates:
                sig = str(u.get("significance","")).lower()
                cat = str(u.get("category","")).lower()
                if sig == "high" or "fund" in cat \
                   or "product launch" in cat:
                    alerts_count += 1

        # --- CHART 1: Technology Trends (line chart, last 7 days) ---
        # Count updates per day for last 7 days
        days_labels = []
        day_names   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
        update_counts_per_day = [0] * 7
        trend_counts_per_day  = [0] * 7

        for i in range(6, -1, -1):
            day = datetime.utcnow() - timedelta(days=i)
            days_labels.append(day_names[day.weekday()])

        for r in all_reports:
            try:
                created = datetime.fromisoformat(
                    r.get("created_at","").replace("Z","+00:00")
                ).replace(tzinfo=None)
                days_ago = (datetime.utcnow() - created).days
                if 0 <= days_ago < 7:
                    idx = 6 - days_ago
                    update_counts_per_day[idx] += \
                        len(parse_updates(r))
                    trend_counts_per_day[idx]  += \
                        len(parse_trends(r))
            except:
                pass

        technology_trends_chart = {
            "labels": days_labels,
            "updates_series": update_counts_per_day,
            "trends_series":  trend_counts_per_day
        }

        # --- CHART 2: Company Activity Bar Chart ---
        company_update_counts = {}
        for r in all_reports:
            company = r.get("company","Unknown")
            count   = len(parse_updates(r))
            if company not in company_update_counts:
                company_update_counts[company] = 0
            company_update_counts[company] += count

        # Top 6 companies by update count
        sorted_companies = sorted(
            company_update_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:6]

        company_activity_chart = [
            {"company": c, "count": n}
            for c, n in sorted_companies
        ]

        # --- AI INSIGHTS ---
        # Find company with most HIGH priority updates
        company_high_counts = {}
        for r in all_reports:
            company = r.get("company","Unknown")
            highs   = sum(
                1 for u in parse_updates(r)
                if str(u.get("significance","")).lower()=="high"
            )
            company_high_counts[company] = \
                company_high_counts.get(company,0) + highs

        top_competitor = max(
            company_high_counts,
            key=company_high_counts.get,
            default="N/A"
        )

        # Most common category across all updates
        all_categories = []
        for r in all_reports:
            for u in parse_updates(r):
                cat = u.get("category","")
                if cat: all_categories.append(cat)

        top_category = Counter(all_categories).most_common(1)
        top_category = top_category[0][0] if top_category else "N/A"

        # Most scouted company
        company_search_counts = Counter(
            r.get("company","").strip()
            for r in all_reports
        )
        most_scouted = company_search_counts.most_common(1)
        most_scouted = most_scouted[0][0] if most_scouted else "N/A"

        ai_insights = {
            "top_competitor": top_competitor,
            "top_competitor_msg": f"{top_competitor} dominates "
                                  f"the HIGH priority signals "
                                  f"this week",
            "top_category":   top_category,
            "top_category_msg": f"{top_category} is the most "
                                f"active intelligence category",
            "most_scouted":   most_scouted,
            "most_scouted_msg": f"{most_scouted} has been "
                                f"scouted the most — "
                                f"add to watchlist"
        }

        # --- RECENT UPDATES FEED (last 8 updates) ---
        recent_feed = []
        for r in all_reports[:10]:
            company = r.get("company","Unknown")
            updates = parse_updates(r)
            created = r.get("created_at","")
            for u in updates[:2]:
                recent_feed.append({
                    "company":    company,
                    "title":      u.get("title",""),
                    "category":   u.get("category","Update"),
                    "significance": u.get("significance","Low"),
                    "source_url": u.get("source_url",""),
                    "created_at": created
                })
            if len(recent_feed) >= 8:
                break

        return {
            "competitors_tracked":    competitors_tracked,
            "new_updates_7d":         new_updates_7d,
            "trending_tech":          trending_tech,
            "alerts_triggered":       alerts_count,
            "technology_trends_chart": technology_trends_chart,
            "company_activity_chart":  company_activity_chart,
            "ai_insights":            ai_insights,
            "recent_updates_feed":    recent_feed[:8]
        }

    except Exception as e:
        import traceback
        print(f"[DASHBOARD ERROR] {traceback.format_exc()}")
        return {"error": str(e)}

@app.get("/api/test-tavily")
async def test_tavily():
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    if not TAVILY_API_KEY:
        return {"status": "error", "message": "TAVILY_API_KEY missing"}
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "api_key": TAVILY_API_KEY,
                "query": "stripe news 2026",
                "topic": "news",
                "search_depth": "basic",
                "max_results": 3
            }
            res = await client.post("https://api.tavily.com/search", json=payload, timeout=10.0)
            data = res.json()
            return {
                "status": "ok",
                "res_status": res.status_code,
                "results_count": len(data.get("results", [])),
                "sample": data.get("results", [])[:1]
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/test-gemini")
async def test_gemini():
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        return {"status": "error", "message": "GEMINI_API_KEY missing"}
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash") 
        response = model.generate_content("Say exactly: GEMINI_OK")
        return {
            "status": "ok",
            "response": response.text.strip()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def execute_scout(payload: ExecutePayload):
    company_name = payload.company_name
    target_date_str = payload.target_date
    
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

    async def multi_search_tavily(company: str, target_date_iso: str):
        try:
            end = datetime.datetime.fromisoformat(target_date_iso[:10])
        except ValueError:
            end = datetime.datetime.now()
        
        month_year = end.strftime("%B %Y")
        prev_month = (end - timedelta(days=30)).strftime("%B %Y")

        queries = [
            f"{company} news {month_year}",
            f"{company} announcement funding product {month_year}",
            f"{company} technical updates {month_year}"
        ]

        tasks = []
        async with httpx.AsyncClient() as client:
            for q in queries:
                tasks.append(client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": TAVILY_API_KEY,
                        "query": q,
                        "topic": "news",
                        "search_depth": "basic",
                        "max_results": 5,
                        "include_raw_content": False
                    },
                    timeout=15.0
                ))
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            all_articles = []
            for resp in responses:
                if isinstance(resp, httpx.Response) and resp.status_code == 200:
                    all_articles.extend(resp.json().get("results", []))
                elif isinstance(resp, Exception):
                    print(f"[SEARCH TASK ERROR] {resp}")
            
            # Deduplicate by URL
            unique = []
            seen_urls = set()
            for r in all_articles:
                url = r.get("url")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique.append(r)

            print(f"[TAVILY] Total unique results: {len(unique)}")

            print("=== TAVILY DATE DEBUG ===")
            for r in all_articles[:5]:
                print(f"  title: {r.get('title','')[:50]}")
                print(f"  published_date raw: '{r.get('published_date')}'")
                print(f"  published_date type: {type(r.get('published_date'))}")
            print("========================")

            return unique

    try:
        raw_results = await multi_search_tavily(company_name, target_date_str)
    except Exception as e:
        print(f"[SEARCH ERROR] {e}")
        return {"error": "Search failed", "detail": str(e)}

    def safe_parse_date(article: dict) -> datetime.datetime | None:
        # Try all possible Tavily date field names
        raw = (
            article.get("published_date") or
            article.get("publishedDate") or
            article.get("published") or
            article.get("date") or
            ""
        )

        if not raw:
            return None

        raw = str(raw).strip()

        # Format 1: Unix timestamp (integer or float)
        if re.match(r"^\d{10,13}$", raw):
            ts = int(raw[:10])
            return datetime.datetime.fromtimestamp(ts)

        # Format 2: ISO format "2026-03-18" or "2026-03-18T..."
        try:
            return datetime.datetime.fromisoformat(raw[:10])
        except:
            pass

        # Format 3: Use dateutil as final fallback
        try:
            from dateutil import parser as dp
            return dp.parse(raw, ignoretz=True)
        except:
            pass

        return None

    def smart_filter(results: list, target_date_iso: str):
        try:
            end_dt = datetime.datetime.fromisoformat(target_date_iso[:10])
        except:
            end_dt = datetime.datetime.now()
        
        # Ensure naive
        if end_dt.tzinfo: end_dt = end_dt.replace(tzinfo=None)
        
        start_dt = end_dt - timedelta(days=7)

        dated_in_range = []
        dated_out_range = []
        undated = []

        for r in results:
            dt = safe_parse_date(r)
            r["_dt"] = dt
            if dt is None:
                undated.append(r)        # No date = include by default
            else:
                if dt.tzinfo: dt = dt.replace(tzinfo=None)
                if start_dt <= dt <= end_dt:
                    dated_in_range.append(r) # Perfect match
                else:
                    dated_out_range.append(r) # Too old

        print(f"[FILTER] in_range={len(dated_in_range)} "
              f"undated={len(undated)} "
              f"out_range={len(dated_out_range)}")

        # Decision logic:
        # If we have any in_range OR undated → show as "in_range" 
        # (no warning banner)
        if len(dated_in_range) + len(undated) >= 2:
            final = dated_in_range + undated
            return final[:10], "in_range", start_dt, end_dt

        # If only old dated articles → fallback with banner
        if dated_out_range:
            dated_out_range.sort(
                key=lambda x: x["_dt"] or datetime.datetime.min, reverse=True
            )
            return dated_out_range[:10], "fallback_all", None, end_dt

        return [], "no_results", None, end_dt

    filtered_results, mode, range_start, range_end = smart_filter(raw_results, target_date_str)
    print(f"[MODE] {mode}")
    
    try:
        req_end = datetime.datetime.fromisoformat(target_date_str[:10])
    except:
        req_end = datetime.datetime.now()
    
    req_start = req_end - timedelta(days=7)
    requested_from = req_start.strftime("%Y-%m-%d")
    requested_to = req_end.strftime("%Y-%m-%d")

    if not filtered_results:
        return {
            "result_mode": "no_results",
            "company": company_name,
            "period": f"{requested_from} to {requested_to}",
            "executive_summary": "No updates found for this period.",
            "updates": [],
            "technical_trends": [],
            "competitive_takeaway": "N/A",
            "requested_from": requested_from,
            "requested_to": requested_to
        }

    # Summary
    results_data = await summarize_batch(company_name, filtered_results)
    results_data["result_mode"] = mode
    results_data["requested_from"] = requested_from
    results_data["requested_to"] = requested_to
    
    return results_data

# DB Init
register_tortoise(
    app,
    db_url="sqlite://market_scout.db",
    modules={"models": ["models_db"]},
    generate_schemas=True,
    add_exception_handlers=True,
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
