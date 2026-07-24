FROM python:3.11-slim

WORKDIR /app

COPY requirements-backend.txt .
RUN pip install --no-cache-dir -r requirements-backend.txt

COPY backend/ backend/
COPY src/ src/

ENV HF_HOME=/tmp/hf_cache \
    MPLCONFIGDIR=/tmp/mpl \
    LOG_PATH=/tmp/logs/interaction_history.json \
    PYTHONPATH=/app

EXPOSE 7860

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
