'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DomainDoc, ReactionDoc, ZapDoc } from '@/lib/types';
import {
  getDomains,
  getLatestReactions,
  getLatestZaps,
  getGlobalStats,
  formatSats,
} from '@/lib/firebase';
import StatsCard from './components/StatsCard';
import SearchBar from './components/SearchBar';
import DomainTable from './components/DomainTable';
import LatestActivity from './components/LatestActivity';

type SortField = 'totalZapAmountMsats' | 'totalZaps' | 'totalReactions' | 'dislikes' | 'emojis' | 'domain';
type Period = 1 | 7 | 30;

export default function Dashboard() {
  const [domains, setDomains] = useState<DomainDoc[]>([]);
  const [reactions, setReactions] = useState<ReactionDoc[]>([]);
  const [zaps, setZaps] = useState<ZapDoc[]>([]);
  const [stats, setStats] = useState({ totalSatsMsats: 0, totalZaps: 0, totalReactions: 0, totalDomains: 0 });
  const [sortField, setSortField] = useState<SortField>('totalReactions');
  const [sortDir] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>(7);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchDomains = useCallback(async () => {
    const data = await getDomains({
      sortBy: sortField,
      sortDir: searchTerm ? 'asc' : sortDir,
      searchTerm: searchTerm || undefined,
    });
    setDomains(data);
  }, [sortField, sortDir, searchTerm]);

  const fetchActivity = useCallback(async () => {
    const [r, z] = await Promise.all([
      getLatestReactions({ sinceDaysAgo: period }),
      getLatestZaps({ sinceDaysAgo: period }),
    ]);
    setReactions(r);
    setZaps(z);
  }, [period]);

  useEffect(() => {
    Promise.all([fetchDomains(), fetchActivity(), getGlobalStats().then(setStats)])
      .finally(() => setInitialLoading(false));
  }, [fetchDomains, fetchActivity]);

  const handleSort = useCallback((field: string) => {
    setSortField(field as SortField);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Nostr Web Pulse</h1>
        <p className="text-foreground/50">
          Discover what the Nostr community loves, zaps, and reacts to on the open web.
        </p>
      </div>

      {initialLoading ? (
        <div className="text-center py-12 text-foreground/40">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatsCard
              label="Total Sats Zapped"
              value={formatSats(stats.totalSatsMsats)}
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              variant="orange-hero"
            />
            <StatsCard
              label="Total Zaps"
              value={stats.totalZaps.toLocaleString()}
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              variant="orange"
            />
            <StatsCard
              label="Total Reactions"
              value={stats.totalReactions.toLocaleString()}
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              }
            />
            <StatsCard
              label="Domains Tracked"
              value={stats.totalDomains.toLocaleString()}
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              }
            />
          </div>

          <a
            href="https://nostr-components.web.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-6 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-center font-medium hover:opacity-90 transition-opacity"
          >
            <span className="text-sm sm:text-base">
              Want to add ⚡ zap &amp; 👍 like buttons to your website? Check out{' '}
              <span className="underline underline-offset-2 font-bold">Nostr Components</span>
            </span>
          </a>

          <LatestActivity
            reactions={reactions}
            zaps={zaps}
            selectedPeriod={period}
            onPeriodChange={setPeriod}
          />

          <SearchBar onSearch={setSearchTerm} onSort={handleSort} sortField={sortField} />

          <DomainTable
            domains={domains}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </>
      )}
    </div>
  );
}
