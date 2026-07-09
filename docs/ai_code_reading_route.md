# Lộ trình đọc code module AI

Tài liệu này giúp đọc phần AI theo đúng luồng chạy thật của dự án, không đọc lan man theo cây thư mục. Nên đọc theo thứ tự từ trên xuống; mỗi phần có mục tiêu rõ ràng và các file quan trọng cần mở.

## 1. Bức tranh tổng quan

Luồng chính của module AI:

```text
User nhập prompt ở Next.js
-> Frontend gọi proxy /api/backend/...
-> FastAPI nhận POST /api/ai/generate
-> OpenRouter sinh explanation + Python code
-> Frontend hiển thị code chờ người dùng kiểm tra/chỉnh sửa
-> User bấm "Chấp nhận & Thực thi"
-> FastAPI nhận POST /api/execute hoặc /api/run
-> Backend chạy code trên DataFrame df
-> Backend gom stdout, stderr, plot base64, phân tích lại bằng AI nếu cần
-> Lưu log
-> Frontend hiển thị insight, bảng, biểu đồ, code
```

Đọc trước:

- `README.md`: cách chạy toàn dự án, biến môi trường, mô tả nhanh.
- `docs/ai_module_design.md`: thiết kế module AI, nguyên tắc bắt buộc, hướng DB/Prisma.
- `docs/api_contract.md`: hợp đồng API nếu cần đối chiếu request/response.

## 2. Entry point backend FastAPI

Mục tiêu: hiểu app backend được khởi tạo và gắn route như thế nào.

File cần đọc:

- `backend/app/main.py`
  - Tạo `FastAPI`.
  - Cấu hình CORS cho frontend local.
  - Gắn `api_router`.
  - Có route root `/`.

- `backend/app/api/router.py`
  - Gắn route health: `/api/...`.
  - Gắn AI route: `/api/ai/...`.
  - Gắn execution route ở cả `/api/...` và `/api/execution/...`.
  - Gắn logs route: `/api/logs`.
  - Tạo report: `/api/report/ai-usage`.

- `backend/app/core/config.py`
  - Đọc `.env`.
  - Các cấu hình quan trọng: `data_path`, `sqlite_db_path`, `openrouter_api_key`, `openrouter_model`, `openrouter_url`.

## 3. API sinh code AI

Mục tiêu: hiểu prompt người dùng được biến thành Python code như thế nào.

File cần đọc:

- `backend/app/api/routes/ai.py`
  - Endpoint chính: `POST /api/ai/generate`.
  - Nhận `AIGenerateRequest`.
  - Chuyển history sang dict.
  - Gọi `generate_code_and_explanation`.
  - Trả về `status="pending_approval"` để frontend biết code chưa được chạy.

- `backend/app/schemas/ai.py`
  - `AIHistoryMessage`: message lịch sử gồm role, content, output, code.
  - `AIGenerateRequest`: nhận `question` hoặc `prompt`, có `history`.
  - `text`: property chọn `question` trước, rồi `prompt`.
  - `AIGenerateResponse`: gồm `status`, `explanation`, `code`, `expected_output`, `warnings`.

- `backend/app/services/ai_service.py`
  - `SYSTEM_INSTRUCTION`: phần quan trọng nhất để điều khiển AI sinh code. Đọc kỹ toàn bộ rule ở đây.
  - `generate_code_and_explanation`: gọi OpenRouter, tách block ```python```, xử lý lỗi API.
  - `_build_generate_messages`: ghép system instruction, history, prompt mới.
  - `_sanitize_history`: giới hạn số message và độ dài context.
  - `_sanitize_placeholder_text`: tránh trả explanation có placeholder chưa render.
  - `_call_openrouter`: request trực tiếp tới OpenRouter bằng `urllib`.
  - `_format_openrouter_error`: chuyển lỗi OpenRouter thành thông báo tiếng Việt.

Điểm cần chú ý:

- Backend không thực thi code trong bước `/generate`.
- Code bắt buộc nằm trong block Python do AI trả về.
- System instruction yêu cầu dùng đúng tên cột kỹ thuật như `toan`, `ngu_van`, `ngoai_ngu`.
- Nếu thiếu `OPENROUTER_API_KEY`, backend trả explanation hướng dẫn cấu hình `.env` và code rỗng.

## 4. API thực thi code

Mục tiêu: hiểu code đã duyệt được chạy trên dữ liệu như thế nào.

File cần đọc:

- `backend/app/api/routes/execution.py`
  - Endpoint: `POST /api/run`.
  - Endpoint alias: `POST /api/execute`.
  - `_get_dataframe`: load và cache dữ liệu từ `settings.data_path`.
  - `run_code`: kiểm tra trạng thái approved/prompt, chạy code, sinh analysis, lưu log, trả response.

- `backend/app/schemas/execution.py`
  - `ExecutionRequest`: gồm `code`, `approved`, `prompt`, `explanation`.
  - `ExecutionResponse`: gồm `status`, `message`, `stdout`, `stderr`, `analysis`, `plot_b64`.

- `backend/app/services/execution_service.py`
  - Đây là file lõi khi đọc execution.
  - `execute_code`: tạo môi trường chạy code, redirect stdout/stderr, bắt lỗi, xuất biểu đồ base64.
  - `normalize_column_aliases`: tự đổi tên cột tiếng Việt sang tên kỹ thuật.
  - `normalize_unsupported_imports`: xử lý import `sklearn.linear_model.LinearRegression`.
  - `LinearRegression`: fallback nhỏ dùng `numpy`.
  - `print_table`: helper in Markdown table gọn.
  - `top_province_average`: helper nhanh cho top tỉnh điểm trung bình.
  - `_auto_distribution_insight`: tự tạo insight cho histogram nếu AI in thiếu số liệu.
  - `_find_result_dataframe`: tìm DataFrame kết quả nhỏ để tự in bảng nếu code không print.

Điểm cần chú ý:

- Code chạy bằng `exec(code, exec_globals)`.
- DataFrame truyền vào tên là `df`.
- Các thư viện có sẵn trong môi trường chạy: `pd`, `np`, `plt`, `sns`, `viz`.
- Backend dùng `matplotlib.use("Agg")` để render biểu đồ không cần GUI.
- Biểu đồ được trả về dạng base64 PNG qua `plot_b64`.
- Code hiện tại là môi trường thực thi tiện lợi cho demo/phân tích nội bộ, chưa phải sandbox bảo mật mạnh.

## 5. Sinh phân tích sau khi chạy code

Mục tiêu: hiểu vì sao sau khi chạy code có thêm phần insight tự nhiên.

File cần đọc:

- `backend/app/services/ai_service.py`
  - `generate_analysis_from_data`: lấy `prompt` và `stdout`, gọi OpenRouter để viết insight Markdown.
  - `_fallback_analysis_from_stdout`: nếu không gọi được AI, cố gắng rút số từ stdout để tạo insight cơ bản.
  - `_find_number`: bắt số từ text.
  - `_correlation_strength`: diễn giải mức tương quan.

Liên kết với:

- `backend/app/api/routes/execution.py`
  - Chỉ gọi `generate_analysis_from_data` khi execution thành công và stdout không rỗng.
  - Response trả cả `stdout` lẫn `analysis`.

## 6. Logging và lịch sử

Mục tiêu: hiểu lịch sử chạy mã được lưu và đọc như thế nào.

File cần đọc:

- `backend/app/services/log_service.py`
  - `LOG_FILE = data/logs/interaction_history.json`.
  - `init_log_file`: tạo file log nếu chưa có.
  - `load_logs`: đọc JSON log.
  - `log_interaction`: append một log mới.
  - `summarize_logs`: đếm status, event type, recent requests.

- `backend/app/api/routes/logs.py`
  - `GET /api/logs`: trả danh sách log.
  - `POST /api/logs/event`: ghi event từ frontend/backend.

- `backend/app/api/router.py`
  - `GET /api/report/ai-usage`: gọi `summarize_logs`.

Điểm cần chú ý:

- Hiện log chính vẫn lưu JSON ở `data/logs/interaction_history.json`.
- `docs/ai_module_design.md` mô tả hướng migration sang SQLite/Prisma.

## 7. Frontend Next.js

Mục tiêu: hiểu UI gọi API, bắt buộc duyệt code trước khi chạy, hiển thị kết quả.

File cần đọc:

- `frontend/src/app/page.tsx`
  - File lớn nhất của frontend AI.
  - `callApi`: helper gọi API qua `/api/backend`.
  - `ChatTab`: màn hình chat chính.
  - `sendPrompt`: gửi prompt tới `/api/ai/generate`.
  - `pending`, `editedCode`, `handleAccept`, `handleCancel`: state/flow duyệt code.
  - `executePythonCode`: gửi code đã duyệt tới `/api/execute`.
  - `ResultPanel`: hiển thị analysis, stdout, plot, code.
  - `HistoryTab`: đọc và hiển thị `/api/logs`.
  - `ApiTab`: tài liệu API hiển thị ngay trong giao diện.
  - Local storage key `examdata_ai_chat_sessions`: lưu session chat phía browser.

- `frontend/src/app/api/backend/[...path]/route.ts`
  - Proxy Next.js.
  - Đọc `BACKEND_URL` hoặc `NEXT_PUBLIC_API_URL`.
  - Forward GET/POST từ frontend sang FastAPI.
  - Giúp frontend gọi same-origin `/api/backend/...`.

- `frontend/src/app/globals.css`
  - Style tổng thể, custom scrollbar, markdown output, layout.

- `frontend/package.json`
  - Scripts chạy frontend.
  - Dependency chính: Next.js, React, Tailwind, React Markdown, syntax highlighter, Prisma.

Điểm cần chú ý:

- Frontend cố tình không chạy code ngay sau khi sinh.
- Người dùng có thể chỉnh code trước khi bấm chạy.
- Kết quả một lần chạy gồm text insight, bảng Markdown, biểu đồ base64 và code Python.

## 8. Database và Prisma

Mục tiêu: hiểu hướng lưu dữ liệu bền vững cho module AI.

File cần đọc:

- `frontend/prisma/schema.prisma`
  - Schema nguồn cho session, message, execution, artifact, feedback.

- `frontend/prisma/migrations/20260709003000_init_ai_module/migration.sql`
  - SQL migration tạo bảng.

- `backend/app/db/sqlite.py`
  - Kết nối SQLite phía backend nếu cần đọc/ghi DB.

- `backend/app/db/models.py`
  - Model/constant liên quan DB phía Python nếu có.

- `docs/ai_module_design.md`
  - Phần "Prisma Là Nguồn Schema Chính".
  - Phần "Migration Từ JSON Log Hiện Tại".

Điểm cần chú ý:

- Prisma đang được đặt trong frontend nhưng quản lý schema DB chung.
- Backend hiện vẫn log qua JSON; tài liệu thiết kế đã chuẩn bị hướng chuyển sang SQLite.

## 9. Dữ liệu và helper phân tích

Mục tiêu: hiểu `df` mà AI code sử dụng đến từ đâu.

File cần đọc:

- `src/viz.py`
  - Có `load_data`, được execution route dùng để load `settings.data_path`.

- `src/load_data.py`
  - Logic đọc dữ liệu nếu cần hiểu pipeline dữ liệu.

- `src/clean_data.py`
  - Làm sạch dữ liệu.

- `src/feature_engineering.py`
  - Tạo biến/đặc trưng phụ.

- `src/metrics.py`
  - Metric dùng trong dashboard/tests.

- `docs/data_schema.md`
  - Schema dữ liệu, tên cột, ý nghĩa cột.

Điểm cần chú ý:

- AI được yêu cầu dùng DataFrame `df`, không tự đọc file.
- File dữ liệu mặc định: `data/processed/final_data.csv`.
- Tên cột kỹ thuật phải khớp với rule trong `SYSTEM_INSTRUCTION`.

## 10. Tests nên đọc

Mục tiêu: hiểu hành vi nào đang được kiểm chứng.

File cần đọc:

- `tests/test_ai_api.py`
  - Test API sinh code AI.

- `tests/test_execution_api.py`
  - Test API thực thi code.

- `tests/test_logs_api.py`
  - Test logs/report.

- `tests/test_load_data.py`
  - Test load dữ liệu.

- `tests/test_metrics.py`
  - Test metric nền.

Khi sửa code AI, nên chạy:

```powershell
pytest tests/test_ai_api.py tests/test_execution_api.py tests/test_logs_api.py
```

Nếu sửa logic dữ liệu hoặc metric, chạy thêm:

```powershell
pytest
```

## 11. Thứ tự đọc nhanh trong 60-90 phút

Nếu chỉ có ít thời gian, đọc theo thứ tự này:

1. `docs/ai_module_design.md`
2. `backend/app/api/router.py`
3. `backend/app/api/routes/ai.py`
4. `backend/app/services/ai_service.py`
5. `backend/app/api/routes/execution.py`
6. `backend/app/services/execution_service.py`
7. `backend/app/services/log_service.py`
8. `frontend/src/app/api/backend/[...path]/route.ts`
9. `frontend/src/app/page.tsx`
10. `tests/test_ai_api.py`
11. `tests/test_execution_api.py`

## 12. Checklist tự kiểm tra sau khi đọc

Sau khi đọc xong, tự trả lời được các câu này là đã nắm module AI:

- Prompt từ frontend đi qua endpoint nào trước?
- Vì sao `/api/ai/generate` trả `pending_approval`?
- File nào chứa system prompt ép AI dùng đúng tên cột?
- Code Python được tách từ response AI bằng cách nào?
- Code đã duyệt chạy trong hàm nào?
- Môi trường `exec` có những biến/helper nào?
- Biểu đồ được chuyển thành `plot_b64` ở đâu?
- Nếu code không in bảng nhưng tạo DataFrame kết quả, backend xử lý thế nào?
- Log được lưu ở file nào?
- Frontend lưu lịch sử chat ở đâu?
- Next.js proxy sang backend bằng file nào?
- Schema DB tương lai của module AI nằm ở đâu?

## 13. Các điểm dễ nhầm

- `question` và `prompt` đều được hỗ trợ trong `AIGenerateRequest`; property `text` chọn `question` trước.
- Frontend gọi `/api/backend/api/ai/generate`, nhưng backend thật nhận `/api/ai/generate`. Phần `/api/backend` là proxy Next.js.
- Execution route được include hai lần, nên có thể gọi `/api/execute`, `/api/run`, `/api/execution/execute`, `/api/execution/run` tùy prefix.
- `approved` trong `ExecutionRequest` mặc định là `False`, nhưng route vẫn cho chạy nếu có `prompt`. Flow chuẩn vẫn là user duyệt từ frontend.
- `settings.ai_provider`, `openai_api_key`, `gemini_api_key` còn trong config, nhưng code hiện tại gọi OpenRouter qua `openrouter_api_key`.
- `data/logs/interaction_history.json` là log hiện tại; Prisma/SQLite là hướng thiết kế và migration.

## 14. Bản đồ file quan trọng

```text
backend/app/main.py                         # Khởi tạo FastAPI
backend/app/api/router.py                   # Gắn toàn bộ route backend
backend/app/api/routes/ai.py                # API sinh code AI
backend/app/api/routes/execution.py         # API chạy code đã duyệt
backend/app/api/routes/logs.py              # API lịch sử/log
backend/app/schemas/ai.py                   # Request/response AI
backend/app/schemas/execution.py            # Request/response execution
backend/app/services/ai_service.py          # Prompt hệ thống, gọi OpenRouter, sinh insight
backend/app/services/execution_service.py   # Môi trường exec, helper bảng/biểu đồ/insight
backend/app/services/log_service.py         # JSON log và report
backend/app/core/config.py                  # Cấu hình .env

frontend/src/app/page.tsx                # UI chat, duyệt code, chạy code, history, API docs
frontend/src/app/api/backend/[...path]/route.ts
                                               # Proxy Next.js -> FastAPI
frontend/src/app/globals.css             # CSS frontend
frontend/prisma/schema.prisma            # Schema DB mục tiêu

docs/ai_module_design.md                    # Thiết kế module AI
docs/api_contract.md                        # Hợp đồng API
docs/data_schema.md                         # Schema dữ liệu

tests/test_ai_api.py                        # Test sinh code
tests/test_execution_api.py                 # Test thực thi
tests/test_logs_api.py                      # Test logs/report
```
