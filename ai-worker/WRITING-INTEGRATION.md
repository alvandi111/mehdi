# Writing and correspondence service (revision 111)

Frontend and archive are deployable independently. AI features require integrating
`writing.mjs` into the **current** Cloudflare Worker. Do not replace the current
Worker with the old repository worker.js: its speech service must remain intact.

1. Download/export the current deployed Worker before changing it.
2. Add `writing.mjs` alongside it and import:

```js
import { writing, correspondenceOCR } from './writing.mjs';
```

3. Inside the existing authenticated request handler, before its 404 response, add:

```js
if (request.method === 'POST' && url.pathname === '/compose') {
  return writing(request, env, origin);
}
if (request.method === 'POST' && url.pathname === '/correspondence-ocr') {
  return correspondenceOCR(request, env, origin);
}
```

Use the existing encrypted `GROQ_API_KEY` secret. Optional `WRITING_MODEL` and
`WRITING_VISION_MODEL` override the defaults; do not place keys in GitHub or the
client. Keep current authentication, allowed origins, quota/rate controls,
transcription, receipt and cash-table routes. This adds no account permissions.
Deploy through the owner's Cloudflare deployment access, then test synthetic
Persian text and a synthetic image before using real correspondence.

POST /compose JSON: {"kind":"report|letter|quote","text":"..."}.
POST /correspondence-ocr multipart: file (PNG/JPEG/WebP <=12MiB).
PDF originals are archived locally; image OCR does not parse PDFs.

The local register allocates sequential numbers only at finalization, across all
letter/document kinds per Persian year, using Web Locks and the current storage
snapshot. It is NOT a shared multi-device numbering service. Configure one issuing
browser until server-based numbering is implemented. Voided numbers remain reserved.

Model references checked 2026-10-09:
https://console.groq.com/docs/model/llama-3.3-70b-versatile
https://console.groq.com/docs/vision
