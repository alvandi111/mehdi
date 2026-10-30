# Contextual voice interpretation — staged, not deployed

This change replaces revision 140's dropdown-first review for financial commands with a contextual AI interpretation, then explicit approval and the existing financial form. Other command routes are unchanged. It does not save transactions during analysis.

## Behavior

- Send only the current account's project IDs/names/aliases and person IDs/names/aliases/roles/project associations. Never send balances, full transactions, emails, phone numbers or credentials in the model prompt.
- Preserve the original transcript. Display a natural-language interpretation with the complete amount in digits and Persian words.
- Resolve names against supplied IDs. Show candidate buttons only when unresolved. New entities require explicit selection and are created only by the existing final confirmation.
- Check the quoted amount against the original text and the local arithmetic parser. A discrepancy blocks approval.
- Text edits invalidate approval. A stale network response cannot populate a replaced form. Recheck chosen IDs/names against current account data before transferring.
- If AI is unavailable, say so and offer the existing manual form; do not label local parsing as AI.

## Required production rollout

**Do not merge the frontend until the live Worker is inspected and the backend is deployed.** The checked-in `ai-worker/worker.js` is not confirmed to match the currently deployed Worker; do not replace the live Worker wholesale with it.

1. Retrieve the current Cloudflare `peymanyar-ai` Worker source. Preserve its existing transcription, receipt, compose and auth routes.
2. Add `ai-worker/interpret.mjs` and route POST `/interpret` to `interpret(request, env, origin)`, as demonstrated in this branch's Worker diff.
3. Reuse the existing `GROQ_API_KEY`. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` (publishable/anon, NOT service role) for the same project as the gateway. Optional `INTERPRET_MODEL` defaults to `llama-3.3-70b-versatile`.
4. Deploy the Worker. Its interpretation route authenticates via Supabase Auth and consumes the existing `ai` entitlement/quota itself. Unauthenticated and disabled accounts must fail. It performs no database writes except the existing quota RPC.
5. Deploy the updated `peymanyar-ai-gateway`: it permits `/interpret`, forwards the user's Authorization token and skips its own quota debit only for this route, avoiding a double charge. Existing routes retain their previous checks. Preserve the existing verify_jwt=false setting because the function explicitly validates the bearer token.
6. Test an authorized synthetic request through the gateway, then a revoked account and quota exhaustion. Do not log real transcripts or bearer tokens.
7. Merge the frontend changes, bump the app revision from the then-current version, and verify on iPhone/Android. Test both exact and ambiguous names, an unavailable provider and an edited transcript.

## Validation

`node tests/interpret-worker.test.mjs`

`CLOUD_FAKE_IDB=<installed fake-indexeddb path> node tests/voice-interpretation.test.cjs`

`CLOUD_FAKE_IDB=<installed fake-indexeddb path> node tests/voice-finance-intent.test.cjs`

The UI test uses the existing application scripts and a mocked model response. It checks interpretation, original transcript retention, no writes before final confirmation, and a synthetic saved 2,500,000-toman transaction with the correct person. Worker tests mock provider/Auth/quota APIs; live model accuracy and deployment remain unverified.
