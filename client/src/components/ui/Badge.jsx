export const Badge = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const variants = {
    default:
      'bg-zinc-500/10 text-zinc-700 border-zinc-500/15 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/20',
    accent:
      'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    primary:
      'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    success:
      'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    warning:
      'bg-amber-500/10 text-amber-800 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    danger:
      'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    neutral:
      'bg-black/[0.04] text-zinc-600 border-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-300 dark:border-white/[0.08]',
    blue:
      'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  };

  const dotColors = {
    default: 'bg-zinc-400 dark:bg-zinc-500',
    accent: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    primary: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    success: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    warning: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]',
    danger: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]',
    neutral: 'bg-zinc-400',
    blue: 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.5)]',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-[11px] font-medium tracking-tight',
    md: 'px-3 py-1 text-xs font-medium tracking-tight',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-md transition-colors ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant] || dotColors.default}`} />
      )}
      {children}
    </span>
  );
};
export default Badge;
