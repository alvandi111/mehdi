# Project warehouse access — next stage

Revision 104 adds the owner's project inventory ledger. It does not activate cross-account sharing. The deployed backend currently has only the RLS-protected `peymanyar_personal_snapshots` table; colleagues must never receive the owner's complete snapshot or credentials.

## Access model

- Owner: all project warehouses; approve corrections, manage catalogue, invite and revoke warehouse staff.
- Warehouse staff / guard: named project only; submit arrivals, use, returns and handovers; view stock and their own submissions. No project finance, invoices containing prices, personal accounts, other projects or member administration.
- Old posted records cannot be overwritten or deleted by staff. Corrections are separate requests approved by the owner. Preserve before/after details, actor, server time, reason and original movement ID.
- Catalogue is shared within the owner's workspace, never across unrelated owners. A proposed new item can be attached to the submission and accepted inline by the owner.

## Server design

Use separate inventory tables, not snapshot-sharing policies: workspace catalogue, project inventory scope, project memberships, movements, correction requests, audit events and expiring invitations. Project keys pair the owner's authenticated user ID with the existing stable project ID; display names are never authorization keys.

Enable RLS, revoke anonymous access and require authenticated project membership for every inventory read/write. Staff insert policies must validate project scope, server-authenticated actor and permitted movement type. Only the owner can change memberships, approve corrections and delete/reverse posted movements. No client-supplied role or user metadata is trusted.

An invite is an expiring, revocable, single-use opaque token stored as a hash. Accepting requires sign-in and the intended recipient identity. Do not send an invitation until the owner chooses the recipient and project. The owner may revoke membership immediately; enforce fresh membership on every request.

Post a multi-item receipt and a transfer atomically, with a unique request ID for retry protection. Check source stock on the server with concurrent-writer locking. Store attachment access separately; staff-facing delivery documents must not reveal financial fields. Never copy the full private snapshot into a staff browser.

## Required end-to-end checks before enabling invitations

Two owner accounts plus one warehouse account: project isolation, catalogue ownership, no financial payload leakage, no forged role/project/actor, expired/reused/revoked invitation rejection, immediate access revocation, staff correction approval, append-only audit, concurrent outgoing stock checks, offline retry deduplication and one transfer affecting both project balances exactly once.
