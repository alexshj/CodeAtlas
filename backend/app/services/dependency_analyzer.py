
import ast
import re
from collections import defaultdict, deque
from pathlib import PurePosixPath

import networkx as nx


SOURCE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".mjs", ".cjs", ".mts", ".cts",
}

MAX_SOURCE_FILES = 600
MAX_FILE_SIZE = 200_000

JS_EXTENSIONS = (
    ".js", ".jsx", ".ts", ".tsx",
    ".mjs", ".cjs", ".mts", ".cts",
)

IGNORED_DIRECTORIES = {
    "node_modules", "dist", "build", "coverage",
    "__pycache__", ".git", "vendor",
}


class DependencyAnalyzer:
    """
    Static dependency analyzer for Python and JavaScript/TypeScript.
    Repository code is never executed.
    """

    def analyze(self, source_files: dict[str, str]):
        source_files = {
            PurePosixPath(path).as_posix(): source
            for path, source in source_files.items()
        }

        graph = nx.DiGraph()
        graph.add_nodes_from(source_files.keys())

        for path, source in source_files.items():
            extension = PurePosixPath(path).suffix.lower()

            if extension == ".py":
                imports = self._python_imports(path, source)
            elif extension in JS_EXTENSIONS:
                imports = self._javascript_imports(source)
            else:
                continue

            for imported in imports:
                resolved = self._resolve_import(
                    path, imported, source_files
                )

                if resolved and resolved != path:
                    graph.add_edge(path, resolved)

        cycles = self._find_cycles(graph)
        entry_points = self._find_entry_points(graph)
        modules = self._find_modules(graph)

        architecture = self._architecture_insights(
            graph, cycles, entry_points, modules
        )

        nodes = [
            {
                "id": path,
                "label": PurePosixPath(path).name,
                "extension": PurePosixPath(path).suffix.lower(),
                "is_entry_point": path in entry_points,
                "dependency_count": graph.out_degree(path),
                "dependent_count": graph.in_degree(path),
            }
            for path in graph.nodes()
        ]

        edges = [
            {"source": source, "target": target}
            for source, target in graph.edges()
        ]

        return {
            "summary": {
                "analyzed_files": graph.number_of_nodes(),
                "dependency_count": graph.number_of_edges(),
                "entry_point_count": len(entry_points),
                "circular_dependency_groups": len(cycles),
                "module_count": len(modules),
            },
            "nodes": nodes,
            "edges": edges,
            "entry_points": entry_points,
            "cycles": cycles,
            "modules": modules,
            "architecture": architecture,
        }

    # --------------------------------------------------
    # PYTHON IMPORT EXTRACTION
    # --------------------------------------------------

    def _python_imports(self, path, source):
        imports = []

        try:
            tree = ast.parse(source)
        except (SyntaxError, ValueError):
            return imports

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        "kind": "python_absolute",
                        "module": alias.name,
                        "level": 0,
                        "names": [],
                    })

            elif isinstance(node, ast.ImportFrom):
                imports.append({
                    "kind": "python_from",
                    "module": node.module or "",
                    "level": node.level,
                    "names": [
                        alias.name
                        for alias in node.names
                        if alias.name != "*"
                    ],
                })

        return imports

    # --------------------------------------------------
    # JAVASCRIPT / TYPESCRIPT IMPORT EXTRACTION
    # --------------------------------------------------

    def _javascript_imports(self, source):
        imports = []

        patterns = [
            r"""(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']""",
            r"""require\s*\(\s*["']([^"']+)["']\s*\)""",
            r"""import\s*\(\s*["']([^"']+)["']\s*\)""",
        ]

        seen = set()

        for pattern in patterns:
            for match in re.finditer(pattern, source):
                module = match.group(1)

                # Only local relative imports.
                if module.startswith(".") and module not in seen:
                    imports.append({
                        "kind": "javascript",
                        "module": module,
                    })
                    seen.add(module)

        return imports

    # --------------------------------------------------
    # IMPORT RESOLUTION
    # --------------------------------------------------

    def _resolve_import(self, source_path, imported, source_files):
        kind = imported.get("kind")

        if kind in {"python_absolute", "python_from"}:
            return self._resolve_python_import(
                source_path, imported, source_files
            )

        if kind == "javascript":
            return self._resolve_javascript_import(
                source_path, imported["module"], source_files
            )

        return None

    def _python_candidates(self, base):
        base = PurePosixPath(base).as_posix()

        return [
            f"{base}.py",
            f"{base}/__init__.py",
        ]

    def _resolve_python_import(self, source_path, imported, source_files):
        module = imported["module"]
        level = imported["level"]
        names = imported["names"]

        candidates = []

        if level:
            parent = PurePosixPath(source_path).parent

            for _ in range(level - 1):
                parent = parent.parent

            base = parent

            if module:
                base = base / module.replace(".", "/")

            base_path = base.as_posix()

            candidates.extend(self._python_candidates(base_path))

            for name in names:
                child = (
                    f"{base_path}/{name}"
                    if base_path != "."
                    else name
                )
                candidates.extend(self._python_candidates(child))

        else:
            module_path = module.replace(".", "/")

            if module_path:
                candidates.extend(self._python_candidates(module_path))

                for root in ("src", "lib", "app", "backend", "python"):
                    candidates.extend(
                        self._python_candidates(
                            f"{root}/{module_path}"
                        )
                    )

                # from package import module
                for name in names:
                    submodule = f"{module_path}/{name}"
                    candidates.extend(
                        self._python_candidates(submodule)
                    )

                    for root in ("src", "lib", "app", "backend", "python"):
                        candidates.extend(
                            self._python_candidates(
                                f"{root}/{submodule}"
                            )
                        )

        return self._first_existing(candidates, source_files)

    def _resolve_javascript_import(self, source_path, imported, source_files):
        if not imported.startswith("."):
            return None

        parent = PurePosixPath(source_path).parent
        base = (parent / imported).as_posix()

        candidates = [base]

        for extension in JS_EXTENSIONS:
            candidates.append(base + extension)

        for extension in JS_EXTENSIONS:
            candidates.append(f"{base}/index{extension}")

        return self._first_existing(candidates, source_files)

    def _first_existing(self, candidates, source_files):
        seen = set()

        for candidate in candidates:
            normalized = PurePosixPath(candidate).as_posix()

            if normalized in seen:
                continue

            seen.add(normalized)

            if normalized in source_files:
                return normalized

        return None

    # --------------------------------------------------
    # ENTRY POINT DETECTION
    # --------------------------------------------------

    def _find_entry_points(self, graph):
        entry_names = {
            "main.py", "app.py", "server.py",
            "manage.py", "wsgi.py", "asgi.py",
            "__main__.py", "cli.py",
            "index.js", "index.jsx", "index.ts",
            "index.tsx", "main.js", "main.jsx",
            "main.ts", "main.tsx", "server.js",
            "server.ts", "app.js", "app.ts",
        }

        ignored = {
            "test", "tests", "__tests__", "docs",
            "documentation", "examples", "example",
            "fixtures", "mocks", "mock", "coverage",
            "dist", "build", "vendor", "node_modules",
            "__pycache__",
        }

        scored = []

        for node in graph.nodes():
            path = PurePosixPath(node)
            filename = path.name.lower()
            parts = {part.lower() for part in path.parts}

            if parts & ignored or filename.endswith(".d.ts"):
                continue

            outgoing = graph.out_degree(node)
            incoming = graph.in_degree(node)

            if outgoing == 0:
                continue

            score = 0

            if filename in entry_names:
                score += 10

            depth = len(path.parts)
            score += 3 if depth == 1 else 2 if depth == 2 else 1 if depth == 3 else 0

            if outgoing >= 1:
                score += 2

            if outgoing >= 3:
                score += 1

            if incoming == 0:
                score += 2

            if score >= 5:
                scored.append((score, node))

        scored.sort(key=lambda item: (-item[0], item[1].lower()))

        return [path for _, path in scored[:20]]

    # --------------------------------------------------
    # CIRCULAR DEPENDENCIES
    # --------------------------------------------------

    def _find_cycles(self, graph):
        cycles = []

        for component in nx.strongly_connected_components(graph):
            if len(component) > 1:
                cycles.append(sorted(component))
            elif len(component) == 1:
                node = next(iter(component))
                if graph.has_edge(node, node):
                    cycles.append([node])

        return cycles

    # --------------------------------------------------
    # MODULE DETECTION
    # --------------------------------------------------

    def _find_modules(self, graph):
        groups = defaultdict(list)

        for node in graph.nodes():
            parts = PurePosixPath(node).parts
            module = parts[0] if len(parts) > 1 else "root"
            groups[module].append(node)

        return [
            {
                "name": name,
                "files": sorted(files),
                "file_count": len(files),
            }
            for name, files in sorted(groups.items())
        ]

    # --------------------------------------------------
    # ARCHITECTURE INSIGHTS
    # --------------------------------------------------

    def _architecture_insights(self, graph, cycles, entry_points, modules):
        total_files = graph.number_of_nodes()
        total_dependencies = graph.number_of_edges()

        isolated = [
            node for node in graph.nodes()
            if graph.degree(node) == 0
        ]

        highly_connected = sorted(
            [
                {
                    "path": node,
                    "dependencies": graph.out_degree(node),
                    "dependents": graph.in_degree(node),
                    "connections": graph.degree(node),
                }
                for node in graph.nodes()
            ],
            key=lambda item: (
                item["connections"],
                item["dependencies"],
            ),
            reverse=True,
        )[:10]

        largest_module = None

        if modules:
            largest = max(modules, key=lambda item: item["file_count"])
            largest_module = {
                "name": largest["name"],
                "file_count": largest["file_count"],
            }

        cycle_penalty = min(len(cycles) * 15, 45)
        isolated_penalty = min(len(isolated) * 2, 20)

        score = max(0, 100 - cycle_penalty - isolated_penalty)

        label = (
            "Healthy structure" if score >= 80
            else "Needs attention" if score >= 60
            else "High structural risk"
        )

        return {
            "score": score,
            "label": label,
            "score_explanation": (
                "Starts at 100; subtracts 15 points per circular "
                "dependency group (maximum 45) and 2 points per "
                "isolated file (maximum 20). This is a heuristic."
            ),
            "metrics": {
                "total_files": total_files,
                "total_dependencies": total_dependencies,
                "isolated_files": len(isolated),
                "circular_dependency_groups": len(cycles),
                "entry_point_candidates": len(entry_points),
                "modules": len(modules),
                "graph_density": round(
                    nx.density(graph), 4
                ) if total_files > 1 else 0,
            },
            "entry_points": entry_points,
            "isolated_file_paths": isolated[:20],
            "highly_connected_files": highly_connected,
            "largest_module": largest_module,
        }
