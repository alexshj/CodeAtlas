# CodeAtlas

### GitHub Repository Intelligence Platform

CodeAtlas is a web-based platform that analyzes public GitHub repositories and helps developers understand their codebase structure, dependencies, and architecture.

## Features

- **Repository Analysis** — Analyze public GitHub repositories using their URL.
- **Repository Dashboard** — View repository statistics and metadata.
- **Language Distribution** — Visualize programming languages used in a repository.
- **File Explorer** — Browse repository files and inspect important files.
- **Dependency Intelligence** — Explore file relationships through an interactive dependency graph.
- **Module Exploration** — Inspect detected modules and their relationships.
- **Circular Dependency Detection** — Identify dependency cycles.
- **Architecture Insights** — Explore repository structure and detected entry points.
- **Repository Explanation** — Understand the technology stack, modules, important files, reading order, and execution flow.
- **Report Export** — Export analysis results as JSON and PDF.

## Technology Stack

**Frontend**
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Flow
- Recharts
- Axios
- Lucide React
- jsPDF

**Backend**
- Python
- FastAPI
- Uvicorn
- HTTPX
- Pydantic
- NetworkX

## Project Structure

```text
CodeAtlas/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── dependency_analyzer.py
│   │   │   ├── github_analyzer.py
│   │   │   └── repository_explainer.py
│   │   ├── utils/
│   │   │   └── repository_parser.py
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.12 or compatible version
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/alexshj/CodeAtlas.git
cd CodeAtlas
```

### 2. Start the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URLs:

- API: http://127.0.0.1:8000
- API documentation: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

### 3. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

Keep both development servers running while using the application.

## How It Works

1. Enter a public GitHub repository URL.
2. CodeAtlas retrieves repository information.
3. The backend analyzes supported source files and dependency relationships.
4. The frontend displays repository insights and interactive visualizations.
5. Export the analysis in JSON or PDF format.

## Limitations

- Designed for public GitHub repositories.
- Analysis depends on available repository metadata and supported source files.
- Static analysis cannot guarantee complete understanding of runtime behavior.
- Repository source code is analyzed, not executed.
- Dynamic and indirect dependencies may not all be detected.

## Version

**1.0.0**

## License

No open-source license has been added yet. All rights remain with the copyright holder.