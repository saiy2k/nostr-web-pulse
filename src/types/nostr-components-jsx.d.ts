import type * as React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-like-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        url?: string;
        text?: string;
        relays?: string;
        'data-theme'?: 'light' | 'dark';
      };
      'nostr-zap-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        npub?: string;
        pubkey?: string;
        nip05?: string;
        url?: string;
        theme?: 'light' | 'dark';
        text?: string;
        amount?: string;
        relays?: string;
      };
    }
  }
}

export {};
