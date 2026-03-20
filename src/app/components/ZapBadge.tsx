'use client';

import { formatSats } from '@/lib/firebase';

interface ZapBadgeProps {
  amountMsats: number;
  size?: 'sm' | 'lg';
}

export default function ZapBadge({ amountMsats, size = 'sm' }: ZapBadgeProps) {
  const sats = formatSats(amountMsats);
  const textSize = size === 'lg' ? 'text-lg font-bold' : 'text-sm font-semibold';

  return (
    <span className={`inline-flex items-center gap-1 text-orange-500 ${textSize}`}>
      <svg
        className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      {sats}
      <span className="text-xs text-orange-400">sats</span>
    </span>
  );
}
