# Quick Start Guide

## Backend Setup (Local - Faster)

1. **Start Database:**

   ```bash
   docker compose up -d db
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run migrations:**

   ```bash
   npm run migration:run
   ```

4. **Start backend:**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:4100/api`

## Or Use Docker (Slower but complete)

```bash
docker compose up --build -d
```

## Flutter App

The Flutter app is already configured to use `http://localhost:4100/api` as the base URL.
