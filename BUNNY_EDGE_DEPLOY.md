# Deploying to Bunny Edge

This backend is **fully compatible** with Bunny Edge runtime and uses:
- **`@bunny.net/edgescript-sdk`** for HTTP server
- **`@bunny.net/storage-sdk`** for file uploads to Bunny Storage
- **`@libsql/client/http`** for Bunny Database (uses standard `fetch`, no Node deps)
- **`jose`** for JWT signing/verification (pure Web Crypto API)

## Build and Deploy

### 1. Build the bundle

```bash
npm run build:bunny-edge
```

This creates **`bunny-edge/dist/api.bundle.js`** (IIFE bundle, ~540KB).

### 2. Deploy to Bunny Edge

1. Go to **Bunny Dashboard → Edge Platform → Edge Scripts**
2. Create or open your Edge Script
3. **Copy** the contents of `bunny-edge/dist/api.bundle.js`
4. **Paste** into the script editor
5. Click **Publish**

### 3. Set environment variables

Go to **Environment** tab in your Edge Script and add:

#### Required
- `JWT_SECRET` – Random string for session tokens
- `B2_ENDPOINT` – e.g., `https://s3.us-east-005.backblazeb2.com`
- `B2_REGION` – e.g., `us-east-005`
- `B2_ACCESS_KEY_ID` – B2 Application Key ID
- `B2_SECRET_ACCESS_KEY` – B2 Application Key
- `B2_BUCKET_NAME` – Your B2 bucket name
- `BUNNY_PUBLIC_URL` – CDN URL for file links, e.g., `https://cdn-file60.bythub.in`

#### Database (required)
Use **Database → Access → "Add Secrets to Edge Script"** to inject:
- `BUNNY_DATABASE_URL` (format: `libsql://[id].lite.bunnydb.net`)
- `BUNNY_DATABASE_AUTH_TOKEN`

#### Storage CORS Setup
Before uploading from the browser, you MUST set up CORS on your B2 bucket. Run:
```bash
node scripts/setup-b2-cors.mjs
```
(Ensure your `.env` has the correct B2 credentials first).

#### Optional
- `MAX_FILE_SIZE` – Max upload bytes (default: 100MB)
- `CORS_ORIGIN` – Override CORS origin (default: `*`)
- `ALLOW_DB_HEALTH_DIAG=1` – Allow health diagnostics on public URLs

### 4. Verify deployment

```bash
curl https://your-edge-script.bunny.net/api/health
# {"ok":true,"service":"file60-api","runtime":"bunny-edge",...}
```

## Runtime Features

### Environment Detection

The API automatically detects:
- **`bunny-edge`** – Running on Bunny Edge (Deno.mainModule starts with `ext:`)
- **`deno-local`** – Local dev with `npm run dev:bunny-edge`
- **`unknown`** – Other environments

Check via: `GET /api/health` → `"runtime": "bunny-edge"`

### Database Health Check

**Localhost / internal only** (or set `ALLOW_DB_HEALTH_DIAG=1`):

```bash
curl http://localhost:8787/api/health?db=1
# Shows database_ping, database_host, database_error if any
```

### Error Handling

Errors return structured JSON:

```json
{
  "error": "Human-readable message",
  "step": "storage_upload" | "database" | null
}
```

Storage failures → **502**, DB failures → **503**, auth → **401**, validation → **400**.

## Local Development

Local dev uses `npm run dev:bunny-edge` (Deno, not Bunny Edge).

Environment variables are loaded from **`.env`** then **`.dev.vars`** in the repo root (no shell sourcing, so JWTs work reliably).

On **Bunny Edge**, the dotenv loader skips (no file system) and uses only dashboard environment variables.

## Dependencies

All dependencies are **Edge-compatible**:
- No Node.js builtins
- No file system APIs (except local dev `.env` loading)
- No process-specific APIs
- Standard `fetch`, `crypto`, `TextEncoder`, etc.

The bundle is **self-contained** (all deps inlined by esbuild).

## Troubleshooting

### "Invalid URL: '../' with base 'ext:main.ts'"
Fixed: dotenv loader now skips when `Deno.mainModule` is not a `file:` URL.

### Database not working on Edge
1. Check: `GET /api/health?db=1` (add `ALLOW_DB_HEALTH_DIAG=1` if needed)
2. Confirm `BUNNY_DATABASE_URL` ends with `.bunnydb.net` (not truncated)
3. Use **"Add Secrets to Edge Script"** for reliable injection
4. The URL is auto-converted from `libsql://` to `https://` for the HTTP client

### Storage uploads fail
- Check `BUNNY_STORAGE_ZONE` and `BUNNY_STORAGE_ACCESS_KEY` are correct
- Match `BUNNY_STORAGE_REGION` to the zone's region
- Response JSON includes `step: "storage_upload"` and detailed error

### Session issues
- Ensure `JWT_SECRET` is set
- Cross-domain cookies need `BUNNY_PUBLIC_URL` to match the CDN origin

## Production Checklist

- [ ] Build bundle: `npm run build:bunny-edge`
- [ ] Deploy to Bunny Edge
- [ ] Set all required env vars
- [ ] Add database secrets via dashboard
- [ ] Test: `GET /api/health` returns `"runtime":"bunny-edge"`
- [ ] Test: `POST /api/session` returns 200 + JWT
- [ ] Test: Upload a file and confirm it appears in Storage and DB
- [ ] Configure CORS if needed
- [ ] Remove `ALLOW_DB_HEALTH_DIAG=1` from production (or keep for internal debugging)
