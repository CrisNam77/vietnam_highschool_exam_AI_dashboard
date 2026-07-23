from pydantic import BaseModel


class AttachmentSummary(BaseModel):
    id: str
    filename: str
    kind: str
    content_type: str
    size_bytes: int
    summary: str
    data_url: str | None = None

