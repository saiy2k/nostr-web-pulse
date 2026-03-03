# Nostr Web Pulse -- Spec

Dashboard aggregating Nostr reactions and zaps to web URLs, organized by domain.
Live at: https://nostr-web-pulse.web.app

---

## Data Sources

### Kind 17 -- Reactions to Web URLs (NIP-25 + NIP-73)

```json
{ "kind": 17, "content": "+", "tags": [["k", "web"], ["i", "https://example.com/article"]] }
```

- `"+"` or `""` = like, `"-"` = dislike, anything else = emoji
- Filter: `{ kinds: [17], "#k": ["web"], since: <ts> }`

### Kind 9735 -- Zaps to Web URLs (NIP-57 + custom `39735` a-tag)

Zap requests include `["a", "39735:<pubkey>:<url>"]`. Relays copy the `a` tag to the zap receipt (kind 9735).

- Scan `a` tags for `39735:` prefix → extract URL via `split(':').slice(2).join(':')`
- Parse amount from `description` tag (embedded zap request's `amount` in millisats)
- Filter: `{ kinds: [9735], since: <ts> }` → client-side filter for `39735:` (NIP-01 has no prefix match)

Ref: [nostr-components PR #67](https://github.com/saiy2k/nostr-components/pull/67)

---

## Pages

### Dashboard (`/`)

1. **Stats Cards** (zaps-first): Total Sats (orange-hero) | Total Zaps (orange) | Total Reactions | Total Domains
2. **Search + Sort**: Text search on domain; sort by sats / zaps / reactions / recent / A-Z. Default: sats desc.
3. **Domain Table** :

| Domain | Total sats | Zaps | Likes | Dislikes | Emoji | Last Active |
|--------|------------|------|-------|----------|-------|-------------|

4. **Latest Activity**: Tabs 1D / 7D / 30D. Unified timeline; zap cards (orange, large) visually dominant over reaction cards (blue/purple, compact).

### Domain Detail (`/domain?name=<domain>`)

1. **Header**: Domain name + stats (sats, zaps, reactions)
2. **URL Table** (sorted by sats desc): URL Path | Total sats | Zaps | Reactions | Last Active
3. **Recent Activity**: Same feed, scoped to domain

---

## Firestore Data Model

### `domains/{domainName}`

`domain`, `totalReactions`, `likes`, `dislikes`, `emojis`, `totalZaps`, `totalZapAmountMsats`, `updatedAt`

### `urls/{urlKey}`

Doc ID: strip protocol, replace `/` with `__`, lowercase (e.g. `example.com__blog__post-1`). Truncate at 1400 chars + 8-char hash if exceeded.

`url`, `domain`, `totalReactions`, `likes`, `dislikes`, `emojis`, `totalZaps`, `totalZapAmountMsats`, `firstSeen`, `lastActivity`

### `reactions/{eventId}`

`eventId`, `kind` (17), `url`, `domain`, `content`, `reactionType`, `pubkey`, `createdAt`

### `zaps/{eventId}`

`eventId`, `kind` (9735), `url`, `domain`, `amountMsats`, `senderPubkey`, `recipientPubkey`, `comment`, `createdAt`

### `syncState/config`

`lastReactionSyncTimestamp`, `lastZapSyncTimestamp`

### Indexes

- `domains`: `totalZapAmountMsats` DESC, `totalReactions` DESC
- `urls`: `domain` + `totalZapAmountMsats` DESC
- `reactions`: `createdAt` DESC; `domain` + `createdAt` DESC
- `zaps`: `createdAt` DESC; `domain` + `createdAt` DESC

---

## UI Design

- **Zaps-first**: Zap columns before reaction columns everywhere. Default sort by sats.
- **Orange** for all zap elements (Lightning/Bitcoin association). Default theme color for reactions.
- **Zap cards**: Orange left border, hero sats amount, larger. **Reaction cards**: Blue/purple left border, compact.
- **Stats hero card**: "Total Sats" gets `orange-hero` variant (largest, prominent background).

---

## Constraints

1. Static export (`output: "export"`) -- all data fetching is client-side from Firestore.
2. Domain detail uses query params (`/domain?name=xxx`) since static export can't generate dynamic routes.
3. Zap data may be sparse (the `39735:` a-tag convention is new).
4. Deduplication by `eventId` in the indexer to handle relay overlap.
