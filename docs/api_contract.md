# API Contract

Base URL local: `http://localhost:8000`

Thiết kế đầy đủ của module AI nằm tại `docs/ai_module_design.md`. DB schema được quản lý bằng Prisma tại `ai_frontend/prisma/schema.prisma`.

## GET /api/health

Trả trạng thái service.

Response:

```json
{
  "status": "ok",
  "service": "vietnam-highschool-exam-ai-dashboard"
}
```

## POST /api/chat/run

Endpoint chỉ được dùng nếu request đã mang code được người dùng xác nhận. Flow bắt buộc vẫn là sinh code, người dùng kiểm tra/chỉnh sửa, rồi mới thực thi.

Request:

```json
{
  "session_id": "optional-existing-session-id",
  "prompt": "Top 10 tỉnh có điểm trung bình cao nhất",
  "approved_code": "...",
  "history_limit": 10
}
```

Response:

```json
{
  "session_id": "uuid",
  "user_message_id": "uuid",
  "assistant_message_id": "uuid",
  "execution_id": "uuid",
  "status": "success",
  "analysis_markdown": "### ...",
  "explanation": "...",
  "generated_code": "...",
  "executed_code": "...",
  "stdout": "...",
  "stderr": "",
  "plot_b64": null,
  "artifacts": [],
  "runtime_ms": 2230
}
```

## POST /api/ai/generate

Tạo code phân tích và phần giải thích để frontend hiển thị bước kiểm tra/chỉnh sửa trước khi thực thi.

Request:

```json
{
  "prompt": "So sánh điểm Toán theo vùng miền",
  "history": []
}
```

Response:

```json
{
  "explanation": "...",
  "code": "...",
  "expected_output": "table"
}
```

## POST /api/execute

Nhận code đã được người dùng xác nhận và thực thi trên DataFrame local.

Request:

```json
{
  "code": "summary = df.groupby('vung_mien')['toan'].mean()",
  "prompt": "So sánh điểm Toán theo vùng miền",
  "explanation": "..."
}
```

Response:

```json
{
  "status": "success",
  "message": "Đã thực thi mã.",
  "output": "...",
  "logs": [],
  "success": true,
  "stdout": "...",
  "stderr": "",
  "plot_b64": null
}
```

Ràng buộc bắt buộc của frontend: phải có flow xác nhận trước khi chạy. Phải giữ `pending`, `setPending`, `PendingReview`, `editedCode`, `handleAccept`, `handleCancel`, khối `Vui lòng kiểm tra...`, và nút `Chấp nhận & Thực thi`.

## GET /api/logs

Trả danh sách logs. Boilerplate hiện trả danh sách rỗng.

## GET /api/logs/{log_id}

Trả chi tiết một log theo `log_id`, hoặc `404` nếu không tồn tại.
