import { Sparkles, Star, Flame, Zap, Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showDetails?: boolean;
}

export const tierFor = (level: number) => {
  if (level >= 50) return {
    name: 'Mestre Lendário', shortName: 'Mestre',
    from: 'from-yellow-300', via: 'via-amber-400', to: 'to-orange-500',
    ring: 'ring-amber-400/60', glow: 'shadow-amber-400/40',
    bg: 'bg-amber-500/10', text: 'text-amber-400',
    icon: Crown, emoji: '👑',
  };
  if (level >= 40) return {
    name: 'Grande Mestre', shortName: 'Grande Mestre',
    from: 'from-fuchsia-400', via: 'via-purple-500', to: 'to-violet-600',
    ring: 'ring-fuchsia-500/50', glow: 'shadow-fuchsia-500/40',
    bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400',
    icon: Star, emoji: '⭐',
  };
  if (level >= 30) return {
    name: 'Lendário', shortName: 'Lendário',
    from: 'from-purple-400', via: 'via-indigo-500', to: 'to-blue-600',
    ring: 'ring-purple-500/50', glow: 'shadow-purple-500/30',
    bg: 'bg-purple-500/10', text: 'text-purple-400',
    icon: Star, emoji: '💜',
  };
  if (level >= 20) return {
    name: 'Épico', shortName: 'Épico',
    from: 'from-rose-400', via: 'via-red-500', to: 'to-pink-600',
    ring: 'ring-rose-500/50', glow: 'shadow-rose-500/30',
    bg: 'bg-rose-500/10', text: 'text-rose-400',
    icon: Flame, emoji: '🔥',
  };
  if (level >= 10) return {
    name: 'Raro', shortName: 'Raro',
    from: 'from-sky-400', via: 'via-blue-500', to: 'to-cyan-600',
    ring: 'ring-blue-500/50', glow: 'shadow-blue-500/30',
    bg: 'bg-blue-500/10', text: 'text-blue-400',
    icon: Zap, emoji: '⚡',
  };
  if (level >= 5) return {
    name: 'Avançado', shortName: 'Avançado',
    from: 'from-emerald-400', via: 'via-green-500', to: 'to-teal-600',
    ring: 'ring-emerald-500/50', glow: 'shadow-emerald-500/30',
    bg: 'bg-emerald-500/10', text: 'text-emerald-400',
    icon: Shield, emoji: '🛡️',
  };
  return {
    name: 'Iniciante', shortName: 'Iniciante',
    from: 'from-zinc-400', via: 'via-slate-500', to: 'to-gray-600',
    ring: 'ring-zinc-500/40', glow: 'shadow-zinc-500/20',
    bg: 'bg-zinc-500/10', text: 'text-zinc-400',
    icon: Sparkles, emoji: '✨',
  };
};

export default function LevelBadge({ level, size = 'md', className, showDetails = false }: LevelBadgeProps) {
  const t = tierFor(level);
  const TierIcon = t.icon;

  const sizes = {
    sm: { circle: 'h-8 w-8', text: 'text-xs', icon: 'h-2.5 w-2.5' },
    md: { circle: 'h-12 w-12', text: 'text-sm', icon: 'h-3 w-3' },
    lg: { circle: 'h-16 w-16', text: 'text-base', icon: 'h-3.5 w-3.5' },
    xl: { circle: 'h-20 w-20', text: 'text-lg', icon: 'h-4 w-4' },
  } as const;

  const s = sizes[size];

  return (
    <div className={cn('relative inline-flex flex-col items-center gap-1', className)}>
      {/* Glow effect */}
      <div className={cn(
        'relative flex items-center justify-center rounded-full font-black text-white',
        `bg-gradient-to-br ${t.from} ${t.via} ${t.to}`,
        `ring-2 ring-offset-2 ring-offset-background ${t.ring}`,
        `shadow-xl ${t.glow}`,
        s.circle,
        s.text,
      )}>
        <span className="leading-none drop-shadow">{level}</span>
        {/* Top-right icon */}
        <div className={cn(
          'absolute -top-1 -right-1 rounded-full bg-background ring-1 ring-border flex items-center justify-center',
          size === 'sm' ? 'p-0.5' : 'p-1',
        )}>
          <TierIcon className={cn(s.icon, t.text)} />
        </div>
      </div>

      {size !== 'sm' && (
        <span className={cn('font-bold uppercase tracking-wide text-[10px]', t.text)}>
          {t.shortName}
        </span>
      )}

      {showDetails && (
        <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', t.bg, t.text)}>
          {t.emoji} Nível {level}
        </div>
      )}
    </div>
  );
}
