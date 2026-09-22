# Peymanyar AI worker

Free-tier backend proxy for Persian voice transcription and financial receipt extraction.

Required encrypted secret: `GROQ_API_KEY`.

Endpoints:

- `POST /transcribe` with multipart field `file`
- `POST /receipt` with multipart field `file`
- `GET /health`

Never add the API key to GitHub or frontend JavaScript.
