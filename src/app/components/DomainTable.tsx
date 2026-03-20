'use client';

import Link from 'next/link';
import type { DomainDoc } from '@/lib/types';
import { formatSats, timeAgo } from '@/lib/firebase';

interface DomainTableProps {
  domains: DomainDoc[];
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
}

function SortArrow({ field, current, dir }: { field: string; current: string; dir: string }) {
  if (field !== current) return null;
  return <span className="ml-1 text-xs">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
}

export default function DomainTable({ domains, sortField, sortDir, onSort }: DomainTableProps) {
  const th = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none whitespace-nowrap';

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 text-foreground/40">
        No domains found. Data will appear once the indexer runs.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full text-sm">
        <thead className="bg-foreground/[0.03]">
          <tr>
            <th className={th}>Domain</th>
            <th className={`${th} text-orange-500`} onClick={() => onSort('totalZapAmountMsats')}>
              Total sats <SortArrow field="totalZapAmountMsats" current={sortField} dir={sortDir} />
            </th>
            <th className={`${th} text-orange-500`} onClick={() => onSort('totalZaps')}>
              Zaps <SortArrow field="totalZaps" current={sortField} dir={sortDir} />
            </th>
            <th className={th} onClick={() => onSort('totalReactions')}>
              Likes <SortArrow field="totalReactions" current={sortField} dir={sortDir} />
            </th>
            <th className={`${th} hidden md:table-cell`} onClick={() => onSort('dislikes')}>
              Dislikes <SortArrow field="dislikes" current={sortField} dir={sortDir} />
            </th>
            <th className={`${th} hidden md:table-cell`} onClick={() => onSort('emojis')}>
              Emoji <SortArrow field="emojis" current={sortField} dir={sortDir} />
            </th>
            <th className={`${th} hidden sm:table-cell`}>Last Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/5">
          {domains.map(d => (
            <tr key={d.domain} className="hover:bg-foreground/[0.02] transition-colors">
              <td className="px-3 py-3">
                <Link
                  href={`/domain?name=${encodeURIComponent(d.domain)}`}
                  className="font-medium text-blue-500 hover:underline"
                  title={d.domain}
                >
                  {d.domain.length > 60 ? d.domain.slice(0, 57) + '...' : d.domain}
                </Link>
              </td>
              <td className="px-3 py-3 text-orange-500 font-semibold">
                {formatSats(d.totalZapAmountMsats || 0)}
              </td>
              <td className="px-3 py-3 text-orange-500">
                {d.totalZaps || 0}
              </td>
              <td className="px-3 py-3">{d.likes || 0}</td>
              <td className="px-3 py-3 hidden md:table-cell">{d.dislikes || 0}</td>
              <td className="px-3 py-3 hidden md:table-cell">{d.emojis || 0}</td>
              <td className="px-3 py-3 hidden sm:table-cell text-foreground/50 text-xs">
                {d.updatedAt ? timeAgo(d.updatedAt) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
