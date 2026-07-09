# vietnam_highschool_exam_AI_dashboard

Dashboard phân tích và trực quan hóa điểm thi tốt nghiệp THPT Việt Nam giai đoạn 2022-2025, xây dựng bằng Streamlit, FastAPI và Next.js AI Assistant.

## Tech stack

- Python
- Streamlit
- FastAPI
- Next.js
- Pandas
- Matplotlib / Seaborn / Plotly
- SQLite / JSON log local

## Cấu trúc thư mục

```text
app.py                  # Streamlit entrypoint
pages/                  # Các trang dashboard
components/             # UI components dùng lại
backend/app/            # FastAPI backend theo cấu trúc main
backend/app/services/   # AI, execution, logging services
ai_frontend/            # Next.js frontend cho AI Assistant
src/                    # Data pipeline, metrics, visualization helpers
notebook/               # Notebook EDA và thiết kế metric
data/                   # raw/processed/mapping, chỉ track .gitkeep
database/               # SQLite local do Prisma migration tạo, không commit file .db
outputs/                # Chart/table exports, không commit output lớn
reports/                # Báo cáo dữ liệu, storyboard, AI usage
docs/                   # API contract, data schema, runbook
tests/                  # Unit/API tests tối thiểu
scripts/                # Utility scripts
```

## Cài đặt

```bash
pip install -r requirements.txt
```

## Chạy nhanh trên Windows

Chạy cả backend và frontend AI:

```cmd
run_all.cmd
```

Sau đó mở:

- Frontend AI: http://localhost:3000
- Backend docs: http://localhost:8001/docs

## Chạy từng phần

Backend:

```cmd
run_backend.cmd
```

Frontend AI:

```cmd
run_frontend.cmd
```

Lệnh này sẽ tự vào thư mục `ai_frontend`, cài dependency nếu chưa có `node_modules`, cấu hình backend tại `http://localhost:8001`, rồi chạy Next.js dev server.

Nếu muốn chạy thủ công:

```cmd
cd ai_frontend
npm install
set NEXT_PUBLIC_API_URL=http://localhost:8001
set BACKEND_URL=http://127.0.0.1:8001
npm run dev
```

Frontend Next.js chạy tại `http://localhost:3000`.

Streamlit dashboard:

```bash
streamlit run app.py
```

Dashboard chạy tại `http://localhost:8501`.

## Cấu hình môi trường

Tạo file `.env` local từ `.env.example` khi cần:

```bash
cp .env.example .env
```

Điền OpenRouter nếu dùng AI Assistant:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4.1-mini
```

Không commit `.env`, API key, database local hoặc dữ liệu thật. Dữ liệu sau xử lý dự kiến đặt tại:

```text
data/processed/final_data.csv
```

## Flow AI Assistant

```text
Người dùng nhập prompt -> AI sinh code -> người dùng kiểm tra/chỉnh sửa và xác nhận -> FastAPI thực thi trên DataFrame -> frontend hiển thị phân tích, bảng, biểu đồ và mã Python thu gọn trong một box
```

Flow xác nhận trước khi chạy là bắt buộc. Phải giữ các state/UI: `pending`, `setPending`, `PendingReview`, `editedCode`, `handleAccept`, `handleCancel`, khối `Vui lòng kiểm tra...`, nút `Chấp nhận & Thực thi`.

DB schema của module AI được quản lý bằng Prisma tại `ai_frontend/prisma/schema.prisma`; SQLite local mặc định là `database/app.db`.

Các endpoint chính:

- `POST /api/ai/generate`: sinh mã Python và giải thích.
- `POST /api/execute`: thực thi mã sau khi người dùng xác nhận.
- `GET /api/logs`: xem lịch sử tương tác.
- `POST /api/logs/event`: ghi sự kiện hủy/chưa thực thi.
- `GET /api/report/ai-usage`: tóm tắt sử dụng AI.
