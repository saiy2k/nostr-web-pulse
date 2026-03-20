'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { DomainDoc, UrlDoc, ReactionDoc, ZapDoc } from '@/lib/types';
import {
  getDomainDoc,
  getUrlsForDomain,
  getLatestReactions,
  getLatestZaps,
  getReactionsForUrl,
  getZapsForUrl,
  formatSats,
  truncateNpub,
  timeAgo,
} from '@/lib/firebase';
import { fetchProfiles, type NostrProfile } from '@/lib/nostr';
import StatsCard from '../components/StatsCard';
import LatestActivity from '../components/LatestActivity';
import ReactionBadge from '../components/ReactionBadge';
import ZapBadge from '../components/ZapBadge';
import { Timestamp } from 'firebase/firestore';

type Period = 1 | 7 | 30;

interface UrlReactionData {
  reactions: ReactionDoc[];
  zaps: ZapDoc[];
  loading: boolean;
  profiles: Record<string, NostrProfile>;
  profilesLoading: boolean;
}

function DomainContent() {
  const searchParams = useSearchParams();
  const domainName = searchParams.get('name') || '';

  const [domainDoc, setDomainDoc] = useState<DomainDoc | null>(null);
  const [urls, setUrls] = useState<UrlDoc[]>([]);
  const [reactions, setReactions] = useState<ReactionDoc[]>([]);
  const [zaps, setZaps] = useState<ZapDoc[]>([]);
  const [period, setPeriod] = useState<Period>(7);
  const [loading, setLoading] = useState(true);
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
  const [urlReactionData, setUrlReactionData] = useState<Record<string, UrlReactionData>>({});

  const fetchData = useCallback(async () => {
    if (!domainName) return;
    setLoading(true);
    const [doc, urlList, r, z] = await Promise.all([
      getDomainDoc(domainName),
      getUrlsForDomain(domainName),
      getLatestReactions({ sinceDaysAgo: period, domain: domainName }),
      getLatestZaps({ sinceDaysAgo: period, domain: domainName }),
    ]);
    setDomainDoc(doc);
    setUrls(urlList);
    setReactions(r);
    setZaps(z);
    setLoading(false);
  }, [domainName, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleUrl = useCallback(async (url: string) => {
    setExpandedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) { next.delete(url); } else { next.add(url); }
      return next;
    });

    if (expandedUrls.has(url) || urlReactionData[url]) return;

    setUrlReactionData(prev => ({
      ...prev,
      [url]: { reactions: [], zaps: [], loading: true, profiles: {}, profilesLoading: false },
    }));

    const [r, z] = await Promise.all([
      getReactionsForUrl(url),
      getZapsForUrl(url),
    ]);

    const pubkeys = [
      ...r.map(rx => rx.pubkey),
      ...z.map(zx => zx.senderPubkey),
    ].filter(Boolean);
    const uniquePubkeys = [...new Set(pubkeys)];

    setUrlReactionData(prev => ({
      ...prev,
      [url]: { reactions: r, zaps: z, loading: false, profiles: {}, profilesLoading: uniquePubkeys.length > 0 },
    }));

    if (uniquePubkeys.length > 0) {
      const profiles = await fetchProfiles(uniquePubkeys);
      setUrlReactionData(prev => ({
        ...prev,
        [url]: { ...prev[url], profiles, profilesLoading: false },
      }));
    }
  }, [expandedUrls, urlReactionData]);

  if (!domainName) {
    return <p className="text-center py-12 text-foreground/40">No domain specified.</p>;
  }

  if (loading) {
    return <div className="text-center py-12 text-foreground/40">Loading...</div>;
  }

  if (!domainDoc) {
    return <p className="text-center py-12 text-foreground/40">Domain not found.</p>;
  }

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-4"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-4">{domainName}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <StatsCard
          label="Total Sats"
          value={formatSats(domainDoc.totalZapAmountMsats || 0)}
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
          variant="orange-hero"
        />
        <StatsCard
          label="Zaps"
          value={(domainDoc.totalZaps || 0).toLocaleString()}
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
          variant="orange"
        />
        <StatsCard
          label="Reactions"
          value={(domainDoc.totalReactions || 0).toLocaleString()}
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          }
        />
      </div>

      <h2 className="text-lg font-semibold mb-3">URLs</h2>
      {urls.length === 0 ? (
        <p className="text-center py-8 text-foreground/40">No URLs tracked yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-foreground/10 mb-8">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.03]">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">URL Path</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-orange-500">Total sats</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-orange-500">Zaps</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Reactions</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {urls.map(u => {
                let path: string;
                try {
                  path = new URL(u.url).pathname;
                } catch {
                  path = u.url;
                }
                const isExpanded = expandedUrls.has(u.url);
                const data = urlReactionData[u.url];
                return (
                  <React.Fragment key={u.url}>
                    <tr
                      className="hover:bg-foreground/[0.02] transition-colors cursor-pointer"
                      onClick={() => toggleUrl(u.url)}
                    >
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2 text-blue-500">
                          <svg
                            className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M8 5l8 7-8 7z" />
                          </svg>
                          {path || '/'}
                          <a
                            href={u.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-foreground/30 hover:text-blue-500 transition-colors"
                            title="Open in new tab"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-orange-500 font-semibold">
                        {formatSats(u.totalZapAmountMsats || 0)}
                      </td>
                      <td className="px-3 py-3 text-orange-500">{u.totalZaps || 0}</td>
                      <td className="px-3 py-3">{u.totalReactions || 0}</td>
                      <td className="px-3 py-3 hidden sm:table-cell text-foreground/50 text-xs">
                        {u.lastActivity ? timeAgo(u.lastActivity as Timestamp) : '-'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-0 py-0">
                          <div className="bg-foreground/[0.02] border-t border-foreground/5">
                            {data?.loading ? (
                              <p className="text-center py-4 text-foreground/40 text-sm">Loading reactions...</p>
                            ) : (!data || (data.reactions.length === 0 && data.zaps.length === 0)) ? (
                              <p className="text-center py-4 text-foreground/40 text-sm">No individual reactions found.</p>
                            ) : (
                              <div className="divide-y divide-foreground/5">
                                {[
                                  ...data.reactions.map(r => ({
                                    type: 'reaction' as const,
                                    pubkey: r.pubkey,
                                    content: r.content,
                                    reactionType: r.reactionType,
                                    time: r.createdAt,
                                    sortKey: r.createdAt.toMillis(),
                                  })),
                                  ...data.zaps.map(z => ({
                                    type: 'zap' as const,
                                    pubkey: z.senderPubkey,
                                    amountMsats: z.amountMsats,
                                    time: z.createdAt,
                                    sortKey: z.createdAt.toMillis(),
                                  })),
                                ]
                                  .sort((a, b) => b.sortKey - a.sortKey)
                                  .map((item, idx) => {
                                    const profile = data.profiles[item.pubkey];
                                    const displayName = profile?.name || truncateNpub(item.pubkey);
                                    const avatar = profile?.picture;
                                    return (
                                      <div key={idx} className="flex items-center gap-3 px-6 py-2 text-sm">
                                        <span className="flex items-center gap-2 min-w-[160px]" title={truncateNpub(item.pubkey)}>
                                          {avatar ? (
                                            <img
                                              src={avatar}
                                              alt=""
                                              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                          ) : (
                                            <span className="w-6 h-6 rounded-full bg-foreground/10 flex-shrink-0" />
                                          )}
                                          <span className={`truncate text-xs ${profile?.name ? 'text-foreground/80' : 'font-mono text-foreground/50'}`}>
                                            {displayName}
                                          </span>
                                        </span>
                                        <span className="flex-shrink-0">
                                          {item.type === 'reaction' ? (
                                            <ReactionBadge content={item.content} reactionType={item.reactionType} />
                                          ) : (
                                            <ZapBadge amountMsats={item.amountMsats} />
                                          )}
                                        </span>
                                        <span className="text-foreground/40 text-xs ml-auto">
                                          {timeAgo(item.time as Timestamp)}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LatestActivity
        reactions={reactions}
        zaps={zaps}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
      />
    </div>
  );
}

export default function DomainDetailPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-foreground/40">Loading...</div>}>
      <DomainContent />
    </Suspense>
  );
}
