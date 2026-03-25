import urllib.request
import json
import urllib.error
import sys

req = urllib.request.Request(
    'http://localhost:8000/api/scout/execute',
    method='POST',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({'company':'Stripe', 'target_date':'2026-03-23'}).encode()
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP ERROR", e.code)
    print(e.read().decode())
    sys.exit(1)
