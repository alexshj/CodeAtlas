
import asyncio
from collections import defaultdict, deque
from pathlib import PurePosixPath
from urllib.parse import quote

import httpx

from app.services.dependency_analyzer import (
    DependencyAnalyzer,
    SOURCE_EXTENSIONS,
    MAX_SOURCE_FILES,
    MAX_FILE_SIZE,
)

from app.services.repository_explainer import RepositoryExplainer


GITHUB_API = "https://api.github.com"
RAW_GITHUB = "https://raw.githubusercontent.com"


class GitHubAnalyzer:

    SMALL_REPOSITORY_LIMIT = 300
    MEDIUM_REPOSITORY_LIMIT = 1000
    MEDIUM_SAMPLE_LIMIT = 500
    LARGE_SAMPLE_LIMIT = 600

    CONTEXT_FILE_NAMES = {
        "readme.md", "readme", "readme.rst",
        "requirements.txt", "pyproject.toml",
        "package.json", "pipfile", "cargo.toml",
        "go.mod", "pom.xml", "dockerfile",
        "docker-compose.yml", "composer.json",
        "build.gradle", "tsconfig.json",
        "jsconfig.json",
    }

    IMPORTANT_FILE_NAMES = {
        "README.md", "LICENSE", "requirements.txt",
        "pyproject.toml", "package.json", "Dockerfile",
        "docker-compose.yml", "Cargo.toml", "go.mod",
        "pom.xml", "Pipfile", "composer.json",
        "build.gradle", "tsconfig.json",
    }

    ENTRY_POINT_NAMES = {
        "main.py", "app.py", "server.py",
        "manage.py", "wsgi.py", "asgi.py",
        "__main__.py", "cli.py",
        "index.js", "index.jsx", "index.ts",
        "index.tsx", "main.js", "main.jsx",
        "main.ts", "main.tsx", "server.js",
        "server.ts", "app.js", "app.ts",
    }

    IGNORED_DIRECTORIES = {
        "node_modules", "dist", "build",
        "coverage", "vendor", "__pycache__",
        ".git", ".next", ".nuxt",
    }

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "CodeAtlas",
            },
        )

        self.dependency_analyzer = DependencyAnalyzer()
        self.repository_explainer = RepositoryExplainer()
        self.semaphore = asyncio.Semaphore(10)

    # --------------------------------------------------
    # FETCH SOURCE FILE
    # --------------------------------------------------

    async def _fetch_source(self, owner, repo, branch, path):
        async with self.semaphore:
            url = (
                f"{RAW_GITHUB}/{quote(owner, safe='')}/"
                f"{quote(repo, safe='')}/"
                f"{quote(branch, safe='')}/"
                f"{quote(path, safe='/')}"
            )

            try:
                response = await self.client.get(url)

                if response.status_code != 200:
                    return None

                if len(response.content) > MAX_FILE_SIZE:
                    return None

                return response.text

            except (httpx.HTTPError, UnicodeDecodeError):
                return None

    # --------------------------------------------------
    # ADAPTIVE SAMPLE SIZE
    # --------------------------------------------------

    def _get_sample_limit(self, total):
        if total <= self.SMALL_REPOSITORY_LIMIT:
            return total

        if total <= self.MEDIUM_REPOSITORY_LIMIT:
            return min(total, self.MEDIUM_SAMPLE_LIMIT)

        return min(total, self.LARGE_SAMPLE_LIMIT)

    # --------------------------------------------------
    # DIRECTORY-AWARE SOURCE SELECTION
    # --------------------------------------------------

    def _select_source_files(self, files):
        candidates = []

        for item in files:
            path = item["path"]
            extension = PurePosixPath(path).suffix.lower()
            parts = PurePosixPath(path).parts

            if extension not in SOURCE_EXTENSIONS:
                continue

            if item.get("size", 0) > MAX_FILE_SIZE:
                continue

            if any(
                part.lower() in self.IGNORED_DIRECTORIES
                for part in parts
            ):
                continue

            candidates.append(item)

        total = len(candidates)
        limit = self._get_sample_limit(total)

        if total <= limit:
            return candidates, {
                "strategy": "full",
                "discovered": total,
                "selected": total,
            }

        # Group candidates by top-level directory.
        groups = defaultdict(list)

        for item in candidates:
            path = item["path"]
            parts = PurePosixPath(path).parts

            group = parts[0] if len(parts) > 1 else "__root__"
            groups[group].append(item)

        for group in groups:
            groups[group].sort(
                key=lambda item: (
                    0 if PurePosixPath(item["path"]).name.lower()
                    in self.ENTRY_POINT_NAMES else 1,
                    len(PurePosixPath(item["path"]).parts),
                    item["path"].lower(),
                )
            )

        # Prioritize likely entry points globally.
        selected = []
        selected_paths = set()

        priority_candidates = sorted(
            candidates,
            key=lambda item: (
                0 if PurePosixPath(item["path"]).name.lower()
                in self.ENTRY_POINT_NAMES else 1,
                len(PurePosixPath(item["path"]).parts),
                item["path"].lower(),
            ),
        )

        for item in priority_candidates:
            if len(selected) >= min(20, limit):
                break

            selected.append(item)
            selected_paths.add(item["path"])

        # Round-robin across directories to avoid sampling
        # only one large directory.
        queues = {
            name: deque(
                item for item in group
                if item["path"] not in selected_paths
            )
            for name, group in groups.items()
        }

        directory_names = sorted(
            queues,
            key=lambda name: (
                0 if name == "__root__" else 1,
                name.lower(),
            ),
        )

        while len(selected) < limit:
            added = False

            for directory in directory_names:
                if queues[directory] and len(selected) < limit:
                    item = queues[directory].popleft()
                    selected.append(item)
                    added = True

            if not added:
                break

        return selected, {
            "strategy": "adaptive",
            "discovered": total,
            "selected": len(selected),
        }

    # --------------------------------------------------
    # DEPENDENCY ANALYSIS
    # --------------------------------------------------

    async def _analyze_dependencies(self, owner, repo, branch, files):
        selected, selection_info = self._select_source_files(files)

        tasks = [
            self._fetch_source(owner, repo, branch, item["path"])
            for item in selected
        ]

        results = await asyncio.gather(*tasks)

        source_map = {
            item["path"]: source
            for item, source in zip(selected, results)
            if source is not None
        }

        dependency_result = self.dependency_analyzer.analyze(source_map)

        successfully_fetched = len(source_map)
        analyzed = dependency_result["summary"]["analyzed_files"]

        dependency_result["analysis_info"] = {
            "strategy": selection_info["strategy"],
            "source_files_discovered": selection_info["discovered"],
            "source_files_selected": selection_info["selected"],
            "source_files_fetched": successfully_fetched,
            "source_files_analyzed": analyzed,
            "source_files_failed": (
                selection_info["selected"] - successfully_fetched
            ),
            "source_files_skipped": (
                selection_info["discovered"] - selection_info["selected"]
            ),
            "max_source_files": MAX_SOURCE_FILES,
            "max_file_size_bytes": MAX_FILE_SIZE,
            "coverage_percentage": round(
                (analyzed / selection_info["discovered"]) * 100, 2
            ) if selection_info["discovered"] else 0,
            "supported_languages": [
                "Python",
                "JavaScript",
                "TypeScript",
            ],
        }

        return dependency_result

    # --------------------------------------------------
    # CONTEXT FILES
    # --------------------------------------------------

    async def _fetch_context_files(self, owner, repo, branch, files):
        context_candidates = [
            item["path"]
            for item in files
            if (
                PurePosixPath(item["path"]).name.lower()
                in self.CONTEXT_FILE_NAMES
                and item.get("size", 0) <= MAX_FILE_SIZE
            )
        ]

        context_candidates.sort(
            key=lambda path: (
                0 if "/" not in path else 1,
                path.lower(),
            )
        )

        selected = context_candidates[:15]

        tasks = [
            self._fetch_source(owner, repo, branch, path)
            for path in selected
        ]

        results = await asyncio.gather(*tasks)

        return {
            path: content
            for path, content in zip(selected, results)
            if content is not None
        }

    # --------------------------------------------------
    # COMPLETE REPOSITORY ANALYSIS
    # --------------------------------------------------

    async def analyze(self, owner: str, repo: str):

        # 1. Repository metadata
        repo_response = await self.client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}"
        )

        if repo_response.status_code == 404:
            raise ValueError("Repository not found or not public")

        if repo_response.status_code == 403:
            raise ValueError("GitHub API rate limit exceeded")

        repo_response.raise_for_status()
        repository = repo_response.json()

        # 2. Languages
        languages_response = await self.client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/languages"
        )
        languages_response.raise_for_status()
        languages = languages_response.json()

        # 3. Repository tree
        branch = repository["default_branch"]

        tree_response = await self.client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/"
            f"{quote(branch, safe='')}",
            params={"recursive": "1"},
        )
        tree_response.raise_for_status()
        tree_data = tree_response.json()

        files = [
            item for item in tree_data.get("tree", [])
            if item["type"] == "blob"
        ]

        directories = [
            item for item in tree_data.get("tree", [])
            if item["type"] == "tree"
        ]

        # 4. Important files
        detected_files = [
            item["path"]
            for item in files
            if PurePosixPath(item["path"]).name
            in self.IMPORTANT_FILE_NAMES
        ]

        # 5. Dependencies
        dependencies = await self._analyze_dependencies(
            owner, repo, branch, files
        )

        # 6. Context files
        context_files = await self._fetch_context_files(
            owner, repo, branch, files
        )

        readme = next(
            (
                content
                for path, content in context_files.items()
                if PurePosixPath(path).name.lower().startswith("readme")
            ),
            "",
        )

        manifests = {
            path: content
            for path, content in context_files.items()
            if PurePosixPath(path).name.lower()
            in RepositoryExplainer.MANIFEST_NAMES
        }

        # 7. Repository explanation
        repository_data = {
            "name": repository["name"],
            "full_name": repository["full_name"],
            "description": repository["description"],
            "url": repository["html_url"],
            "stars": repository["stargazers_count"],
            "forks": repository["forks_count"],
            "default_branch": branch,
            "size_kb": repository["size"],
        }

        repository_explanation = self.repository_explainer.explain(
            repository=repository_data,
            languages=languages,
            files=files,
            important_files=detected_files,
            dependencies=dependencies,
            readme=readme,
            manifests=manifests,
        )

        # 8. Response
        return {
            "repository": repository_data,
            "languages": languages,

            "statistics": {
                "total_files": len(files),
                "total_directories": len(directories),
                "tree_truncated": tree_data.get("truncated", False),
            },

            "important_files": detected_files,

            "file_tree": [
                {
                    "path": item["path"],
                    "type": item["type"],
                    "size": item.get("size", 0),
                }
                for item in tree_data.get("tree", [])
            ],

            "dependencies": dependencies,
            "repository_explanation": repository_explanation,
        }

    async def close(self):
        await self.client.aclose()
