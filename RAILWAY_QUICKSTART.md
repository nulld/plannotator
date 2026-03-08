# Railway Quick Start

Deploy paste-service + portal on Railway in 5 minutes.

## Prerequisites

- Railway account (https://railway.app)
- Railway CLI: `npm install -g @railway/cli`

## Deploy

```bash
# 1. Login to Railway
railway login

# 2. Create new project (or link existing)
railway init

# 3. Deploy
railway up

# 4. Add volume for persistent storage
# Go to Railway dashboard → Your service → Variables → Volumes
# Add volume: Mount Path = /data/pastes, Size = 1GB

# 5. Get your URL
railway open
```

Your app is now live! Test it:

- Portal: `https://yourapp.up.railway.app/share`
- API: `https://yourapp.up.railway.app/api/paste`
- Short URLs: `https://yourapp.up.railway.app/p/:id`

## Test Locally First

### Option 1: Without Docker (fastest)

```bash
# Run development server
bun run dev:railway

# In another terminal, test it
bun run test:railway
# or manually:
# open http://localhost:8080/share
```

### Option 2: With Docker (production-like)

```bash
# Build and run with Docker
docker build -f apps/paste-service/Dockerfile -t plannotator-railway .
docker run -p 8080:8080 plannotator-railway

# Test
bun run test:railway
# or manually:
# open http://localhost:8080/share
```

## Environment Variables (Optional)

Set in Railway dashboard → Variables:

- `PASTE_TTL_DAYS`: `7` (how long pastes live)
- `PASTE_MAX_SIZE`: `524288` (max paste size, 512KB)
- `PASTE_ALLOWED_ORIGINS`: `*` (CORS, or comma-separated domains)

## Custom Domain

Railway dashboard → Settings → Domains → Add Domain

Example:
- Add: `paste.yourdomain.com`
- DNS: `CNAME paste.yourdomain.com → yourapp.up.railway.app`

Now accessible at:
- `https://paste.yourdomain.com/share`
- `https://paste.yourdomain.com/p/:id`

## Full Documentation

See [apps/paste-service/RAILWAY.md](apps/paste-service/RAILWAY.md)
