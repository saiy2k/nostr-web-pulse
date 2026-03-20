'use client';

import type { ReactionType } from '@/lib/types';

interface ReactionBadgeProps {
  content: string;
  reactionType: ReactionType;
}

export default function ReactionBadge({ content, reactionType }: ReactionBadgeProps) {
  if (reactionType === 'emoji') {
    return <span className="text-lg" title={content}>{content}</span>;
  }

  if (reactionType === 'dislike') {
    return (
      <span className="inline-flex items-center text-red-400" title="Dislike">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.27 10.23C5.35 11.14 4.81 12.43 5 13.78C5.27 15.61 6.84 17 8.69 17H12.1L11.4 20.66C11.33 21.03 11.44 21.41 11.69 21.69C12.17 22.23 13 22.26 13.51 21.77L20 15.41V6H9.6C8.29 6 7.16 6.88 6.88 8.16L6.27 10.23Z" />
          <path d="M22 6H20V16H22V6Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-blue-400" title="Like">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.73 13.77C18.65 12.86 19.19 11.57 19 10.22C18.73 8.39 17.16 7 15.31 7H11.9L12.6 3.34C12.67 2.97 12.56 2.59 12.31 2.31C11.83 1.77 11 1.74 10.49 2.23L4 8.59V18H14.4C15.71 18 16.84 17.12 17.12 15.84L17.73 13.77Z" />
        <path d="M2 18H4V8H2V18Z" />
      </svg>
    </span>
  );
}
