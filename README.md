# MarketScout Agent

A production-ready Competitor Intelligence feature that fetches the last 7 days of news/updates about a competitor company and summarizes them using Gemini 1.5 Flash.

## How to Run

### Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Set up your Python environment and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(Ensure you have `fastapi` `uvicorn` `httpx` `python-dotenv` `google-generativeai` installed)*

3. Create the `.env` file using `.env.example` as a template:
   ```bash
   cp .env.example .env
   ```
   Fill in your `TAVILY_API_KEY` and `GEMINI_API_KEY` in the `.env` file.

4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (if you haven't):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

Once both servers are running, access the application in your browser at `http://localhost:5173`. Enter a competitor entity and run the execution sequence. The entire process should complete in under 10 seconds.
