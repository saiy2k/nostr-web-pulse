# Nostr Web Pulse -- Implementation

## Architecture

```
Nostr Relays  →  Cloud Functions (hourly cron + seed)  →  Firestore  →  Next.js SPA (client SDK)
```

## Tech Stack

Next.js 16 (static export) | React 19 | Tailwind v4 | Firebase Functions Gen 2 | Firestore | nostr-tools v2 | ws (WebSocket polyfill)

---

## Project Structure

```
src/app/
  layout.tsx, page.tsx, globals.css
  domain/page.tsx
  components/ → DomainTable, SearchBar, LatestActivity, ReactionBadge, ZapBadge, StatsCard
src/lib/
  firebase.ts, types.ts
functions/src/
  index.ts, indexer.ts, seed.ts, nostr.ts
firebase.json, .firebaserc, firestore.rules, firestore.indexes.json, .env.local
```

---

## Backend

### `functions/src/nostr.ts`

```typescript
const DEFAULT_RELAYS = [
  'wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band',
  'wss://purplepag.es', 'wss://relay.snort.social',
];

function classifyReaction(content: string): 'like' | 'dislike' | 'emoji'
function parseReactionEvent(event): { url, domain, content, reactionType, pubkey, createdAt } | null
function parseZapReceiptEvent(event): { url, domain, amountMsats, senderPubkey, recipientPubkey, comment, createdAt } | null
function urlToDocId(url: string): string    // example.com__blog__post-1
function normalizeUrl(url: string): string
function extractDomain(url: string): string
async function fetchEvents(filter, relays?): Promise<NostrEvent[]>
```

WebSocket polyfill (top of file): `import WebSocket from 'ws'; (globalThis as any).WebSocket = WebSocket;`

### `functions/src/indexer.ts` -- Hourly Cron

```typescript
export const hourlyIndexer = onSchedule(
  { schedule: 'every 1 hours', timeoutSeconds: 540, memory: '512MiB' },
  async () => { ... }
);
```

Algorithm:
1. Read `syncState/config` timestamps
2. **Reactions**: fetch `{ kinds: [17], "#k": ["web"], since }` → parse → deduplicate by eventId → batch write to `reactions/`, increment `urls/` and `domains/`
3. **Zaps**: fetch `{ kinds: [9735], since }` → filter for `39735:` a-tags → parse → deduplicate → batch write to `zaps/`, increment `urls/` and `domains/`
4. Update `syncState/config`

Uses `FieldValue.increment()` for atomic counter updates. Batches capped at 450 ops.

### `functions/src/seed.ts` -- Historical Backfill

```typescript
export const seedFirestore = onRequest(
  { timeoutSeconds: 3600, memory: '1GiB' },
  async (req, res) => { ... }
);
```

Same logic as indexer with `since: 0`. Processes in time-window chunks. Accepts `?since=<ts>` query param.

### `functions/src/index.ts`

```typescript
export { hourlyIndexer } from './indexer';
export { seedFirestore } from './seed';
```

---

## Frontend

### `src/lib/firebase.ts`

```typescript
async function getDomains(options: {
  sortBy: 'totalZapAmountMsats' | 'totalZaps' | 'totalReactions' | 'domain';
  sortDir: 'asc' | 'desc'; searchTerm?: string; limit?: number;
}): Promise<DomainDoc[]>

async function getUrlsForDomain(domain: string, limit?: number): Promise<UrlDoc[]>
async function getLatestReactions(options: { sinceDaysAgo: 1|7|30; domain?: string; limit?: number }): Promise<ReactionDoc[]>
async function getLatestZaps(options: { sinceDaysAgo: 1|7|30; domain?: string; limit?: number }): Promise<ZapDoc[]>
async function getGlobalStats(): Promise<{ totalSatsMsats, totalZaps, totalReactions, totalDomains }>
```

Domain search: Firestore prefix range query (`>=` term, `<=` term + `\uf8ff`).

### Components

| Component | Key Props | Notes |
|-----------|-----------|-------|
| `StatsCard` | label, value, icon, variant (`default`/`orange`/`orange-hero`) | Hero variant for "Total Sats" |
| `ZapBadge` | amountMsats | Orange lightning icon, formatted sats |
| `ReactionBadge` | content, reactionType | Thumbs up/down or emoji |
| `DomainTable` | domains[], onSort, sortField, sortDir | Zap columns first, default sort by sats |
| `SearchBar` | onSearch, onSort, sortField | Sort: Sats / Zaps / Reactions / Recent / A-Z |
| `LatestActivity` | reactions[], zaps[], selectedPeriod, onPeriodChange | Merged timeline, zap cards visually dominant |

### Pages

**Dashboard** (`page.tsx`): Stats cards (sats hero → zaps → reactions → domains) → SearchBar → DomainTable → LatestActivity. Default sort: `totalZapAmountMsats` desc.

**Domain Detail** (`domain/page.tsx`): Reads `?name=` param. Domain header (sats + zaps prominent) → URL table (sorted by sats) → LatestActivity scoped to domain.

---

## Firebase Config

**`firebase.json`**: Hosting `public: "out"`, rewrite `** → /index.html`. Functions source: `functions/`, runtime: `nodejs20`.

**`firestore.rules`**: `allow read: if true; allow write: if false;` (public read, admin-only write).

---

## Build Order

1. Firebase init (config files, functions scaffold, `npm install`)
2. Shared types (`src/lib/types.ts`)
3. Nostr utilities → Indexer → Seed → Function exports
4. Firebase client + query helpers
5. Layout + components + dashboard page + domain detail page
6. Build, deploy functions, deploy hosting, run seed
