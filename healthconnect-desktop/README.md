# HealthConnect Desktop

Offline-first inventory and prescription desktop application for pharmacies and hospital dispensaries. The project is split into an Electron/React frontend and a NestJS backend microservice that synchronises with the wider HealthConnect platform. Role-based access controls ensure pharmacists, clerks, and hospital administrators see role-appropriate features.

## Project Layout

```
healthconnect-desktop/
├── backend/            # NestJS service (API, sync engine, RBAC, reporting)
├── frontend/           # Electron + React desktop client
├── ops/                # DevOps scripts, Dockerfiles, environment templates
└── docker-compose.yml  # Local orchestration (API, Postgres, Redis, desktop)
```

## Getting Started

1. Duplicate `ops/.env.template` to `.env` and fill in environment secrets (API keys, encryption secrets, etc.).
2. Build and run via Docker Compose:
   ```bash
   docker compose up --build
   ```
3. The backend API is exposed on `http://localhost:4000`. The Electron app is built into a container and available via noVNC for quick smoke tests, but you can also run it locally with `yarn dev`.

## Tech Stack

- **Backend**: NestJS 10, TypeORM, PostgreSQL, Redis, BullMQ, Passport JWT.
- **Frontend**: Electron 28, React 18, Redux Toolkit, React Query, IndexedDB (Dexie) for offline cache.
- **Messaging/Sync**: REST + WebSocket (Socket.IO) between desktop and backend, with resilient sync queue.

## Role-Based UX

Roles supported at launch:

- `pharmacist` – full inventory management, prescription fulfilment, sync operations.
- `clerk` – restricted inventory adjustments, fulfilment only, no configuration.
- `hospital_admin` – high-level dashboards, reporting, can invite/manage staff.

RBAC is enforced both in the backend (guards + policies) and in the frontend (route guards, feature flags).

## Testing Strategy

- Backend: Jest + Supertest, plus integration tests with a dockerised Postgres.
- Frontend: Vitest + React Testing Library, Playwright E2E pointing at the local backend.

## Deployment

- Local development uses Docker Compose.
- Production build pipelines produce OCI images for backend and signed installers for the desktop app.

Refer to `healthconnect-functionalities.md` for the complete functional specification implemented here.
