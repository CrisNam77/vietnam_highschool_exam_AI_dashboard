try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:  # pragma: no cover - fallback for minimal environments
    BaseSettings = object
    SettingsConfigDict = dict


class Settings(BaseSettings):
    app_name: str = "vietnam-highschool-exam-ai-dashboard"
    app_env: str = "local"
    data_path: str = "data/processed/final_data.csv"
    sqlite_db_path: str = "database/logs.db"
    ai_provider: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    openrouter_api_key: str = ""
    openrouter_model: str = "openai/gpt-4.1-mini"
    openrouter_url: str = "https://openrouter.ai/api/v1/chat/completions"

    if BaseSettings is not object:
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore",
        )


settings = Settings()
