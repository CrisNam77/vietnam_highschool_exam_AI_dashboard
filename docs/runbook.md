# Local Runbook

Runbook này mô tả cách chạy local hai service chính:

```text
FastAPI Backend
Next.js Frontend
```

## Prerequisites

- Python 3.10+
- Node.js
- npm
- Git
- OpenRouter API key nếu muốn dùng AI generate thật

## 1. Setup Python Backend

Tạo virtual environment:

```bash
python -m venv .venv
```

Windows:

```cmd
.venv\Scripts\activate
pip install -r requirements.txt
```

Linux/WSL:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Setup Environment

Tạo file `.env` local từ `.env.example`.

Linux/WSL:

```bash
cp .env.example .env
```

Windows:

```cmd
copy .env.example .env
```

Nếu dùng AI Assistant thật, điền:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4.1-mini
```

Không commit `.env`.

## 3. Run FastAPI Backend

Windows script:

```cmd
run_backend.cmd
```

Hoặc chạy thủ công:

```bash
uvicorn backend.app.main:app --reload --port 8001
```

Backend docs:

```text
http://localhost:8001/docs
```

## 4. Setup Next.js Frontend

Nếu chạy bằng `run_frontend.cmd`, script sẽ vào `frontend/` và cài dependency khi thiếu `node_modules`.

Setup thủ công:

```bash
cd frontend
npm install
```

## 5. Prepare Dashboard Data

Dữ liệu cho frontend dashboard không dùng mock data nữa mà dùng dữ liệu thật xuất từ `final_data.csv`. Để tạo file dữ liệu tĩnh cho Next.js, hãy chạy script ETL:

```bash
python scripts/generate_dashboard_json.py
```

Lệnh này sẽ phân tích dữ liệu và tạo ra file `frontend/src/data/data.ts` (khoảng 1MB) giúp tối ưu hóa Turbopack.

## 6. Run Next.js Frontend

Windows script:

```cmd
run_frontend.cmd
```

Hoặc chạy thủ công từ `frontend/`:

```bash
npm run dev
```

Next.js Frontend:

```text
http://localhost:3000
```

Ghi chú:

- Frontend gọi FastAPI thông qua proxy `/api/backend/...`.
- Backend target chuẩn là `http://localhost:8001`.

## 6. Demo Trợ lý AI

Checklist:

- Backend đang chạy ở port `8001`.
- Frontend đang chạy ở port `3000`.
- Có `.env` nếu dùng AI thật.
- Có `OPENROUTER_API_KEY` nếu muốn generate code thật.
- Có `data/processed/final_data.csv` nếu muốn execute phân tích thật.
- Mở tab Trợ lý AI, nhập câu hỏi, kiểm tra code ở trạng thái chờ duyệt, sau đó hủy hoặc phê duyệt thực thi.

## 7. Demo Dashboard Pages

Frontend Next.js hiện có 5 khu vực chính:

1. Tổng quan
2. Xu hướng & Môn học
3. Phổ điểm & Tổ hợp
4. Địa phương & Vùng miền
5. Trợ lý AI

History/logs nằm trong khu vực Trợ lý AI. FastAPI Docs vẫn truy cập trực tiếp tại `http://localhost:8001/docs`.

Các dashboard section có thể được triển khai dần bằng API/data summary riêng mà không cần thêm frontend khác.

## 8. Troubleshooting

- Nếu AI generate không trả code, kiểm tra `OPENROUTER_API_KEY`, credit/quota và model.
- Nếu execute lỗi thiếu dữ liệu, kiểm tra `DATA_PATH` và file `data/processed/final_data.csv`.
- Nếu frontend không gọi được backend, kiểm tra `BACKEND_URL`, `NEXT_PUBLIC_API_URL` và port `8001`.
- Nếu frontend chưa có dependencies, chạy `npm install` trong `frontend/`.
- Không commit `.env`, API key, data, logs, database local hoặc outputs.

## Local URLs

```text
Next.js Frontend: http://localhost:3000
FastAPI Backend: http://localhost:8001
FastAPI Docs: http://localhost:8001/docs
```

## Notes

- Logs hiện tại lưu JSON local tại `data/logs/interaction_history.json`.
- SQLite là hướng mở rộng/placeholder, không phải logging chính hiện tại.
