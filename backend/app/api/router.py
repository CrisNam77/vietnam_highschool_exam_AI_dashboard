from fastapi import APIRouter

from backend.app.api.routes import ai, execution, health, logs
from backend.app.services.log_service import summarize_logs


api_router = APIRouter()
api_router.include_router(health.router, prefix="/api", tags=["health"])
api_router.include_router(ai.router, prefix="/api/ai", tags=["ai"])
api_router.include_router(execution.router, prefix="/api", tags=["execution"])
api_router.include_router(execution.router, prefix="/api/execution", tags=["execution"])
api_router.include_router(logs.router, prefix="/api/logs", tags=["logs"])


@api_router.get("/api/report/ai-usage", tags=["logs"])
def ai_usage_report() -> dict:
    return summarize_logs()
