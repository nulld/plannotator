import { join } from "path";
import { file } from "bun";
import { handleRequest } from "../core/handler";
import { corsHeaders, getAllowedOrigins } from "../core/cors";
import { FsPasteStore } from "../stores/fs";

const port = parseInt(process.env.PORT || process.env.PASTE_PORT || "8080", 10);
// Use /data/pastes in production (Railway/Docker), ./data/pastes locally
const dataDir = process.env.PASTE_DATA_DIR ||
  (process.env.NODE_ENV === "production" ? "/data/pastes" : "./data/pastes");
const ttlDays = parseInt(process.env.PASTE_TTL_DAYS || "7", 10);
const ttlSeconds = ttlDays * 24 * 60 * 60;
const maxSize = parseInt(process.env.PASTE_MAX_SIZE || "524288", 10);
const allowedOrigins = getAllowedOrigins(process.env.PASTE_ALLOWED_ORIGINS);

// Portal configuration (for share URLs)
const shareBaseUrl = process.env.PLANNOTATOR_SHARE_URL || process.env.SHARE_BASE_URL;
const pasteApiUrl = process.env.PLANNOTATOR_PASTE_URL || process.env.PASTE_API_URL;

const store = new FsPasteStore(dataDir);
const staticDir = join(import.meta.dir, "../public/share");

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin, allowedOrigins);

    // API: Portal configuration
    if (url.pathname === "/api/plan") {
      return Response.json({
        plan: "", // Empty plan for standalone mode
        sharingEnabled: true,
        ...(shareBaseUrl && { shareBaseUrl }),
        ...(pasteApiUrl && { pasteApiUrl }),
      });
    }

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
    } else if (url.pathname.startsWith("/assets/")) {
      // Direct /assets/* files (for portal assets)
      fsPath = join(staticDir, url.pathname);
    } else {
      // All other paths (including /p/<id>) → SPA fallback to index.html
      // Portal will handle /p/<id> via client-side routing
      fsPath = join(staticDir, "index.html");
    }

    const staticFile = file(fsPath);
    if (await staticFile.exists()) {
      // Determine Content-Type based on file extension
      const ext = fsPath.split('.').pop()?.toLowerCase();
      const contentType = {
        'js': 'application/javascript',
        'mjs': 'application/javascript',
        'css': 'text/css',
        'html': 'text/html',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'eot': 'application/vnd.ms-fontobject',
      }[ext || ''] || 'application/octet-stream';

      return new Response(staticFile, {
        headers: {
          'Content-Type': contentType,
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Railway server running on port ${port}`);
console.log(`API: /api/paste/*`);
console.log(`Portal: /share, /, and /p/<id> (SPA routing)`);
console.log(`Storage: ${dataDir}`);
console.log(`TTL: ${ttlDays} days`);
