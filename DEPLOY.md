# Deploying to Railway

The admin console is a static Vite SPA. It builds to `dist/` and is served by a
tiny static server with SPA history-fallback (so deep links like `/users/abc`
survive a refresh). Deployment is containerised via the [`Dockerfile`](./Dockerfile);
[`railway.json`](./railway.json) pins Railway to that build.

## ⚠️ The one thing to know: env vars are baked in at BUILD time

Vite inlines every `VITE_*` variable into the JS bundle **when it builds** — not
when the container starts. So these must be set as Railway variables
**before/at build**, and **changing one requires a redeploy** (a plain restart
won't pick up a new value). The `Dockerfile` declares them as `ARG`, and Railway
passes service variables as Docker build args, so setting them in the Railway
dashboard is all you need.

## Option A — Demo deploy, no backend (recommended if the admin API isn't built yet)

The console can serve itself entirely from in-memory fixtures, so the Railway URL
is a fully clickable demo with sample data across every module. No API, no CORS.

1. **Push this repo to GitHub** (see "Commit & push" below).
2. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
   Railway detects the `Dockerfile`/`railway.json` and builds. (Root Directory = repo root.)
3. **Service → Variables**, then **redeploy**:
   | Variable | Value |
   | --- | --- |
   | `VITE_USE_MOCK` | `true` ← serves the in-memory fixtures |
   | `VITE_ENV_NAME` | `staging` (top-bar badge; it's a demo, not real prod) |

   Don't set `PORT` (Railway injects it) and don't bother with `VITE_API_BASE_URL`
   (the mock intercepts API calls before they hit the network).
4. **Settings → Networking → Generate Domain** to get the public URL.
5. Open it and **log in with `admin@parkingslot.com` / `admin`** (any TOTP code).
   That demo admin holds all permissions, so every module is visible.

When the real admin API later exists, switch to Option B (flip `VITE_USE_MOCK` to
`false`, set `VITE_API_BASE_URL`, redeploy).

## Option B — Real admin API

1–2. Same as above (push + create the Railway project).
3. **Service → Variables**, then **redeploy**:
   | Variable | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | Your absolute admin API origin, e.g. `https://api.parkingslot.com/api/v1/admin` |
   | `VITE_ENV_NAME` | `production` |
   | `VITE_USE_MOCK` | `false` |
   | `VITE_SENTRY_DSN` | optional |
4. **Settings → Networking → Generate Domain**.
5. Open the domain and sign in with a real admin account (`email + password + TOTP`).

### Backend requirements (Option B only)

Because the console runs on a Railway domain and calls your API on a **different
origin**, the admin API must:

- **CORS:** send `Access-Control-Allow-Origin: https://<your-railway-domain>`
  and `Access-Control-Allow-Credentials: true` (a wildcard `*` is **not** allowed
  with credentials). Handle preflight `OPTIONS` for `Authorization`,
  `Content-Type`, and `Idempotency-Key` headers.
- **Refresh cookie:** the httpOnly refresh cookie must be set with
  `SameSite=None; Secure` so the browser sends it cross-site over HTTPS — otherwise
  the silent token refresh (and staying logged in) won't work.

If you'd rather avoid cross-origin entirely, host the API and this SPA under the
same domain (API at `/api/v1/admin`, SPA everything else) behind one proxy, and
set `VITE_API_BASE_URL=/api/v1/admin`.

## Commit & push

```bash
git add -A
git commit -m "Add Railway deploy config"
# create a repo and push (GitHub CLI):
gh repo create parkingslot-admin-console --private --source=. --push
# …or add an existing remote:
git remote add origin git@github.com:<you>/parkingslot-admin-console.git
git push -u origin HEAD
```

## Local Docker parity (optional)

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.parkingslot.com/api/v1/admin -t admin-console .
docker run -e PORT=8080 -p 8080:8080 admin-console   # → http://localhost:8080
# (without PORT, serve listens on 3000)
```
