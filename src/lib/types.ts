import { Timestamp } from 'firebase/firestore';

export type ReactionType = 'like' | 'dislike' | 'emoji';

export interface DomainDoc {
  domain: string;
  totalReactions: number;
  likes: number;
  dislikes: number;
  emojis: number;
  totalZaps: number;
  totalZapAmountMsats: number;
  updatedAt: Timestamp;
}

export interface UrlDoc {
  url: string;
  domain: string;
  totalReactions: number;
  likes: number;
  dislikes: number;
  emojis: number;
  totalZaps: number;
  totalZapAmountMsats: number;
  firstSeen: Timestamp;
  lastActivity: Timestamp;
}

export interface ReactionDoc {
  eventId: string;
  kind: 17;
  url: string;
  domain: string;
  content: string;
  reactionType: ReactionType;
  pubkey: string;
  createdAt: Timestamp;
}

export interface ZapDoc {
  eventId: string;
  kind: 9735;
  url: string;
  domain: string;
  amountMsats: number;
  senderPubkey: string;
  recipientPubkey: string;
  comment: string;
  createdAt: Timestamp;
}

export interface SyncStateDoc {
  lastReactionSyncTimestamp: number;
  lastZapSyncTimestamp: number;
}
