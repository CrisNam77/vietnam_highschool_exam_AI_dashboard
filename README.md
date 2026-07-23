# vietnam_highschool_exam_AI_dashboard

Dashboard phân tích và trực quan hóa điểm thi tốt nghiệp THPT Việt Nam giai đoạn 2022-2026, dùng Next.js làm frontend duy nhất, FastAPI làm backend và Python cho data pipeline.

## Architecture

```text
User
└── Next.js Frontend
    ├── Tổng quan
    ├── Xu hướng & Môn học
    ├── Phổ điểm & Tổ hợp
    ├── Địa phương & Vùng miền
    ├── Trợ lý AI
    └── gọi FastAPI backend qua proxy /api/backend/...

FastAPI Backend
├── AI API
├── Execution API
├── Logs API
├── Report API
└── đọc dữ liệu local khi cần

Python src/
├── cleaning / preprocessing
├── data loading
├── metrics
└── visualization/data helpers
```

## Tech Stack

Frontend:

- Next.js
- TypeScript
- React
- Tailwind CSS

Backend:

- FastAPI
- Python
- Pandas
- Matplotlib / Seaborn / Plotly
- JSON log local hiện tại; SQLite optional/future

Data:

- Python scripts
- CSV processed data
- EDA notebooks

## Project Structure

```text
frontend/               # Next.js frontend duy nhất: dashboard và Trợ lý AI
backend/app/            # FastAPI backend
src/                    # Data pipeline, metrics, visualization helpers
notebook/               # EDA notebooks
data/                   # raw/processed/mapping, chỉ track .gitkeep
database/               # local database nếu dùng sau này
outputs/                # local chart/table outputs
reports/                # Data quality report, AI usage, storyboard
docs/                   # API contract, data schema, runbook
tests/                  # Tests
scripts/                # Utility scripts
scripts/windows/start_dashboard.cmd
scripts/windows/start_backend.cmd
scripts/windows/start_frontend.cmd
requirements.txt
.env.example
.gitignore
README.md
```

## Requirements

- Python 3.10+
- Node.js
- npm
- OpenRouter API key nếu muốn dùng AI generate thật

## Install Python Dependencies

```bash
pip install -r requirements.txt
```

## Quick Start On Windows

Chạy backend và frontend:

```cmd
scripts\windows\start_dashboard.cmd
```

Local URLs:

- Next.js Frontend: http://localhost:3000
- FastAPI Backend: http://localhost:8001
- FastAPI Docs: http://localhost:8001/docs

## Run Each Service

FastAPI backend:

```cmd
scripts\windows\start_backend.cmd
```

Next.js frontend:

```cmd
scripts\windows\start_frontend.cmd
```

Manual backend:

```bash
uvicorn backend.app.main:app --reload --port 8001
```

Manual frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment Configuration

Tạo file `.env` local từ `.env.example` khi cần:

```bash
cp .env.example .env
```

Trên Windows:

```cmd
copy .env.example .env
```

Điền OpenRouter nếu dùng AI Assistant thật:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4.1-mini
```

Không commit `.env`, API key, database local, data raw/processed lớn, outputs hoặc logs local.

## Data

Dữ liệu sau xử lý được đọc từ:

```text
data/processed/final_data.csv
```

File dữ liệu thật không được commit. Dữ liệu từ `final_data.csv` sẽ được ETL script (`scripts/generate_dashboard_json.py`) xử lý và xuất ra thành module TypeScript tĩnh tại `frontend/src/data/data.ts` (không commit) để tối ưu hóa hiệu suất build của Next.js (Turbopack).

Schema chính thức được mô tả trong `docs/data_schema.md` và dựa trên `src/clean_data.py` cùng `reports/data_quality_report.md`.

## Trợ lý AI Flow

```text
Người dùng nhập câu hỏi
→ AI sinh code và giải thích
→ Hiển thị code ở trạng thái chờ duyệt
→ Người dùng chỉnh sửa hoặc hủy
→ Người dùng phê duyệt
→ FastAPI thực thi code trên local DataFrame
→ Trả kết quả/logs
```

Logs hiện tại được lưu dạng JSON local tại:

```text
data/logs/interaction_history.json
```

## Frontend Sections

Next.js frontend gồm 5 khu vực chính:

1. Tổng quan
2. Xu hướng & Môn học
3. Phổ điểm & Tổ hợp
4. Địa phương & Vùng miền
5. Trợ lý AI

History/logs được hiển thị trong khu vực Trợ lý AI. Tài liệu API backend xem tại:

```text
http://localhost:8001/docs
```

## Main API Endpoints

- `GET /api/health`: kiểm tra trạng thái backend.
- `POST /api/ai/generate`: sinh mã Python và giải thích.
- `POST /api/execute`: endpoint chính để thực thi code đã được duyệt từ Next.js frontend.
- `GET /api/logs`: xem lịch sử tương tác.
- `POST /api/logs/event`: ghi sự kiện như hủy/chưa thực thi.
- `GET /api/report/ai-usage`: tóm tắt sử dụng AI.

Backend hiện có một số alias execution để tương thích nội bộ, nhưng endpoint chính dùng cho demo/frontend là `POST /api/execute`.

## Current Status

- Next.js là frontend duy nhất.
- Trợ lý AI đã có flow Next.js + FastAPI.
- Frontend Next.js có 4 khu vực chính **đã được tích hợp dữ liệu thi thật (2022-2026)** thông qua pipeline xuất sang `data.ts`.
- Các filter (Chương trình, Năm, Vùng miền, Môn học) được liên kết động và tối ưu UX (slider, dropdown SVG).
- Data pipeline đã có logic xử lý chính.

## Do Not Commit

- `.env`
- API keys
- dữ liệu raw/processed lớn
- database local
- outputs local
- logs local
