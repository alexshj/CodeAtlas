
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.github_analyzer import GitHubAnalyzer
from app.utils.repository_parser import parse_github_url


VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.analyzer = GitHubAnalyzer()

    yield

    await app.state.analyzer.close()


app = FastAPI(
    title="CodeAtlas API",
    description=(
        "GitHub Repository Intelligence Platform "
        "with Dependency Analysis and Repository Explanation"
    ),
    version=VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=1, max_length=500)


@app.get("/")
def home():
    return {
        "project": "CodeAtlas",
        "message": "Understand any codebase.",
        "status": "running",
        "version": VERSION,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "CodeAtlas API",
        "version": VERSION,
        "features": [
            "repository_analysis",
            "dependency_analysis",
            "entry_point_detection",
            "circular_dependency_detection",
            "module_analysis",
            "architecture_insights",
            "repository_explanation",
            "technology_stack_detection",
            "developer_reading_guide",
            "execution_flow_inference",
        ],
    }


@app.post("/api/analyze")
async def analyze_repository(request: AnalyzeRequest):
    try:
        owner, repo = parse_github_url(request.url)

        result = await app.state.analyzer.analyze(
            owner,
            repo,
        )

        return {
            "success": True,
            "data": result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        if hasattr(error, "response"):
            status = error.response.status_code

            if status == 403:
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "GitHub API rate limit exceeded. "
                        "Try again later."
                    ),
                )

            if status == 404:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        "Repository not found or unavailable."
                    ),
                )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to analyze repository. "
                "Please try again."
            ),
        )
