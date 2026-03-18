# Market Scout Agent

An Intelligent Competitor Monitoring Platform powered by AI.

## 🚀 Features
- **User Authentication**: Secure user registration, login, and session tracking.
- **Competitor News Search**: Real-time fetching of technical updates using the `Tavily API`.
- **Date Filtering**: Calendar-based filtering to find updates strictly up to 7 days prior to any selected date.
- **Smart Recommendations**: Tracks your search history and automatically promotes companies to your "Favorites" list after 3 searches.
- **Real-Time Notifications**: Utilizes `Flask-SocketIO` to push live popup notifications when a favorite company has a brand new technical update.
- **AI Trend Insight Engine**: Uses `Google Gemini AI` to analyze your recent tracking behavior and summarize broader overarching industry trends.

## 📋 Prerequisites
- Python 3.9+
- [Tavily API Key](https://tavily.com/)
- [Google Gemini API Key](https://ai.google.dev/)

## 🛠️ Installation & Setup

1. **Navigate to the Project Directory**
   Ensure you are in the `market_scout_agent` folder in your terminal.

2. **Setup Environment Variables**
   Create a file named `.env` in the root of the project directory and add your secret tokens:
   ```env
   TAVILY_API_KEY=your_tavily_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   SECRET_KEY=a_very_secure_random_string_for_flask_sessions
   ```

3. **Install Dependencies**
   Install all the required Python packages by running:
   ```bash
   pip install -r requirements.txt
   ```
   *(Ensure you have also installed the backend modules requested in the Feature Upgrade: `pip install Flask-Login Flask-SQLAlchemy Flask-SocketIO bcrypt python-dotenv google-genai`)*

4. **Run the Application**
   Start the local Flask development server. The SQLite Database (`database.db`) and its tables will automatically generate upon the very first initialization.
   ```bash
   python app.py
   ```

5. **Access the Dashboard**
   Open your preferred web browser and go to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

## 📁 Project Structure

- `app.py`: Main Flask application router, API endpoints, and SocketIO WebSocket handler.
- `models.py`: SQLAlchemy Database schema mapping (Users, SearchHistory, UserPreferences).
- `auth/`: Authentication blueprints controlling `/register`, `/login`, and `/logout`.
- `services/`: Core external integrations for Tavily (`search.py`), requests/BS4 (`scraper.py`), and Gemini LLM synthesis (`summarizer.py`).
- `recommendation/`: Evaluates your database history to promote companies into favorites and trigger realtime WebSocket alerts.
- `insights/`: The Trend Analyzer passing your recent generic searches to Gemini to deduce overarching market trajectories.
- `utils/`: Strict temporal parsing and calendar-date filter enforcement logic.
- `templates/`: Server-rendered Jinja HTML interfaces (`dashboard.html`, `login.html`, `register.html`).
- `static/`: Frontend logic for Websockets and dynamic DOM UI updates (`script.js`) alongside responsive UI aesthetics (`styles.css`).
