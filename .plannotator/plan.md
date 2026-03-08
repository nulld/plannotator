# Railway Deployment Plan: Paste Service + Share Portal

## Goal

Deploy both paste-service API and share portal in a single Railway container:
- `/api/paste/*` → paste-service API (existing handler)
- `/share` and `/` → static portal files

## Architecture Decision

Use a single Bun server instead of Nginx + separate services:
- **Simpler deployment** - one container, one process
- **Native static serving** - Bun.serve() can serve static files efficiently
- **Unified routing** - single request handler for API + static

## Implementation Steps

### 1. Create Multi-Stage Dockerfile

**Location:** `apps/paste-service/Dockerfile`

```dockerfile
# Stage 1: Build portal static files
FROM oven/bun:1 AS portal-builder
WORKDIR /app
COPY package.json bun.lockb ./
COPY apps/portal ./apps/portal
COPY packages ./packages
RUN bun install --frozen-lockfile
RUN bun run build:portal

# Stage 2: Final runtime image
FROM oven/bun:1-slim
WORKDIR /app

# Copy paste-service code
COPY apps/paste-service ./apps/paste-service
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy built portal from stage 1
COPY --from=portal-builder /app/apps/portal/dist ./apps/paste-service/public/share

# Environment defaults
ENV PASTE_PORT=8080
ENV PASTE_DATA_DIR=/data/pastes
ENV NODE_ENV=production

# Create data directory
RUN mkdir -p /data/pastes

# Expose port
EXPOSE 8080

# Start server
CMD ["bun", "run", "apps/paste-service/targets/railway.ts"]
```

### 2. Create Railway Target Server

**Location:** `apps/paste-service/targets/railway.ts`

New Bun server that serves both API and static files:

```typescript
import { join } from "path";
import { file } from "bun";
import { handleRequest } from "../core/handler";
import { corsHeaders, getAllowedOrigins } from "../core/cors";
import { FsPasteStore } from "../stores/fs";

const port = parseInt(process.env.PORT || process.env.PASTE_PORT || "8080", 10);
const dataDir = process.env.PASTE_DATA_DIR || "/data/pastes";
const ttlDays = parseInt(process.env.PASTE_TTL_DAYS || "7", 10);
const ttlSeconds = ttlDays * 24 * 60 * 60;
const maxSize = parseInt(process.env.PASTE_MAX_SIZE || "524288", 10);
const allowedOrigins = getAllowedOrigins(process.env.PASTE_ALLOWED_ORIGINS);

const store = new FsPasteStore(dataDir);
const staticDir = join(import.meta.dir, "../public/share");

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin, allowedOrigins);

    // API routes - delegate to existing handler
    if (url.pathname.startsWith("/api/paste")) {
      return handleRequest(request, store, cors, { maxSize, ttlSeconds });
    }

    // Try to serve static file for /share/* paths
    let fsPath: string | null = null;

    if (url.pathname === "/") {
      fsPath = join(staticDir, "index.html");
    } else if (url.pathname === "/share" || url.pathname === "/share/") {
      fsPath = join(staticDir, "index.html");
    } else if (url.pathname.startsWith("/share/")) {
      // Direct /share/* files (assets, etc.)
      fsPath = join(staticDir, url.pathname.replace("/share/", ""));
    } else {
      // All other paths (including /p/<id>) → SPA fallback to index.html
      // Portal will handle /p/<id> via client-side routing
      fsPath = join(staticDir, "index.html");
    }

    const staticFile = file(fsPath);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Railway server running on port ${port}`);
console.log(`API: /api/paste/*`);
console.log(`Portal: /share, /, and /p/<id> (SPA routing)`);
console.log(`Storage: ${dataDir}`);
console.log(`TTL: ${ttlDays} days`);
```

### 3. Update package.json

**Location:** `apps/paste-service/package.json`

Add railway-specific scripts:

```json
{
  "scripts": {
    "dev": "bun run targets/bun.ts",
    "dev:cf": "wrangler dev",
    "deploy:cf": "wrangler deploy",
    "railway": "bun run targets/railway.ts",
    "build": "echo 'Build handled by root workspace'"
  }
}
```

### 4. Create Railway Configuration

**Location:** `railway.toml`

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/paste-service/Dockerfile"

[deploy]
startCommand = "bun run railway"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### 5. Environment Variables for Railway

Configure in Railway dashboard or via `railway.json`:

```json
{
  "PORT": "8080",
  "PASTE_DATA_DIR": "/data/pastes",
  "PASTE_TTL_DAYS": "7",
  "PASTE_MAX_SIZE": "524288",
  "PASTE_ALLOWED_ORIGINS": "*",
  "NODE_ENV": "production"
}
```

### 6. Add .dockerignore

**Location:** `apps/paste-service/.dockerignore`

```
node_modules
*.log
.env*
dist
.wrangler
```

## Path Routing Summary

| Request Path | Handler | Response |
|-------------|---------|----------|
| `/api/paste` (POST) | paste-service API | JSON with paste ID |
| `/api/paste/:id` (GET) | paste-service API | JSON with paste data |
| `/share` | Static files | Portal index.html (SPA) |
| `/share/*` | Static files | Portal assets (js, css, etc.) |
| `/` | Static files | Portal index.html |
| `/p/:id` | Static files | Portal index.html (SPA routing) |
| `/*` (other) | Static files | SPA fallback to index.html |

**How short URLs work:**
1. User shares: portal generates paste via `POST /api/paste` → gets ID `abc123`
2. Share URL: `https://domain/p/abc123` (or `https://domain/p/abc123#key=xyz` with encryption)
3. On visit: server serves portal's index.html
4. Portal JS detects `/p/abc123` path → fetches `GET /api/paste/abc123` → loads plan

## Volume Configuration

Railway persistent storage for paste data:
- Mount point: `/data/pastes`
- Configure in Railway dashboard: Settings → Volumes → Add Volume

## Deployment Commands

```bash
# Build and test locally
docker build -f apps/paste-service/Dockerfile -t plannotator-railway .
docker run -p 8080:8080 -v $(pwd)/data:/data plannotator-railway

# Deploy to Railway
railway link  # Link to Railway project
railway up    # Deploy
```

## Benefits of This Approach

1. **Single container** - simpler than multi-service setup
2. **No reverse proxy** - Bun handles routing natively
3. **Fast static serving** - Bun.serve() is optimized for static files
4. **Cost effective** - one Railway service instead of two
5. **Easy local development** - `bun run railway` mirrors production

## Testing Plan

1. Build Docker image locally
2. Test API endpoints: `curl localhost:8080/api/paste`
3. Test portal: open `http://localhost:8080/share` in browser
4. Verify root redirect: open `http://localhost:8080/`
5. Test SPA routing: refresh on any portal route
6. Deploy to Railway staging first

## Follow-up Tasks

- [ ] Add health check endpoint (`/health`)
- [ ] Configure Railway metrics and logging
- [ ] Set up automatic deployments from GitHub
- [ ] Add PASTE_ALLOWED_ORIGINS whitelist for production
- [ ] Configure custom domain in Railway
