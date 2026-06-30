# Deploying to Railway

The admin console is a static Vite SPA. It builds to `dist/` and is served by a
tiny static server with SPA history-fallback (so deep links like `/users/abc`
survive a refresh). Deployment is containerised via the [`Dockerfile`](./Dockerfile);
[`railway.json`](./railway.json) pins Railway to that build.

## ⚠️ The one thing to know: env vars are baked in at BUILD time

Vite inlines every `VITE_*` variable into the JS bundle **when it builds** — not
when the container starts. So `VITE_API_BASE_URL` must be set as a Railway
variable **before/at build**, and **changing it requires a redeploy** (a plain
restart won't pick up a new value). The `Dockerfile` declares these as `ARG`, and
Railway passes service variables as Docker build args, so setting them in the
Railway dashboard is all you need.

## Steps (GitHub → Railway dashboard)

1. **Push this repo to GitHub** (see "Commit & push" below).

2. **Create the project on Railway**
   - Railway dashboard → **New Project → Deploy from GitHub repo** → pick this repo.
   - Railway detects the `Dockerfile` / `railway.json` and starts the first build.
   - (Root Directory: leave as the repo root — the `Dockerfile` lives there.)

3. **Set service variables** (Service → **Variables**), then **redeploy**:
   | Variable | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | Your absolute admin API origin, e.g. `https://api.parkingslot.com/api/v1/admin` |
   | `VITE_ENV_NAME` | `production` (or `staging`) — shown on the top-bar badge |
   | `VITE_USE_MOCK` | `false` (the mock only ever runs in dev anyway) |
   | `VITE_SENTRY_DSN` | optional |

   Do **not** set `PORT` — Railway injects it and the server binds to it automatically.

4. **Expose it** — Service → **Settings → Networking → Generate Domain**. Railway
   gives you a `*.up.railway.app` URL (add a custom domain there if you have one).

5. **Open the domain.** You'll get the login screen. Sign in with a real admin
   account from your backend (`email + password + TOTP`).

## Backend requirements (real API)

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
docker run -p 8080:8080 admin-console   # → http://localhost:8080
```
