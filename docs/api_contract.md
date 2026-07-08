# API Contract

Base URL local: `http://localhost:8000`

## GET /api/health

Trả trạng thái service.

Response:

```json
{
  "status": "ok",
  "service": "vietnam-highschool-exam-ai-dashboard"
}
```

## POST /api/ai/generate

Tạo code phân tích ở trạng thái chờ duyệt. Boilerplate hiện trả response giả lập.

Request:

```json
{
  "question": "So sánh điểm Toán theo vùng miền",
  "context": {}
}
```

Response:

```json
{
  "status": "pending_approval",
  "explanation": "...",
  "code": "...",
  "expected_output": "table",
  "warnings": []
}
```

## POST /api/execution/run

Nhận code và trạng thái phê duyệt. Boilerplate chưa thực thi code thật.

Request:

```json
{
  "code": "summary = df.groupby('vung_mien')['toan'].mean()",
  "approved": false
}
```

Response khi chưa phê duyệt:

```json
{
  "status": "rejected",
  "message": "Code chưa được phê duyệt nên không thực thi.",
  "output": null,
  "logs": []
}
```

## GET /api/logs

Trả danh sách logs. Boilerplate hiện trả danh sách rỗng.

## GET /api/logs/{log_id}

Trả chi tiết một log theo `log_id`, hoặc `404` nếu không tồn tại.
