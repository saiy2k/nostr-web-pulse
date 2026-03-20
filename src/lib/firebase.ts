import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
  limit as firestoreLimit,
  getDocs,
  doc,
  getDoc,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { nip19 } from 'nostr-tools';
import type { DomainDoc, UrlDoc, ReactionDoc, ZapDoc } from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

type SortField = 'totalZapAmountMsats' | 'totalZaps' | 'totalReactions' | 'dislikes' | 'emojis' | 'domain' | 'updatedAt';

export async function getDomains(options: {
  sortBy?: SortField;
  sortDir?: 'asc' | 'desc';
  searchTerm?: string;
  limit?: number;
}): Promise<DomainDoc[]> {
  const {
    sortBy = 'totalReactions',
    sortDir = 'desc',
    searchTerm,
    limit: resultLimit = 50,
  } = options;

  let q;
  const col = collection(db, 'Nostr_domains');

  if (searchTerm) {
    q = query(
      col,
      where('domain', '>=', searchTerm.toLowerCase()),
      where('domain', '<=', searchTerm.toLowerCase() + '\uf8ff'),
      firestoreLimit(resultLimit),
    );
  } else {
    q = query(col, orderBy(sortBy, sortDir), firestoreLimit(resultLimit));
  }

  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ ...d.data() } as DomainDoc));

  // Firestore range filtering above doesn't include `orderBy`, so we
  // sort client-side to keep header-driven sorting consistent.
  if (searchTerm) {
    const compare = (a: DomainDoc, b: DomainDoc): number => {
      if (sortBy === 'domain') {
        const res = a.domain.localeCompare(b.domain);
        return sortDir === 'desc' ? -res : res;
      }
      if (sortBy === 'updatedAt') {
        const av = a.updatedAt?.toMillis?.() ?? 0;
        const bv = b.updatedAt?.toMillis?.() ?? 0;
        return sortDir === 'desc' ? bv - av : av - bv;
      }

      let av = 0;
      let bv = 0;
      switch (sortBy) {
        case 'totalZapAmountMsats':
          av = a.totalZapAmountMsats || 0;
          bv = b.totalZapAmountMsats || 0;
          break;
        case 'totalZaps':
          av = a.totalZaps || 0;
          bv = b.totalZaps || 0;
          break;
        case 'totalReactions':
          av = a.totalReactions || 0;
          bv = b.totalReactions || 0;
          break;
        case 'dislikes':
          av = a.dislikes || 0;
          bv = b.dislikes || 0;
          break;
        case 'emojis':
          av = a.emojis || 0;
          bv = b.emojis || 0;
          break;
        default:
          // Should never happen because 'domain' and 'updatedAt' are handled above.
          return 0;
      }

      return sortDir === 'desc' ? bv - av : av - bv;
    };

    results.sort(compare);
  }

  return results;
}

export async function getUrlsForDomain(
  domain: string,
  limit = 50,
  sortBy: 'totalZapAmountMsats' | 'totalZaps' | 'totalReactions' | 'lastActivity' = 'totalZapAmountMsats',
  sortDir: 'asc' | 'desc' = 'desc',
): Promise<UrlDoc[]> {
  // NOTE: Firestore requires an index for most compound `orderBy` combinations.
  // To make sorting reliable even when those indexes haven't propagated yet,
  // we fetch using a stable order and then sort client-side.
  const q = query(
    collection(db, 'Nostr_urls'),
    where('domain', '==', domain),
    orderBy('totalZapAmountMsats', 'desc'),
    firestoreLimit(limit),
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ ...d.data() } as UrlDoc));

  if (sortBy === 'totalZapAmountMsats') {
    if (sortDir === 'desc') return results;
    // If ascending requested, flip locally.
    return [...results].sort((a, b) => (a.totalZapAmountMsats || 0) - (b.totalZapAmountMsats || 0));
  }

  const getLastActivityMs = (u: UrlDoc): number => u.lastActivity ? u.lastActivity.toMillis() : 0;

  const compare = (a: UrlDoc, b: UrlDoc): number => {
    let av = 0;
    let bv = 0;
    switch (sortBy) {
      case 'totalZaps':
        av = a.totalZaps || 0;
        bv = b.totalZaps || 0;
        break;
      case 'totalReactions':
        av = a.totalReactions || 0;
        bv = b.totalReactions || 0;
        break;
      case 'lastActivity':
        av = getLastActivityMs(a);
        bv = getLastActivityMs(b);
        break;
      default:
        return 0;
    }

    // Desc sorts highest first.
    return sortDir === 'desc' ? bv - av : av - bv;
  };

  return [...results].sort(compare);
}

export async function getDomainDoc(domain: string): Promise<DomainDoc | null> {
  const snap = await getDoc(doc(db, 'Nostr_domains', domain));
  return snap.exists() ? (snap.data() as DomainDoc) : null;
}

export async function getLatestReactions(options: {
  sinceDaysAgo?: 1 | 7 | 30;
  domain?: string;
  limit?: number;
}): Promise<ReactionDoc[]> {
  const { sinceDaysAgo = 7, domain: domainFilter, limit: resultLimit = 30 } = options;

  const since = Timestamp.fromDate(
    new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000),
  );

  const constraints = [
    where('createdAt', '>=', since),
    orderBy('createdAt', 'desc'),
    firestoreLimit(resultLimit),
  ];

  if (domainFilter) {
    constraints.unshift(where('domain', '==', domainFilter));
  }

  const q = query(collection(db, 'Nostr_reactions'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data() } as ReactionDoc));
}

export async function getLatestZaps(options: {
  sinceDaysAgo?: 1 | 7 | 30;
  domain?: string;
  limit?: number;
}): Promise<ZapDoc[]> {
  const { sinceDaysAgo = 7, domain: domainFilter, limit: resultLimit = 30 } = options;

  const since = Timestamp.fromDate(
    new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000),
  );

  const constraints = [
    where('createdAt', '>=', since),
    orderBy('createdAt', 'desc'),
    firestoreLimit(resultLimit),
  ];

  if (domainFilter) {
    constraints.unshift(where('domain', '==', domainFilter));
  }

  const q = query(collection(db, 'Nostr_zaps'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data() } as ZapDoc));
}

export async function getGlobalStats(): Promise<{
  totalSatsMsats: number;
  totalZaps: number;
  totalReactions: number;
  totalDomains: number;
}> {
  const domainsSnap = await getDocs(collection(db, 'Nostr_domains'));
  let totalSatsMsats = 0;
  let totalZaps = 0;
  let totalReactions = 0;

  domainsSnap.forEach(d => {
    const data = d.data();
    totalSatsMsats += data.totalZapAmountMsats || 0;
    totalZaps += data.totalZaps || 0;
    totalReactions += data.totalReactions || 0;
  });

  return {
    totalSatsMsats,
    totalZaps,
    totalReactions,
    totalDomains: domainsSnap.size,
  };
}

export async function getReactionsForUrl(
  url: string,
  limit = 50,
): Promise<ReactionDoc[]> {
  const q = query(
    collection(db, 'Nostr_reactions'),
    where('url', '==', url),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data() } as ReactionDoc));
}

export async function getZapsForUrl(
  url: string,
  limit = 50,
): Promise<ZapDoc[]> {
  const q = query(
    collection(db, 'Nostr_zaps'),
    where('url', '==', url),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data() } as ZapDoc));
}

export function formatSats(msats: number): string {
  const sats = Math.floor(msats / 1000);
  return sats.toLocaleString();
}

export function pubkeyToNpub(hexPubkey: string): string {
  try {
    return nip19.npubEncode(hexPubkey);
  } catch {
    return hexPubkey;
  }
}

export function truncateNpub(hexPubkey: string): string {
  const npub = pubkeyToNpub(hexPubkey);
  if (npub.length <= 20) return npub;
  return npub.slice(0, 12) + '...' + npub.slice(-6);
}

export function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 16) return pubkey;
  return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
}

export function timeAgo(timestamp: Timestamp): string {
  const seconds = Math.floor((Date.now() - timestamp.toMillis()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
