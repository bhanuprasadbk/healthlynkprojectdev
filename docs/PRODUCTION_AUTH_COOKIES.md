# Production httpOnly cookie auth (healthlynk.ai)

## Why login works but other APIs return `Missing cookie "access_token_cookie"`

| Environment | Browser calls | Cookie domain | Result |
|-------------|---------------|---------------|--------|
| **Local dev** | `http://localhost:5173/api/...` (Vite proxy) | Same origin | Cookie sent |
| **Production (broken)** | `https://dev.healthlynk.ai` → `https://healthlynkapi....azurewebsites.net/api/...` | Cross-site | Cookie **not** sent |
| **Production (fixed)** | `https://dev.healthlynk.ai/api/...` (SWA → App Service) | Same origin | Cookie sent |

Login `Set-Cookie` is stored for the **API host**. Cross-site `fetch` from `dev.healthlynk.ai` to `azurewebsites.net` does not include that cookie (see Network → no `Cookie` header).

## Fix: link App Service to Static Web Apps + same-origin `/api`

### 1. Azure Portal — link backend (required once)

1. Open your **Static Web App** (e.g. polite-dune-…).
2. **Settings** → **APIs** → **Link** (or **Manage linked backend**).
3. Select **healthlynkapi** App Service → **Link**.
4. Wait until status is linked.

Requests to `https://dev.healthlynk.ai/api/*` are proxied to the Flask app. Cookies are set on **healthlynk.ai**, so the browser sends them on every `/api` call.

### 2. Azure Portal — API Web App settings

| Setting | Value |
|---------|--------|
| `CORS_ORIGINS` | `https://dev.healthlynk.ai,https://www.dev.healthlynk.ai,https://polite-dune-00c7bae10.7.azurestaticapps.net,http://localhost:5173` |
| `JWT_COOKIE_SAMESITE` | `Lax` (same-origin via SWA) or `None` if you still call azurewebsites.net directly |
| `JWT_COOKIE_SECURE` | `true` |

**Disable** App Service → **API** → **CORS** (use `CORS_ORIGINS` only).

### 3. Redeploy frontend

The app now calls `/api` on the same host in production (`src/config/env.ts`). Rebuild and deploy Static Web Apps.

### 4. Verify

1. Open `https://dev.healthlynk.ai` → sign in.
2. Network → any API call → URL must be `https://dev.healthlynk.ai/api/...` (not `azurewebsites.net`).
3. Request headers → **Cookie**: `access_token_cookie=...`

`GET https://dev.healthlynk.ai/api/health` should return JSON (proves SWA → API link works).

## Alternative: custom API domain

Map `api.healthlynk.ai` to App Service and set `VITE_API_BASE_URL=https://api.healthlynk.ai/api` only if you do **not** use SWA same-origin proxy. Prefer same-origin `/api` above.
