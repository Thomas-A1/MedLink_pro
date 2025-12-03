# Payments & Offline Test Guide

## Environment

Create `backend/.env` with:

```
APP_PORT=4000
DATABASE_URL=postgres://hc:hcpassword@postgres:5432/healthconnect_desktop
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=use-strong-secret
JWT_REFRESH_SECRET=use-strong-secret
ENCRYPTION_KEY=use-strong-secret
PAYSTACK_SECRET_KEY=sk_live_...            # provided by user
MNOTIFY_API_KEY=...                         # optional
```

## Docker (dev)

```
docker compose -f docker-compose.yml up -d postgres redis
docker compose -f docker-compose.yml up backend
```

Ensure backend prints: `HealthConnect Desktop API listening on port 4000`.

## Migrations

From `backend/`:

```
yarn typeorm migration:run
```

This creates `payment_intents`, `sales`, `sale_items`, `pharmacy_services`, etc.

## Test Sales → Paystack

1. Login as admin; select a pharmacy.
2. Go to Inventory, ensure at least one in-stock item.
3. Sales → Add item → click “Pay with Paystack”.
4. Browser opens Paystack checkout; complete payment.
5. Paystack will POST webhook to `/api/integrations/paystack/webhook`.
6. After success, check:
   - Sales table shows new sale with `paymentMethod = paystack`
   - Inventory decreased accordingly
   - Activity log updated

## Test Prescriptions → Paystack

1. Prescriptions → Assign sample code (e.g. RX-1001).
2. Click “Pay via Paystack” → complete payment.
3. Webhook marks prescription fulfilled and reduces stock (1 per medication if available).

## Test Services → Paystack

1. Services → Add service with price and activate.
2. Click “Pay via Paystack” → complete payment.
3. Webhook records a paid service as a sale entry (no items) for audit.

## Offline behavior

- Recording cash sales and inventory adjustments works offline (no Paystack).
- When back online, UI fetches updated sales and inventory.
- Paystack requires internet to initialize and to receive webhook.

## Troubleshooting

- Webhook signature: ensure raw-body is enabled (done in `main.ts`).
- If webhook is unreachable locally, use a tunnel (e.g., `ngrok http 4000`) and set Paystack webhook URL to `https://<ngrok>/api/integrations/paystack/webhook`.
- 403 on endpoints: ensure you’re authenticated and role matches (Pharmacist/Clerk/Admin).
