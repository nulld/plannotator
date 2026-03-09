# Test Plan

This is a test document to verify Plannotator remote share URL generation.

## Features to Test

- ✅ Compression (deflate)
- ✅ Encryption (AES-256-GCM)
- ✅ Paste service upload
- ✅ Short URL generation

## Expected Output

The CLI should generate a short URL like:
`https://plannotator-production.up.railway.app/p/{id}#key={key}`

The paste service will store encrypted data, and the decryption key stays in the URL fragment (never sent to server).
