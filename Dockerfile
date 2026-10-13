# ==============================================================================
# TraceNet Production Multi-Stage Dockerfile
# Serves both the FastAPI Backend and the React Frontend SPA on a single port.
# ==============================================================================

# Stage 1: Build Frontend SPA
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY src/frontend/package*.json ./
RUN npm install

COPY src/frontend/ ./
RUN npm run build

# Stage 2: Python Backend with Unified Static Serving
FROM python:3.11-slim AS production
WORKDIR /app

# Prevent Python from writing .pyc and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and initial demo data
COPY src/ ./src/
COPY data/ ./data/
COPY pytest.ini ./

# Copy compiled frontend from Stage 1 into backend static directory
COPY --from=frontend-builder /app/frontend/dist ./src/frontend/dist
COPY src/frontend/public ./src/frontend/public

# Seed deterministic demonstration database (25 accounts, 94 transactions)
RUN python -m src.backend.data_generator

# Expose port (default 8000, compatible with cloud $PORT overrides)
ENV PORT=8000
ENV HOST=0.0.0.0
EXPOSE 8000

# Run Uvicorn ASGI server
CMD ["sh", "-c", "uvicorn src.backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
