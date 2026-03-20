'use client';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'orange' | 'orange-hero';
}

export default function StatsCard({
  label,
  value,
  icon,
  variant = 'default',
}: StatsCardProps) {
  const base = 'rounded-xl border p-4 flex items-center gap-4';
  const variants = {
    default: 'border-foreground/10 bg-foreground/[0.02]',
    orange:
      'border-orange-500/30 bg-orange-50 dark:bg-orange-950/30',
    'orange-hero':
      'border-orange-500/40 bg-orange-50 dark:bg-orange-950/30 col-span-2 sm:col-span-1',
  };
  const iconColor = variant === 'default' ? 'text-foreground/50' : 'text-orange-500';
  const valueSize = variant === 'orange-hero' ? 'text-3xl' : 'text-2xl';

  return (
    <div className={`${base} ${variants[variant]}`}>
      <div className={`text-2xl ${iconColor} shrink-0`}>{icon}</div>
      <div>
        <p className={`${valueSize} font-bold tracking-tight`}>{value}</p>
        <p className="text-sm text-foreground/50">{label}</p>
      </div>
    </div>
  );
}
