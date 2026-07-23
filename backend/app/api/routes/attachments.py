from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.app.schemas.attachments import AttachmentSummary
from backend.app.services.attachment_service import analyze_upload


router = APIRouter()


@router.post("/attachments/analyze", response_model=AttachmentSummary)
async def analyze_attachment(file: UploadFile = File(...)) -> AttachmentSummary:
    try:
        content = await file.read()
        return analyze_upload(file, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

