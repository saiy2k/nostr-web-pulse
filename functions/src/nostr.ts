import WebSocket from 'ws';
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

import { SimplePool, type Filter, type Event as NostrEvent } from 'nostr-tools';
import * as crypto from 'crypto';

export type ReactionType = 'like' | 'dislike' | 'emoji';

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://relay.snort.social',
];

const ZAP_URL_KIND_PREFIX = '39735';

export interface ParsedReaction {
  eventId: string;
  url: string;
  domain: string;
  content: string;
  reactionType: ReactionType;
  pubkey: string;
  createdAt: number;
}

export interface ParsedZap {
  eventId: string;
  url: string;
  domain: string;
  amountMsats: number;
  senderPubkey: string;
  recipientPubkey: string;
  comment: string;
  createdAt: number;
}

export function classifyReaction(content: string): ReactionType {
  if (content === '+' || content === '') return 'like';
  if (content === '-') return 'dislike';
  return 'emoji';
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    let normalized = parsed.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function urlToDocId(url: string): string {
  let key = url
    .replace(/^https?:\/\//, '')
    .replace(/\//g, '__')
    .toLowerCase();

  if (key.endsWith('__')) {
    key = key.slice(0, -2);
  }

  if (key.length > 1400) {
    const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
    key = key.slice(0, 1392) + '_' + hash;
  }

  return key;
}

function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  const tag = event.tags.find(t => t[0] === tagName);
  return tag?.[1];
}

function getAllTags(event: NostrEvent, tagName: string): string[][] {
  return event.tags.filter(t => t[0] === tagName);
}

export function parseReactionEvent(event: NostrEvent): ParsedReaction | null {
  const kTag = getTagValue(event, 'k');
  if (kTag !== 'web') return null;

  const iTag = getTagValue(event, 'i');
  if (!iTag) return null;

  try {
    new URL(iTag);
  } catch {
    return null;
  }

  if (!iTag.startsWith('http://') && !iTag.startsWith('https://')) return null;

  const url = normalizeUrl(iTag);
  const domain = extractDomain(url);
  if (!domain) return null;

  return {
    eventId: event.id,
    url,
    domain,
    content: event.content,
    reactionType: classifyReaction(event.content),
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

export function parseZapReceiptEvent(event: NostrEvent): ParsedZap | null {
  const aTags = getAllTags(event, 'a');
  let targetUrl: string | undefined;

  for (const tag of aTags) {
    const val = tag[1];
    if (val && val.startsWith(ZAP_URL_KIND_PREFIX + ':')) {
      const parts = val.split(':');
      // Format: 39735:<pubkey>:<url> — rejoin from index 2 for URLs with colons
      const urlCandidate = parts.slice(2).join(':');
      if (urlCandidate.startsWith('http://') || urlCandidate.startsWith('https://')) {
        targetUrl = urlCandidate;
        break;
      }
    }
  }

  if (!targetUrl) return null;

  const url = normalizeUrl(targetUrl);
  const domain = extractDomain(url);
  if (!domain) return null;

  let amountMsats = 0;
  let senderPubkey = '';
  let comment = '';

  const descriptionTag = getTagValue(event, 'description');
  if (descriptionTag) {
    try {
      const zapRequest = JSON.parse(descriptionTag);
      const amountTag = zapRequest.tags?.find((t: string[]) => t[0] === 'amount');
      if (amountTag?.[1]) {
        amountMsats = parseInt(amountTag[1], 10) || 0;
      }
      comment = zapRequest.content || '';
      senderPubkey = zapRequest.pubkey || '';
    } catch {
      // Malformed description — continue with defaults
    }
  }

  if (!senderPubkey) {
    senderPubkey = getTagValue(event, 'P') || '';
  }

  const recipientPubkey = getTagValue(event, 'p') || '';

  return {
    eventId: event.id,
    url,
    domain,
    amountMsats,
    senderPubkey,
    recipientPubkey,
    comment,
    createdAt: event.created_at,
  };
}

export async function fetchEvents(
  filter: Filter,
  relays: string[] = DEFAULT_RELAYS,
): Promise<NostrEvent[]> {
  const pool = new SimplePool();
  try {
    const events = await pool.querySync(relays, filter);
    return events;
  } finally {
    pool.close(relays);
  }
}
