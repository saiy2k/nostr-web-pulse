'use client';

import type { ReactionDoc, ZapDoc } from '@/lib/types';
import { timeAgo, truncatePubkey } from '@/lib/firebase';
import ZapBadge from './ZapBadge';
import ReactionBadge from './ReactionBadge';
import { Timestamp } from 'firebase/firestore';

type Period = 1 | 7 | 30;

interface LatestActivityProps {
  reactions: ReactionDoc[];
  zaps: ZapDoc[];
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

type ActivityItem =
  | { type: 'reaction'; data: ReactionDoc; ts: number }
  | { type: 'zap'; data: ZapDoc; ts: number };

function toMillis(t: Timestamp | { toMillis?: () => number; seconds?: number }): number {
  if (t instanceof Timestamp) return t.toMillis();
  if (typeof (t as any).toMillis === 'function') return (t as any).toMillis();
  if ((t as any).seconds) return (t as any).seconds * 1000;
  return 0;
}

export default function LatestActivity({
  reactions,
  zaps,
  selectedPeriod,
  onPeriodChange,
}: LatestActivityProps) {
  const items: ActivityItem[] = [
    ...zaps.map(z => ({ type: 'zap' as const, data: z, ts: toMillis(z.createdAt) })),
    ...reactions.map(r => ({ type: 'reaction' as const, data: r, ts: toMillis(r.createdAt) })),
  ].sort((a, b) => b.ts - a.ts);

  const periods: Period[] = [1, 7, 30];
  const periodLabels: Record<Period, string> = { 1: '1D', 7: '7D', 30: '30D' };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Latest Activity</h2>
        <div className="flex gap-1 rounded-lg border border-foreground/10 overflow-hidden">
          {periods.map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                p === selectedPeriod
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-center py-8 text-foreground/40">No activity in this period.</p>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map(item => {
          if (item.type === 'zap') {
            const z = item.data;
            return (
              <div
                key={z.eventId}
                className="flex items-center gap-3 p-3 rounded-lg border border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20 border-l-4 border-l-orange-500"
              >
                <ZapBadge amountMsats={z.amountMsats} size="lg" />
                <a
                  href={z.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline truncate flex-1 min-w-0"
                >
                  {z.url}
                </a>
                <span className="text-xs text-foreground/40 shrink-0">
                  {truncatePubkey(z.senderPubkey)}
                </span>
                <span className="text-xs text-foreground/30 shrink-0">
                  {timeAgo(z.createdAt as Timestamp)}
                </span>
              </div>
            );
          }

          const r = item.data;
          return (
            <div
              key={r.eventId}
              className="flex items-center gap-3 p-2 rounded-lg border border-foreground/5 border-l-4 border-l-blue-400"
            >
              <ReactionBadge content={r.content} reactionType={r.reactionType} />
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline truncate flex-1 min-w-0"
              >
                {r.url}
              </a>
              <span className="text-xs text-foreground/40 shrink-0">
                {truncatePubkey(r.pubkey)}
              </span>
              <span className="text-xs text-foreground/30 shrink-0">
                {timeAgo(r.createdAt as Timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
