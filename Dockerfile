# Insta Snapshot: the Next.js app and the Python backend in one container.
# The app runs the Python scripts as subprocesses and keeps its files in
# /app/data, which must be a persistent disk / volume on the host.
FROM node:20-bookworm-slim

# Python with the backend's packages, in a virtualenv.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    SNAPSHOT_PYTHON=/opt/venv/bin/python

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Frontend dependencies first (cached unless package files change).
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci

# Then the rest of the repo (see .dockerignore: no data, secrets or builds).
COPY . .
RUN cd frontend && npm run build

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
EXPOSE 3000

# data/ is the mounted disk; make sure it exists, then serve on the host's $PORT.
CMD ["sh", "-c", "mkdir -p /app/data && cd frontend && exec npx next start -p ${PORT:-3000}"]
