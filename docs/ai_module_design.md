# AI Analysis Module Design

## Mục Tiêu

Module AI Analysis phục vụ luồng bắt buộc:

```text
User prompt -> AI sinh code -> User kiểm tra/chỉnh sửa và xác nhận -> Backend thực thi -> Lưu lịch sử -> Frontend hiển thị một box phân tích
```

Bước xác nhận của người dùng trước khi thực thi là bắt buộc. Phải giữ các state/UI: `pending`, `setPending`, `PendingReview`, `editedCode`, `handleAccept`, `handleCancel`, khối `Vui lòng kiểm tra...`, nút `Chấp nhận & Thực thi`.

## Prisma Là Nguồn Schema Chính

Schema DB được quản lý bằng Prisma tại:

```text
frontend/prisma/schema.prisma
```

Migration Prisma nằm tại:

```text
frontend/prisma/migrations/
```

Database local mặc định:

```text
database/app.db
```

Prisma 6 đọc `DATABASE_URL` từ `frontend/.env`. Backend Python vẫn có thể đọc/ghi SQLite file `database/app.db` bằng `sqlite3` hoặc repository riêng. Prisma chịu trách nhiệm quản lý schema và migrations.

## Nguyên Tắc Thiết Kế

- Một prompt tạo một bản code chờ duyệt; execution chỉ được tạo sau khi người dùng xác nhận.
- Một câu trả lời AI hiển thị trong một box chính, gồm biểu đồ, bảng/số liệu, insight và mã Python thu gọn.
- Output phải có số liệu cụ thể, không chỉ nhận xét chung.
- Bảng phải dùng Markdown table hoặc artifact có cấu trúc, không in DataFrame thô.
- Prisma schema là nguồn sự thật cho session, execution, artifacts và feedback.
- SQLite là database mặc định cho local/demo; Prisma giúp migration lên Postgres dễ hơn sau này.

## Model Chính

### `ChatSession`

Lưu một phiên chat.

| Field | Ghi chú |
| :--- | :--- |
| `id` | UUID |
| `title` | Tiêu đề ngắn từ prompt đầu |
| `createdAt` | Thời điểm tạo |
| `updatedAt` | Tự cập nhật khi session đổi |
| `archivedAt` | Ẩn khỏi lịch sử nếu có |

### `ChatMessage`

Lưu message user/assistant.

| Field | Ghi chú |
| :--- | :--- |
| `id` | UUID |
| `sessionId` | FK tới session |
| `role` | `user` hoặc `assistant` |
| `content` | Prompt hoặc phần phân tích |
| `createdAt` | Thời điểm tạo |

### `AiExecution`

Lưu một lần chạy code sau khi người dùng xác nhận.

| Field | Ghi chú |
| :--- | :--- |
| `id` | UUID |
| `sessionId` | FK tới session |
| `userMessageId` | Prompt gốc |
| `assistantMessageId` | Message trả lời nếu có |
| `model` | Model sinh code |
| `prompt` | Prompt gốc |
| `explanation` | Explanation từ AI |
| `generatedCode` | Code AI sinh |
| `executedCode` | Code đã chạy sau khi người dùng duyệt/chỉnh |
| `status` | `success`, `error`, `cancelled` |
| `stdout` | Output chính |
| `stderr` | Lỗi/cảnh báo |
| `runtimeMs` | Thời gian chạy |
| `createdAt` | Thời điểm tạo |

### `ExecutionArtifact`

Lưu output phụ như biểu đồ, bảng, file export.

| Field | Ghi chú |
| :--- | :--- |
| `id` | UUID |
| `executionId` | FK tới execution |
| `type` | `plot_png`, `table_markdown`, `text`, `file` |
| `title` | Tên hiển thị |
| `content` | Markdown/text/base64 nhỏ |
| `filePath` | Nếu artifact lớn |
| `mimeType` | Ví dụ `image/png` |
| `createdAt` | Thời điểm tạo |

### `FeedbackEvent`

Lưu like/dislike và ghi chú người dùng.

| Field | Ghi chú |
| :--- | :--- |
| `id` | UUID |
| `messageId` | Assistant message |
| `executionId` | Execution liên quan |
| `rating` | `like`, `dislike` |
| `note` | Ghi chú |
| `createdAt` | Thời điểm tạo |

## Lệnh Prisma

Chạy trong thư mục `frontend`:

```powershell
npm run prisma:generate
npm run prisma:migrate -- --name change_name
npm run prisma:studio
```

Nếu cần override DB path:

```powershell
$env:DATABASE_URL="file:../../database/app.db"
npm run prisma:migrate -- --name init
```

Ghi chú môi trường local Windows hiện tại: nếu Prisma migrate engine trả lỗi trống khi ghi SQLite, dùng migration SQL trong `frontend/prisma/migrations/` để tạo `database/app.db`. Schema vẫn lấy từ Prisma, không dùng `database/schema.sql`.

## API Design

### `POST /api/ai/generate`

Sinh code và explanation để frontend hiển thị bước duyệt/chỉnh sửa.

### `POST /api/execute`

Thực thi code đã được người dùng xác nhận. Không dùng endpoint này để chạy code chưa duyệt.

### `POST /api/chat/run`

Endpoint mục tiêu nếu gom flow lưu DB: chỉ nhận code đã được người dùng xác nhận.

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

## Migration Từ JSON Log Hiện Tại

Nguồn hiện tại: `data/logs/interaction_history.json`.

| JSON field | Prisma model/field |
| :--- | :--- |
| `prompt` | `ChatMessage.content`, `AiExecution.prompt` |
| `explanation` | `AiExecution.explanation` |
| `generated_code` | `AiExecution.generatedCode` |
| `executed_code` | `AiExecution.executedCode` |
| `status` | `AiExecution.status` |
| `output` | `AiExecution.stdout` |
| `plot_b64` | `ExecutionArtifact.content` với `type='plot_png'` |
| `timestamp` | `createdAt`, `updatedAt` |

Mỗi log cũ có thể tạo một session riêng nếu không có session id.

## Implementation Plan

1. Dùng `frontend/prisma/schema.prisma` làm schema chính.
2. Chạy Prisma migration để tạo `database/app.db`.
3. Backend Python đọc/ghi `database/app.db` qua repository SQLite.
4. Tạo service lưu session, message, execution, artifact, feedback.
5. Giữ flow frontend: `/api/ai/generate` -> hiển thị code chờ duyệt -> `/api/execute` sau khi người dùng xác nhận.
6. Nếu thêm `/api/chat/run`, endpoint này chỉ nhận code đã xác nhận, không bỏ qua bước duyệt.
7. Thêm script migrate JSON log sang DB Prisma-managed SQLite.
