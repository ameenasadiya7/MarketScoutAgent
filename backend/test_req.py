import traceback
import sys
from fastapi.testclient import TestClient
from main import app

try:
    client = TestClient(app)
    response = client.post('/api/scout/competitor?target_date=2026-03-19', json={'name': 'virtusa'})
    print("Status:", response.status_code)
    print("Body:", response.text)
except Exception as e:
    traceback.print_exc(file=sys.stdout)
