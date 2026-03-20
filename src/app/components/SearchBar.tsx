'use client';

import { useRef, useCallback } from 'react';

type SortField = 'totalZapAmountMsats' | 'totalZaps' | 'totalReactions' | 'dislikes' | 'emojis' | 'domain';

interface SearchBarProps {
  onSearch: (term: string) => void;
  onSort: (field: SortField) => void;
  sortField: SortField;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'totalZapAmountMsats', label: 'Total Sats' },
  { value: 'totalZaps', label: 'Zaps' },
  { value: 'totalReactions', label: 'Reactions' },
  { value: 'domain', label: 'A-Z' },
];

export default function SearchBar({ onSearch, onSort, sortField }: SearchBarProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(e.target.value.trim()), 300);
    },
    [onSearch],
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search domains..."
          onChange={handleInput}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-sm focus:outline-none focus:border-foreground/30"
        />
      </div>
      <select
        value={sortField}
        onChange={e => onSort(e.target.value as SortField)}
        className="px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-sm focus:outline-none focus:border-foreground/30"
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            Sort: {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
