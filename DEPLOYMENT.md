# Deployment Guide for File60 (Bunny Only)

This project deploys:
- Backend API as a Bunny Edge standalone script (`bunny-edge/api.ts`)
- Frontend static assets to Bunny Storage/CDN (`ui/dist`)

## Prerequisites

- Node.js + npm
- Deno (for local Bunny Edge script execution)
- Bunny account with:
  - Storage Zone
  - Pull Zone/CDN URL
  - Edge Script enabled

## Environment Variables

Use `.dev.vars` locally and Bunny dashboard env vars in production.

Required backend vars:
- `JWT_SECRET`
- `BUNNY_STORAGE_ZONE`
- `BUNNY_STORAGE_ACCESS_KEY`
- `BUNNY_STORAGE_REGION` (example: `Falkenstein`)
- `BUNNY_PUBLIC_URL` (example: `https://file60.b-cdn.net`)

Frontend vars:
- `VITE_API_URL` (Bunny Edge API URL)
- `VITE_TURNSTILE_SITE_KEY`

## Local Development

Run backend + frontend:

```bash
npm run dev
```

This starts:
- `dev:bunny-edge` (Deno standalone API)
- `dev:ui` (Vite frontend)

## Deploy Frontend (Bunny CDN)

```bash
npm run deploy:ui
```

This runs:
1. `npm run build:ui`
2. `npm run bunny:upload`
3. `npm run bunny:purge` (if purge env vars are set)

## Deploy Backend (Bunny Edge)

1. Open Bunny Dashboard -> Edge Scripts -> Standalone.
2. Paste code from `bunny-edge/api.ts`.
3. Add backend env vars listed above.
4. Publish script and copy URL.
5. Set frontend `VITE_API_URL` to that URL.

