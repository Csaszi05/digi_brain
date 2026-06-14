"""Configuration loaded from environment variables.

Claude Desktop passes these via its mcpServers `env` block; for local runs you
can put them in a `.env` next to pyproject.toml (loaded if present).
"""

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_API_URL = "https://digibrain.webcsaszar.com/api/v1"


def _load_dotenv() -> None:
    """Minimal .env loader (no dependency). Existing env vars win."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


@dataclass
class Config:
    api_url: str
    email: str
    password: str


def load_config() -> Config:
    _load_dotenv()
    api_url = os.environ.get("DIGIBRAIN_API_URL", DEFAULT_API_URL).rstrip("/")
    email = os.environ.get("DIGIBRAIN_EMAIL", "")
    password = os.environ.get("DIGIBRAIN_PASSWORD", "")

    missing = [
        name
        for name, val in (("DIGIBRAIN_EMAIL", email), ("DIGIBRAIN_PASSWORD", password))
        if not val
    ]
    if missing:
        raise SystemExit(
            "Missing required environment variable(s): "
            + ", ".join(missing)
            + ". Set them in the Claude Desktop config or a .env file."
        )

    return Config(api_url=api_url, email=email, password=password)
