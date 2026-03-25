import httpx
import asyncio

async def test_scout(company: str, target: str):
    print(f"Testing {company} for {target}...")
    async with httpx.AsyncClient() as client:
        payload = {"company_name": company, "target_date": target}
        try:
            res = await client.post("http://localhost:8000/api/execute-scout", json=payload, timeout=60.0)
            if res.status_code == 200:
                data = res.json()
                print(f"[{company}] Success!")
                print(f"  Mode: {data.get('result_mode')}")
                print(f"  Period: {data.get('period')}")
                print(f"  Total Updates: {len(data.get('updates', []))}")
            else:
                print(f"[{company}] Failed with status: {res.status_code}")
                print(f"  Output: {res.text}")
        except Exception as e:
            print(f"[{company}] Error: {e}")

async def main():
    await test_scout("Anthropic", "2026-03-24")
    await test_scout("OpenAI", "2026-03-24")
    await test_scout("xyzfakecompany999", "2026-03-24")

if __name__ == "__main__":
    asyncio.run(main())
