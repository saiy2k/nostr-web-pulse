import { SimplePool } from 'nostr-tools';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://relay.snort.social',
];

const CACHE_KEY = 'nostr_profiles';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface NostrProfile {
  name: string;
  picture: string;
  fetchedAt: number;
}

type ProfileCache = Record<string, NostrProfile>;

function readCache(): ProfileCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const cache: ProfileCache = JSON.parse(raw);
    const now = Date.now();
    const pruned: ProfileCache = {};
    for (const [key, val] of Object.entries(cache)) {
      if (now - val.fetchedAt < CACHE_TTL_MS) {
        pruned[key] = val;
      }
    }
    return pruned;
  } catch {
    return {};
  }
}

function writeCache(cache: ProfileCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function getCachedProfile(pubkey: string): NostrProfile | null {
  const cache = readCache();
  return cache[pubkey] ?? null;
}

/**
 * Fetches profiles for the given pubkeys, returning only the ones that were
 * not already cached. Writes all results (cached + fresh) back to localStorage.
 */
export async function fetchProfiles(
  pubkeys: string[],
): Promise<Record<string, NostrProfile>> {
  const cache = readCache();
  const result: Record<string, NostrProfile> = {};
  const missing: string[] = [];

  for (const pk of pubkeys) {
    if (!pk) continue;
    if (cache[pk]) {
      result[pk] = cache[pk];
    } else {
      missing.push(pk);
    }
  }

  if (missing.length === 0) return result;

  const pool = new SimplePool();
  try {
    const events = await pool.querySync(RELAYS, {
      kinds: [0],
      authors: missing,
    });

    const latest: Record<string, number> = {};
    for (const ev of events) {
      if (!latest[ev.pubkey] || ev.created_at > latest[ev.pubkey]) {
        latest[ev.pubkey] = ev.created_at;
        try {
          const meta = JSON.parse(ev.content);
          result[ev.pubkey] = {
            name: meta.display_name || meta.name || '',
            picture: meta.picture || '',
            fetchedAt: Date.now(),
          };
        } catch {
          // Malformed profile JSON
        }
      }
    }

    for (const pk of missing) {
      if (!result[pk]) {
        result[pk] = { name: '', picture: '', fetchedAt: Date.now() };
      }
    }

    writeCache({ ...cache, ...result });
  } finally {
    pool.close(RELAYS);
  }

  return result;
}
