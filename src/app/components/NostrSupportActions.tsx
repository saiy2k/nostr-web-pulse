'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CREATOR_NPUB } from '@/lib/creator';

const UI_THEME = 'dark' as const;

/**
 * Loads nostr-components web components and renders like + zap for the
 * current page URL and creator npub.
 */
export default function NostrSupportActions() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const [pageUrl, setPageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPageUrl(`${window.location.origin}${pathname}${qs ? `?${qs}` : ''}`);
  }, [pathname, qs]);

  useEffect(() => {
    void import('nostr-components');
  }, []);

  if (!pageUrl) {
    return <div className="h-9 min-w-[180px] rounded-md bg-foreground/5 animate-pulse" aria-hidden />;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 [&_nostr-like-button]:inline-flex [&_nostr-zap-button]:inline-flex">
      <nostr-like-button url={pageUrl} text="Like" data-theme={UI_THEME} />
      <nostr-zap-button npub={CREATOR_NPUB} url={pageUrl} theme={UI_THEME} text="⚡ Zap" />
    </div>
  );
}
