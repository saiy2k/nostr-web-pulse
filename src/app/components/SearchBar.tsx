'use client';

import { useRef, useCallback } from 'react';

interface SearchBarProps {
  onSearch: (term: string) => void;
  // Sort control lives on column headers now.
}

export default function SearchBar({ onSearch }: SearchBarProps) {
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
    </div>
  );
}
