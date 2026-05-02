# Career Twin

An AI career strategist for university students. Upload your CV and get personalised career path recommendations, skills gap analysis, portfolio project ideas, and a step-by-step action plan.

## Our goal
We, as students looking for internships/jobs, are always faced with CV issues. Let it be unable to identify lacking info, don't know how to tailor our CV according to the position or even being rejeced from a specific position multiple times but unsure of other alternatives, we got you covered. Career Twin is built in hopes that directionless students don't have to go through the bad experiences that we've been through. Sit down, buckle up, and we hope you'll enjoy this journey with us.

## What it does

1. **Upload your CV** — drag and drop a PDF or DOCX
2. **Review & edit** — confirm the extracted profile (edit anything before proceeding)
3. **Get 3 career paths** — AI suggests roles matched to your background with preview scores
4. **Open your dashboard** — full fit analysis including:
   - Overall match score with skills / experience / education breakdown
   - Strengths, weaknesses, matched and missing skills
   - Readiness summary and priority improvements
   - Portfolio project ideas, learning steps, resume improvements
   - Alternative roles and a 0–6 / 6–18 / 2–4 year career pathway
5. **Utility tools** — switch roles, compare scores, filter evidence, regenerate suggestions

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui |
| Backend | FastAPI, Pydantic v2, Uvicorn |
| LLM | Groq API (llama-3.3-70b-versatile) |
| PDF parsing | PyMuPDF (primary), pdfplumber (fallback) |
| RAG | ChromaDB + sentence-transformers (all-MiniLM-L6-v2) |
| Testing | pytest, FastAPI TestClient |

## Project structure

```
career-twin/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (upload, profile, roles)
│   │   ├── models/       # Pydantic models
│   │   ├── prompts/      # LLM prompt templates
│   │   ├── services/     # Business logic (parser, structurer, retrieval, analyzer)
│   │   └── utils/        # In-memory profile store
│   └── tests/
├── frontend/
│   ├── app/              # Next.js pages (/, /review, /roles, /dashboard)
│   ├── components/       # UI components
│   └── lib/              # API client, TypeScript types
├── knowledge_base/       # JSONL files (roles, projects, trajectories, skills)
└── docs/
    └── DEMO_FLOW.md      # Step-by-step demo script
```

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier works; app runs in mock mode without one)

### Backend

```bash
cd career-twin/backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Add your GROQ_API_KEY to .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd career-twin/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running tests

```bash
cd career-twin/backend
.venv/bin/pytest -v
```

28 tests covering upload guards, CV parsing, profile storage, role suggestion, and role analysis.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | No | Groq API key for LLM calls. If empty, all services return realistic mock data. |

## Mock mode

The app works without a Groq API key. Every LLM service (`cv_structurer`, `role_suggester`, `role_analyzer`) has a `_mock_*()` fallback that returns realistic demo data. This makes the full flow testable and demo-able without any API dependency.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload-cv` | Upload PDF/DOCX, extract and structure CV |
| `POST` | `/confirm-profile` | Store confirmed profile, return `profile_id` |
| `POST` | `/suggest-roles` | Get 5 AI-suggested career roles |
| `POST` | `/analyze-role-fit` | Full 15-field career fit analysis |
| `GET` | `/health` | Health check |

## RAG (optional)

The app uses ChromaDB + sentence-transformers to optionally enrich LLM prompts with relevant context from the knowledge base. This is fully optional — if ChromaDB is unavailable or the embedding model fails to load, all retrieval functions silently return empty strings and the app continues normally.

The knowledge base (`career-twin/knowledge_base/`) contains JSONL files for tech roles, business roles, project ideas, career trajectories, and skills mappings.
docker compose up --build
