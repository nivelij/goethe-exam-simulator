FROM --platform=linux/amd64 python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY worker.py .
COPY worker_db.py .
COPY prompts/ ./prompts/

# Environment variables will be set at runtime via ECS task definition
# DO NOT HARDCODE SECRETS HERE

# Run the worker
CMD ["python", "worker.py"]