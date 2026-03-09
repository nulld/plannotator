/**
 * Server-side share URL generation for remote sessions
 *
 * Generates a share URL from plan content so remote users
 * can open the review in their local browser without port forwarding.
 */

import { compress } from "@plannotator/shared/compress";
import { encrypt } from "@plannotator/shared/crypto";

const DEFAULT_SHARE_BASE = "https://share.plannotator.ai";
const DEFAULT_PASTE_API = "https://plannotator-paste.plannotator.workers.dev";

/**
 * Generate a share URL from plan markdown content.
 *
 * Returns the full hash-based URL. For remote sessions, this lets the
 * user open the plan in their local browser without any backend needed.
 */
export async function generateRemoteShareUrl(
  plan: string,
  shareBaseUrl?: string
): Promise<string> {
  const base = shareBaseUrl || DEFAULT_SHARE_BASE;
  const hash = await compress({ p: plan, a: [] });
  return `${base}/#${hash}`;
}

/**
 * Create a short share URL via paste service.
 * Returns null on failure (paste service unavailable).
 */
export async function createRemoteShortUrl(
  plan: string,
  shareBaseUrl?: string,
  pasteApiUrl?: string
): Promise<{ url: string; id: string } | null> {
  try {
    const base = shareBaseUrl || DEFAULT_SHARE_BASE;
    const pasteApi = pasteApiUrl || DEFAULT_PASTE_API;

    // Compress plan
    const compressed = await compress({ p: plan, a: [] });

    // Encrypt before uploading — server only sees ciphertext
    const { ciphertext, key } = await encrypt(compressed);

    // Post to paste service
    const response = await fetch(`${pasteApi}/api/paste`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: ciphertext }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const { id } = (await response.json()) as { id: string };
    // Key in fragment — never sent to server per HTTP spec
    const url = `${base}/p/${id}#key=${key}`;

    return { url, id };
  } catch {
    return null;
  }
}

/**
 * Format byte size as human-readable string
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 100 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
}

/**
 * Generate a remote share URL and write it to stderr for the user.
 * Tries to create short URL first, falls back to hash-based URL.
 * Silently does nothing on failure.
 */
export async function writeRemoteShareLink(
  content: string,
  shareBaseUrl: string | undefined,
  verb: string,
  noun: string,
  pasteApiUrl?: string
): Promise<void> {
  // Try short URL first if paste service is configured
  if (pasteApiUrl || shareBaseUrl) {
    const shortUrl = await createRemoteShortUrl(content, shareBaseUrl, pasteApiUrl);
    if (shortUrl) {
      process.stderr.write(
        `\n  Open this link on your local machine to ${verb}:\n` +
        `  ${shortUrl.url}\n\n` +
        `  (Short URL — ${noun}, annotations added in browser)\n\n`
      );
      return;
    }
  }

  // Fallback to hash-based URL
  const shareUrl = await generateRemoteShareUrl(content, shareBaseUrl);
  const size = formatSize(new TextEncoder().encode(shareUrl).length);
  process.stderr.write(
    `\n  Open this link on your local machine to ${verb}:\n` +
    `  ${shareUrl}\n\n` +
    `  (${size} — ${noun}, annotations added in browser)\n\n`
  );
}
