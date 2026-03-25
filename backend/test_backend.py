from fastapi.testclient import TestClient
from main import app
import sys
import datetime

try:
    with TestClient(app) as client:
        response = client.post("/api/scout/execute", json={"company": "Stripe", "target_date": "2026-03-23"})
        print("Status code:", response.status_code)
        print("Response text:", response.text)
        if response.status_code != 200:
            sys.exit(1)
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
