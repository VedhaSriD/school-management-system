# Vedha International School Management System

A cloud-based School Management System featuring dynamic role-based dashboards, database-driven metrics, strict backend permission control, marks approval workflows, PDF generation (fee receipts, report cards, hall tickets), and a read-only Admin AI Assistant integrated with the new Google Gen AI SDK.

---

## Technical Stack
- **Frontend**: React + Vite + Vanilla CSS
- **Backend**: Python + FastAPI + Uvicorn + SQLAlchemy
- **Database**: PostgreSQL (with SQLite fallback for local development)
- **AI**: Gemini LLM (via the new `google-genai` SDK)

---

## Project Structure
```
school-project-file/
├── backend/            # FastAPI Backend
│   ├── app/            # Source code
│   └── requirements.txt
├── frontend/           # React Frontend
│   ├── src/
│   └── package.json
├── render.yaml         # Render blueprint configuration
└── README.md           # Documentation
```

---

## Local Development Setup

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and adjust settings:
   ```bash
   copy .env.example .env
   ```
5. Seed the database with sample data:
   ```bash
   python seed.py
   ```
6. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *By default, the API will be available at `http://127.0.0.1:8000`. Documentation at `/docs`.*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and set `VITE_API_URL` to your local backend URL:
   ```bash
   copy .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## Deployment Instructions

### Option 1: Deploying to Render (Recommended)
This project includes a `render.yaml` Blueprint which configures your database, backend API, and frontend static host in one go.

1. **Push Code to GitHub**: Create a repository and push your project to it.
2. **Access Render**: Go to the [Render Dashboard](https://dashboard.render.com/).
3. **Deploy Blueprint**: 
   - Click **New +** -> **Blueprint**.
   - Connect your GitHub repository.
   - Render will read the `render.yaml` file automatically.
4. **Configure Environment Variables**:
   - During blueprint creation, you will be prompted for environment variables.
   - Enter your `GEMINI_API_KEY` (obtained from Google AI Studio).
   - Render will auto-generate `JWT_SECRET` and link `DATABASE_URL` between the web service and the managed PostgreSQL database.
5. **Watch Deploy**: Once built, Render will supply you with live URLs for both your frontend and backend.

### Option 2: Deploying to Railway
Railway is another excellent hosting provider for PostgreSQL and FastAPI.

1. **Connect GitHub to Railway**:
   - Go to [Railway](https://railway.app/) and create a new project.
   - Choose **Deploy from GitHub repo**.
2. **Add PostgreSQL Database**:
   - Click **+ New** -> **Database** -> **Add PostgreSQL**.
   - Railway will automatically spin up PostgreSQL and inject the `DATABASE_URL` variable into your project settings.
3. **Configure Services**:
   - **Backend Service**:
     - Point it to build from the `/backend` subdirectory.
     - Add variables: `JWT_SECRET` (generate a random string), `GEMINI_API_KEY` (your Google API Key), and link `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`.
   - **Frontend Service**:
     - Point it to build from the `/frontend` subdirectory.
     - Set the build command to `npm run build` and start command to static routing.
     - Inject `VITE_API_URL` pointing to your Backend Service URL.
     - 
<img width="1823" height="808" alt="Screenshot 2026-06-20 131621" src="https://github.com/user-attachments/assets/04c42c40-9ce6-4cdf-90d6-f2de41ff6fa3" />
<img width="1918" height="912" alt="Screenshot 2026-06-20 190139" src="https://github.com/user-attachments/assets/7024251e-94e2-4c0a-a2cd-6ee20b67e415" />
<img width="1893" height="882" alt="Screenshot 2026-06-20 190107" src="https://github.com/user-attachments/assets/b4dc8f4c-cff6-4e51-b6d6-08df92d9c327" />
<img width="1882" height="900" alt="Screenshot 2026-06-20 190003" src="https://github.com/user-attachments/assets/10c6322b-3f51-47f6-b0de-6cd778952397" />



