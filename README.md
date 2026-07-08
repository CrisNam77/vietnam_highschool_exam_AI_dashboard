# vietnam_highschool_exam_AI_dashboard

Dashboard phân tích và trực quan hóa điểm thi tốt nghiệp THPT Việt Nam giai đoạn 2022-2025, xây dựng bằng Streamlit và FastAPI, có khung tích hợp AI Assistant theo flow duyệt thủ công.

## Tech stack

- Python
- Streamlit
- FastAPI
- Pandas
- Plotly
- SQLite

## Cấu trúc thư mục

```text
app.py                  # Streamlit entrypoint
pages/                  # Các trang dashboard
components/             # UI components dùng lại
backend/app/            # FastAPI backend
src/                    # Data pipeline, metrics, visualization helpers
notebook/               # Notebook EDA và thiết kế metric
data/                   # raw/processed/mapping, chỉ track .gitkeep
database/               # SQLite local, không commit file .db
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

## Chạy FastAPI

```bash
uvicorn backend.app.main:app --reload
```

API docs chạy tại `http://localhost:8000/docs`.

## Chạy Streamlit

```bash
streamlit run app.py
```

Dashboard chạy tại `http://localhost:8501`.

## Cấu hình môi trường

Tạo file `.env` local từ `.env.example` khi cần:

```bash
cp .env.example .env
```

Không commit `.env`, API key, database local hoặc dữ liệu thật. Dữ liệu sau xử lý dự kiến đặt tại:

```text
data/processed/final_data.csv
```

## Trạng thái hiện tại

Boilerplate created. Dashboard, AI logic, SQLite logging và execution sandbox thật sẽ được triển khai sau.

AI Assistant hiện chỉ là skeleton. Flow bắt buộc trong các bước sau:

```text
AI sinh code -> hiển thị code -> chờ người dùng duyệt/chỉnh sửa -> FastAPI mới chạy local
```
