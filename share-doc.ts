/**
 * share-doc.ts
 * Usage: bun share-doc.ts [file.md] [paste-service-url]
 *
 * Compresses + encrypts a markdown file and posts it to the paste service.
 * Outputs a shareable URL for the Plannotator portal.
 *
 * Example:
 *   bun share-doc.ts test-document.md https://alert-fulfillment-dev.up.railway.app
 */

import { readFileSync } from "fs";

const filePath = process.argv[2] || "test-document.md";
const serviceUrl = (process.argv[3] || "https://alert-fulfillment-dev.up.railway.app").replace(/\/$/, "");

const markdown = readFileSync(filePath, "utf-8");

// --- Compress (deflate-raw + base64url) ---

async function compress(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  const arr = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// --- Encrypt (AES-256-GCM) ---

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function encrypt(compressed: string): Promise<{ ciphertext: string; key: string }> {
  const cryptoKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(compressed);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  const rawKey = await crypto.subtle.exportKey("raw", cryptoKey);
  return {
    ciphertext: bytesToBase64url(combined),
    key: bytesToBase64url(new Uint8Array(rawKey)),
  };
}

// --- Main ---

const payload = { p: markdown, a: [] };

console.log(`📄 File: ${filePath} (${markdown.length} chars)`);
console.log(`🌐 Service: ${serviceUrl}`);

const compressed = await compress(payload);
const { ciphertext, key } = await encrypt(compressed);

const response = await fetch(`${serviceUrl}/api/paste`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ data: ciphertext }),
});

if (!response.ok) {
  console.error(`❌ Paste service error: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const { id } = (await response.json()) as { id: string };
const url = `${serviceUrl}/p/${id}#key=${key}`;

console.log(`\n✅ Done! Open this URL to review the document:\n`);
console.log(`   ${url}\n`);
