from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_database_url(url: str) -> tuple[str, dict]:
    """Return an asyncpg-compatible URL and optional connect_args."""
    needs_ssl = "sslmode=require" in url or "neon.tech" in url

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urlparse(url)
    query = parse_qs(parsed.query, keep_blank_values=True)
    query.pop("sslmode", None)
    query.pop("channel_binding", None)
    flat_query = urlencode([(k, v) for k, vals in query.items() for v in vals])
    clean_url = urlunparse(parsed._replace(query=flat_query))

    connect_args = {"ssl": True} if needs_ssl else {}
    return clean_url, connect_args


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    database_url: str
    env: str = "development"
    cors_origins: str = "http://localhost:3000"

    @property
    def database_url_async(self) -> str:
        url, _ = _parse_database_url(self.database_url)
        return url

    @property
    def database_connect_args(self) -> dict:
        _, connect_args = _parse_database_url(self.database_url)
        return connect_args

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
