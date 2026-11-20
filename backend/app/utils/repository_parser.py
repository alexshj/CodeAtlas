
import re
from urllib.parse import urlparse


def parse_github_url(url: str):

    url = url.strip()

    if not url:
        raise ValueError("Repository URL is required")

    if len(url) > 500:
        raise ValueError("Repository URL is too long")

    parsed = urlparse(url)

    if parsed.scheme not in ("https", "http"):
        raise ValueError("Only HTTP and HTTPS URLs are supported")

    if parsed.hostname not in ("github.com", "www.github.com"):
        raise ValueError("Please enter a valid GitHub URL")

    parts = [
        part for part in parsed.path.strip("/").split("/")
        if part
    ]

    if len(parts) != 2:
        raise ValueError(
            "Use this format: https://github.com/owner/repository"
        )

    owner, repo = parts

    repo = re.sub(r"\.git$", "", repo)

    pattern = r"^[A-Za-z0-9_.-]+$"

    if not re.match(pattern, owner):
        raise ValueError("Invalid repository owner")

    if not re.match(pattern, repo):
        raise ValueError("Invalid repository name")

    return owner, repo
