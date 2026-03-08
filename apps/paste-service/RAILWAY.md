# Railway Deployment Guide

Deploy both paste-service API and share portal in a single Railway container.

## Quick Start

### 1. Local Testing

```bash
# Build Docker image
docker build -f apps/paste-service/Dockerfile -t plannotator-railway .

# Run locally
docker run -p 8080:8080 -v $(pwd)/data:/data plannotator-railway

# Test endpoints
curl -X POST http://localhost:8080/api/paste \
  -H "Content-Type: application/json" \
  -d '{"data":"test123"}'

# Open portal
open http://localhost:8080/share
```

### 2. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project (or create new)
railway link

# Deploy
railway up

# View logs
railway logs
```

## Environment Variables

Configure in Railway dashboard:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port (Railway sets this automatically) |
| `PASTE_DATA_DIR` | `/data/pastes` | Storage directory for pastes |
| `PASTE_TTL_DAYS` | `7` | Days before pastes expire |
| `PASTE_MAX_SIZE` | `524288` | Max paste size in bytes (512KB) |
| `PASTE_ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |
| `PLANNOTATOR_SHARE_URL` | - | Base URL for share links (e.g., `https://yourapp.up.railway.app`) |
| `PLANNOTATOR_PASTE_URL` | - | Base URL for paste API (e.g., `https://yourapp.up.railway.app`) **without** `/api/paste` |

## Persistent Storage

Configure a Railway volume:

1. Go to Railway dashboard → Your service
2. Click **Variables** → **Volumes**
3. Add volume:
   - **Mount Path**: `/data/pastes`
   - **Size**: 1GB (or as needed)

Without a volume, pastes will be lost on restarts.

## URL Structure

After deployment, your Railway URL (e.g., `https://yourapp.up.railway.app`) will serve:

| Path | Function |
|------|----------|
| `/api/paste` (POST) | Create new paste → returns `{id}` |
| `/api/paste/:id` (GET) | Retrieve paste data |
| `/share` | Portal UI (share viewer) |
| `/p/:id` | Short URL for shared plans |
| `/` | Redirects to portal |

## Custom Domain

1. Railway dashboard → Your service → **Settings** → **Domains**
2. Add custom domain (e.g., `paste.yourdomain.com`)
3. Update DNS:
   - **CNAME**: `paste.yourdomain.com` → Railway URL
4. Portal will automatically work at:
   - `https://paste.yourdomain.com/share`
   - `https://paste.yourdomain.com/p/:id`

## Architecture

```
┌─────────────────────────────────────┐
│         Railway Container           │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Bun Server (railway.ts)    │  │
│  │                              │  │
│  │  /api/paste/* → Paste API    │  │
│  │  /share       → Portal SPA   │  │
│  │  /p/:id       → Portal SPA   │  │
│  │  /            → Portal SPA   │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Static Files (/public/share)│  │
│  │  - index.html                │  │
│  │  - assets/*.js               │  │
│  │  - assets/*.css              │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Volume: /data/pastes        │  │
│  │  - Persistent paste storage  │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Monitoring

```bash
# View logs
railway logs

# Check service status
railway status

# Open in browser
railway open
```

## Troubleshooting

### Portal shows 404
- Check that portal was built in Dockerfile stage 1
- Verify files exist: `docker run --rm -it plannotator-railway ls -la /app/apps/paste-service/public/share`

### Pastes disappear on restart
- Add Railway volume at `/data/pastes`
- Verify mount: `railway logs | grep "Storage:"`

### CORS errors
- Set `PASTE_ALLOWED_ORIGINS` in Railway env vars
- Format: `https://app1.com,https://app2.com`

### Build fails
- Ensure `bun.lockb` is committed to git
- Check Railway build logs: `railway logs --deployment`

## Local Development

### Quick Start (No Docker)

```bash
# From project root - builds portal + starts server
bun run dev:railway

# Test it
bun run test:railway

# Visit http://localhost:8080/share
```

### Manual Steps

```bash
# 1. Build portal
bun run build:portal

# 2. Create symlink for static files
mkdir -p apps/paste-service/public
ln -sf $(pwd)/apps/portal/dist apps/paste-service/public/share

# 3. Run railway server
bun run --cwd apps/paste-service railway
```

## Cost Optimization

Railway pricing tips:
- Use 1 service (this setup) instead of 2 separate services
- Enable **Execution Only** mode (pay only when running)
- Set auto-sleep after inactivity (if low traffic)
- Monitor usage: Railway dashboard → **Metrics**
