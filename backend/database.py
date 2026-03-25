import os
from dotenv import load_dotenv

load_dotenv()

# Example: postgres://postgres:password@host:5432/dbname
POSTGRES_URL = os.getenv("SUPABASE_URL", "sqlite://db.sqlite3") # Fallback to sqlite if no URL for dev safety, but we will strictly use PG ideally
# If using supabase dashboard DB URL:
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL and POSTGRES_URL.startswith("http"):
    # Supabase gives a REST URL in SUPABASE_URL, and DB URL in DATABASE_URL. 
    # If using strictly DB driver, we need a postgres:// URL.
    pass

TORTOISE_ORM = {
    "connections": {
        "default": DATABASE_URL or POSTGRES_URL
    },
    "apps": {
        "models": {
            "models": ["models_db", "aerich.models"],
            "default_connection": "default",
        }
    }
}
