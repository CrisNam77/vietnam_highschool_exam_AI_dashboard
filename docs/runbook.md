# Local Runbook

## Setup

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

## Run FastAPI

```bash
uvicorn backend.app.main:app --reload
```

Docs: `http://localhost:8000/docs`

## Run Streamlit

```bash
streamlit run app.py
```

App: `http://localhost:8501`

## Test

```bash
pytest
```

## Notes

Không commit dữ liệu thật, database local hoặc API key. Tạo `.env` từ `.env.example` trên máy local khi cần.
