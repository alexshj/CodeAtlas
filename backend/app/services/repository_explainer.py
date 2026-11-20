
import json
from pathlib import PurePosixPath


class RepositoryExplainer:
    """
    Generates evidence-based repository explanations
    using GitHub metadata, README, manifests and
    static dependency analysis.

    Does not execute repository code or use an AI API.
    """

    MANIFEST_NAMES = {
        "package.json",
        "pyproject.toml",
        "requirements.txt",
        "Pipfile",
        "cargo.toml",
        "go.mod",
        "pom.xml",
        "build.gradle",
        "composer.json",
    }

    ENTRY_POINT_NAMES = {
        "main.py",
        "app.py",
        "server.py",
        "manage.py",
        "index.js",
        "index.ts",
        "index.jsx",
        "index.tsx",
        "main.js",
        "main.ts",
        "main.tsx",
        "server.js",
        "server.ts",
    }

    MODULE_DESCRIPTIONS = {
        "src": "Contains application source code and core implementation.",
        "app": "Likely contains application logic, routes or service components.",
        "backend": "Likely contains server-side logic and API functionality.",
        "frontend": "Likely contains the user interface and client-side functionality.",
        "components": "Likely contains reusable interface components.",
        "pages": "Likely contains page-level interface components.",
        "api": "Likely contains API clients, endpoints or request-handling code.",
        "routes": "Likely contains application route definitions.",
        "services": "Likely contains reusable business logic or service operations.",
        "models": "Likely contains data models or domain representations.",
        "utils": "Likely contains shared helper functions.",
        "tests": "Contains test-related files.",
        "test": "Contains test-related files.",
        "docs": "Contains project documentation.",
        "scripts": "Contains utility or automation scripts.",
        "config": "Likely contains application configuration.",
        "lib": "Likely contains shared libraries or reusable functionality.",
        "public": "Likely contains static assets served by the application.",
        "data": "Likely contains datasets or application data.",
    }

    LANGUAGE_DESCRIPTIONS = {
        "Python": "Python is used for application logic, automation or backend development.",
        "JavaScript": "JavaScript is used for application logic or web development.",
        "TypeScript": "TypeScript adds static typing to JavaScript development.",
        "Java": "Java is used for application and backend development.",
        "C": "C is used for low-level or systems programming.",
        "C++": "C++ is used for systems, performance-oriented or application development.",
        "Go": "Go is commonly used for backend services and systems software.",
        "Rust": "Rust is used for systems programming with memory-safety guarantees.",
        "HTML": "HTML defines web page structure.",
        "CSS": "CSS defines visual presentation and styling.",
        "Ruby": "Ruby is used for application and web development.",
        "PHP": "PHP is commonly used for server-side web development.",
        "Shell": "Shell scripts automate command-line tasks.",
    }

    def explain(
        self,
        repository: dict,
        languages: dict,
        files: list,
        important_files: list,
        dependencies: dict,
        readme: str = "",
        manifests: dict | None = None,
    ):
        manifests = manifests or {}

        paths = [
            item["path"] if isinstance(item, dict) else item
            for item in files
        ]

        modules = dependencies.get("modules", [])
        entry_points = dependencies.get("entry_points", [])
        graph_nodes = dependencies.get("nodes", [])
        graph_edges = dependencies.get("edges", [])

        overview = self._build_overview(
            repository,
            languages,
            readme,
            manifests,
        )

        technology_stack = self._technology_stack(
            languages,
            manifests,
        )

        module_explanations = self._explain_modules(
            modules,
        )

        important_file_explanations = self._explain_important_files(
            important_files,
        )

        reading_order = self._reading_order(
            paths,
            important_files,
            entry_points,
            modules,
        )

        execution_flow = self._execution_flow(
            entry_points,
            graph_nodes,
            graph_edges,
        )

        evidence = {
            "readme_available": bool(readme.strip()),
            "manifest_files_available": sorted(manifests.keys()),
            "dependency_files_analyzed": len(graph_nodes),
            "detected_dependency_relationships": len(graph_edges),
            "analysis_method": "static repository analysis",
        }

        return {
            "overview": overview,
            "technology_stack": technology_stack,
            "modules": module_explanations,
            "important_files": important_file_explanations,
            "reading_order": reading_order,
            "execution_flow": execution_flow,
            "evidence": evidence,
            "limitations": [
                "Module descriptions are inferred from directory names and file structure.",
                "Entry points are candidates based on filenames and dependency relationships.",
                "Execution flow is inferred from static dependencies, not confirmed runtime behaviour.",
                "Only files available through the GitHub API and source analysis limits are considered.",
            ],
        }

    def _build_overview(
        self,
        repository,
        languages,
        readme,
        manifests,
    ):
        description = repository.get("description") or ""

        if description:
            purpose = description.strip()
            purpose_source = "GitHub repository description"
        elif readme.strip():
            purpose = self._extract_readme_summary(readme)
            purpose_source = "README"
        else:
            purpose = (
                f"{repository.get('name', 'This project')} "
                "is a GitHub repository. Its purpose could not "
                "be determined from the available metadata."
            )
            purpose_source = "Repository metadata"

        language_names = sorted(
            languages.keys(),
            key=lambda name: languages[name],
            reverse=True,
        )

        primary_language = (
            language_names[0] if language_names else "Not detected"
        )

        return {
            "name": repository.get("name", ""),
            "full_name": repository.get("full_name", ""),
            "purpose": purpose,
            "purpose_source": purpose_source,
            "primary_language": primary_language,
            "language_count": len(languages),
            "readme_available": bool(readme.strip()),
            "manifest_count": len(manifests),
        }

    def _extract_readme_summary(self, readme):
        lines = [
            line.strip()
            for line in readme.splitlines()
            if line.strip()
        ]

        ignored_prefixes = (
            "#",
            "![",
            "[![",
            "<",
            "---",
            "```",
        )

        for line in lines:
            if line.startswith(ignored_prefixes):
                continue

            if line.startswith("[") and "](" in line:
                continue

            return line[:500]

        return (
            "A README is available, but a concise project "
            "description could not be extracted."
        )

    def _technology_stack(self, languages, manifests):
        technologies = []

        for language, bytes_used in sorted(
            languages.items(),
            key=lambda item: item[1],
            reverse=True,
        ):
            technologies.append({
                "name": language,
                "category": "Programming language",
                "description": self.LANGUAGE_DESCRIPTIONS.get(
                    language,
                    f"{language} source code was detected in the repository.",
                ),
                "bytes": bytes_used,
            })

        for path, content in manifests.items():
            filename = PurePosixPath(path).name.lower()

            if filename == "package.json":
                try:
                    package = json.loads(content)

                    dependencies = {
                        **package.get("dependencies", {}),
                        **package.get("devDependencies", {}),
                    }

                    technologies.append({
                        "name": "Node.js ecosystem",
                        "category": "Runtime / package ecosystem",
                        "description": (
                            "A package.json manifest was found. "
                            "The project uses the Node.js package ecosystem."
                        ),
                    })

                    for name in sorted(dependencies)[:30]:
                        technologies.append({
                            "name": name,
                            "category": "Detected package",
                            "description": (
                                f"{name} is declared in package.json. "
                                "Its actual use in the application "
                                "has not been verified."
                            ),
                        })

                except (json.JSONDecodeError, TypeError):
                    technologies.append({
                        "name": "package.json",
                        "category": "Configuration",
                        "description": "A package manifest was found but could not be parsed.",
                    })

            elif filename == "requirements.txt":
                technologies.append({
                    "name": "Python requirements",
                    "category": "Package manifest",
                    "description": (
                        "A requirements.txt file was found, "
                        "listing Python package requirements."
                    ),
                })

            elif filename == "pyproject.toml":
                technologies.append({
                    "name": "Python project configuration",
                    "category": "Package manifest",
                    "description": (
                        "A pyproject.toml file was found. "
                        "It may define project metadata and dependencies."
                    ),
                })

            elif filename == "cargo.toml":
                technologies.append({
                    "name": "Cargo",
                    "category": "Package manager",
                    "description": "Rust project configuration was detected.",
                })

            elif filename == "go.mod":
                technologies.append({
                    "name": "Go modules",
                    "category": "Package manager",
                    "description": "Go module configuration was detected.",
                })

            elif filename == "pom.xml":
                technologies.append({
                    "name": "Maven",
                    "category": "Build system",
                    "description": "A Maven project manifest was detected.",
                })

        return technologies

    def _explain_modules(self, modules):
        results = []

        for module in modules:
            name = module["name"]
            description = self.MODULE_DESCRIPTIONS.get(
                name.lower(),
                (
                    f"The {name} directory contains "
                    f"{module['file_count']} analyzed files. "
                    "Its exact responsibility is not confirmed."
                ),
            )

            results.append({
                "name": name,
                "description": description,
                "file_count": module["file_count"],
                "files": module["files"][:15],
            })

        return results

    def _explain_important_files(self, important_files):
        explanations = {
            "readme.md": "Project documentation and usage instructions.",
            "license": "Defines the terms under which the project may be used and distributed.",
            "requirements.txt": "Lists Python package requirements.",
            "pyproject.toml": "Contains Python project and tool configuration.",
            "package.json": "Contains Node.js project metadata, scripts and package declarations.",
            "dockerfile": "Defines instructions for building a Docker image.",
            "docker-compose.yml": "Defines services and configuration for Docker Compose.",
            "cargo.toml": "Contains Rust package metadata and dependencies.",
            "go.mod": "Defines Go module information and dependencies.",
            "pom.xml": "Defines Maven project configuration and dependencies.",
        }

        results = []

        for path in important_files:
            filename = PurePosixPath(path).name.lower()

            results.append({
                "path": path,
                "description": explanations.get(
                    filename,
                    "Recognized project configuration or documentation file.",
                ),
            })

        return results

    def _reading_order(
        self,
        paths,
        important_files,
        entry_points,
        modules,
    ):
        ordered = []
        seen = set()

        def add(path, reason):
            if path in paths and path not in seen:
                seen.add(path)

                ordered.append({
                    "path": path,
                    "reason": reason,
                })

        # Documentation first.
        for path in important_files:
            if PurePosixPath(path).name.lower() == "readme.md":
                add(path, "Start with the project documentation.")

        # Project manifests.
        for path in important_files:
            filename = PurePosixPath(path).name.lower()

            if filename in self.MANIFEST_NAMES:
                add(path, "Understand the project's dependencies and configuration.")

        # Likely entry points.
        for path in entry_points:
            add(path, "Inspect this possible application entry point.")

        # A small number of files from each module.
        for module in modules:
            for path in module.get("files", [])[:2]:
                add(path, f"Explore files in the {module['name']} module.")

        return ordered[:20]

    def _execution_flow(
        self,
        entry_points,
        nodes,
        edges,
    ):
        node_lookup = {
            node["id"]: node
            for node in nodes
        }

        steps = []

        for path in entry_points[:10]:
            node = node_lookup.get(path, {})

            steps.append({
                "file": path,
                "description": (
                    "Possible starting point. "
                    f"Static analysis detected {node.get('dependency_count', 0)} "
                    "outgoing dependencies."
                ),
                "detected_dependencies": node.get(
                    "dependency_count", 0
                ),
            })

        return {
            "steps": steps,
            "relationship_count": len(edges),
            "description": (
                "The files above are likely entry-point candidates. "
                "Their outgoing import relationships provide clues "
                "about the application's structure. This is not a "
                "verified runtime execution trace."
            ),
        }
