# Use Python 3.11 (more compatible with ML libraries)
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    nodejs \
    npm \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm ci && npm run build
RUN mkdir -p /app/backend/static && cp -r dist/* /app/backend/static/

# Install Python dependencies
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -e /app/openflam

# Update yt-dlp to latest (YouTube frequently changes their API)
RUN pip install --no-cache-dir --upgrade yt-dlp

# Set environment variables
ENV PYTHONPATH=/app/openflam/src
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start the application (use shell form to expand $PORT variable)
WORKDIR /app/backend
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
