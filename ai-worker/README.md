# Peymanyar AI worker

Free-tier backend proxy for Persian voice transcription and financial receipt extraction.

Required encrypted secret: `GROQ_API_KEY`.

Endpoints:

- `POST /transcribe` with multipart field `file`
- `POST /receipt` with multipart field `file`
- `GET /health`

Never add the API key to GitHub or frontend JavaScript.

## Prepared Persian speech integration (not deployed)

`persian-transcription.mjs` calls Groq's `whisper-large-v3` with language `fa`
and returns the model's transcript without spelling replacements or prompts.
The frontend already sends the entire recording to `POST /transcribe`.

The currently deployed `worker.js` is not present in this repository. The new
module is prepared and request-tested, but publishing GitHub Pages does not
activate it on Cloudflare. Obtain the current Worker source and deployment
access before integrating it. Keep the existing request authentication, upload
limits, rate limiting, CORS and `/receipt` behavior.

In the existing Worker's module scope:

```js
import { transcribePersianAudio } from './persian-transcription.mjs';
```

Replace only the existing speech transcription function's upstream call:

```js
const result = await transcribePersianAudio(incoming.get('file'), env);
return json(result, 200, origin);
```

After deployment, verify a real Persian recording returns `model:
"whisper-large-v3"` and compare its raw text with what was spoken. A successful
`GET /health` or a mocked request test alone does not establish recognition
accuracy. Provider documentation: https://console.groq.com/docs/speech-to-text
