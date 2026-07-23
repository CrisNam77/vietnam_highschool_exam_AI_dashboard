# API Contract

Base URL local chuẩn:

```text
http://localhost:8001
```

Next.js AI Assistant gọi backend thông qua proxy nội bộ `/api/backend/...`, nhưng contract bên dưới mô tả endpoint FastAPI thật.

## GET /

Trả thông tin service cơ bản.

Response:

```json
{
  "service": "vietnam-highschool-exam-ai-dashboard",
  "status": "ok",
  "docs": "/docs"
}
```

## GET /api/health

Kiểm tra trạng thái backend.

Response:

```json
{
  "status": "ok",
  "service": "vietnam-highschool-exam-ai-dashboard"
}
```

## POST /api/ai/generate

Sinh code Python và phần giải thích từ câu hỏi tự nhiên. Code sinh ra được đưa về trạng thái chờ người dùng duyệt ở frontend, chưa tự động thực thi.

Request:

```json
{
  "prompt": "Vẽ biểu đồ phổ điểm môn Toán năm 2024",
  "context": {}
}
```

Hoặc:

```json
{
  "question": "Vẽ biểu đồ phổ điểm môn Toán năm 2024"
}
```

Response:

```json
{
  "status": "pending_approval",
  "answer_type": "code",
  "explanation": "Markdown explanation",
  "code": "print(df.head())",
  "expected_output": "table",
  "warnings": []
}
```

Ghi chú:

- Backend dùng OpenRouter khi có `OPENROUTER_API_KEY`.
- Nếu thiếu API key hoặc provider lỗi, `explanation` sẽ mô tả lỗi cấu hình/kết nối và `code` có thể rỗng.
- `answer_type` là `code` hoặc `text`; nếu là `text` thì frontend không cần hiển thị bước chạy code.
- `expected_output` có thể là `text`, `table`, `chart`, hoặc `chart_table`.
- `warnings` gồm cảnh báo từ AI và cảnh báo validator backend nếu code chứa keyword không được phép.
- Generate event được ghi vào JSON log local.

## POST /api/execute

Endpoint chính dùng trong Next.js frontend và demo để thực thi code đã được người dùng duyệt/chỉnh sửa.

Request:

```json
{
  "code": "print(df.head())",
  "approved": true,
  "prompt": "Xem thử dữ liệu",
  "explanation": "Code in 5 dòng đầu tiên của DataFrame."
}
```

Response thành công:

```json
{
  "status": "success",
  "message": "Đã thực thi mã.",
  "output": "stdout text",
  "logs": [],
  "success": true,
  "stdout": "stdout text",
  "stderr": "",
  "plot_b64": null
}
```

Response lỗi:

```json
{
  "status": "error",
  "message": "Mã thực thi bị lỗi.",
  "output": "",
  "logs": ["traceback text"],
  "success": false,
  "stdout": "",
  "stderr": "traceback text",
  "plot_b64": null
}
```

Response khi bị từ chối:

```json
{
  "status": "rejected",
  "message": "Code chưa được phê duyệt nên không thực thi.",
  "output": null,
  "logs": []
}
```

Ghi chú:

- Code chạy trên local DataFrame đọc từ `DATA_PATH`, mặc định `data/processed/final_data.csv`.
- `approved: true` là bắt buộc. Backend sẽ từ chối mọi request chưa được duyệt, kể cả khi có `prompt`.
- Backend chạy validator trước khi execute và từ chối code có thao tác không được phép như đọc file, gọi network hoặc subprocess.
- Nếu code tạo Matplotlib figure, backend có thể trả ảnh base64 qua `plot_b64`.
- Execution event được ghi vào JSON log local.

## GET /api/logs

Trả toàn bộ lịch sử tương tác hiện có.

Response:

```json
[
  {
    "timestamp": "2026-07-08T10:00:00",
    "event_type": "execute",
    "model": "openai/gpt-4.1-mini",
    "prompt": "Vẽ biểu đồ phổ điểm môn Toán",
    "generated_code": "",
    "explanation": "Markdown explanation",
    "executed_code": "print(df.head())",
    "status": "success",
    "output": "stdout text",
    "plot_b64": null
  }
]
```

Logs hiện tại lưu bằng JSON local tại:

```text
data/logs/interaction_history.json
```

SQLite hiện là hướng mở rộng/placeholder, không phải logging chính hiện tại.

## POST /api/logs/event

Ghi một sự kiện log thủ công, ví dụ người dùng hủy code trước khi thực thi.

Request:

```json
{
  "prompt": "Vẽ biểu đồ phổ điểm môn Toán",
  "generated_code": "print(df.head())",
  "explanation": "Markdown explanation",
  "executed_code": "",
  "status": "cancelled",
  "output": "Người dùng đã hủy, mã không được thực thi.",
  "event_type": "cancel"
}
```

Response:

```json
{
  "success": true
}
```

## GET /api/report/ai-usage

Tổng hợp lịch sử sử dụng AI từ JSON logs.

Response:

```json
{
  "total_logs": 10,
  "status_counts": {
    "success": 5,
    "cancelled": 2
  },
  "event_counts": {
    "generate": 5,
    "execute": 3,
    "cancel": 2
  },
  "recent_requests": []
}
```

## Execution Endpoint Aliases

Code backend hiện có các alias sau:

```text
POST /api/run
POST /api/execution/execute
POST /api/execution/run
```

Các alias này tồn tại để tương thích nội bộ. Endpoint chính dùng trong Next.js frontend và demo là:

```text
POST /api/execute
```
