export const Badge = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const variants = {
    default:
      'bg-black/[0.04] text-zinc-700 border-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-300 dark:border-white/[0.08]',
    accent:
      'bg-zinc-900 text-white border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    primary:
      'bg-zinc-900 text-white border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    success:
      'bg-black/[0.04] text-zinc-700 border-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-300 dark:border-white/[0.08]',
    warning:
      'bg-black/[0.04] text-zinc-700 border-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-300 dark:border-white/[0.08]',
    danger:
      'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    neutral:
      'bg-black/[0.04] text-zinc-600 border-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-300 dark:border-white/[0.08]',
  };

  const dotColors = {
    default: 'bg-zinc-400 dark:bg-zinc-500',
    accent: 'bg-zinc-400 dark:bg-zinc-500',
    primary: 'bg-zinc-400 dark:bg-zinc-500',
    success: 'bg-zinc-400 dark:bg-zinc-500',
    warning: 'bg-zinc-400 dark:bg-zinc-500',
    danger: 'bg-rose-500',
    neutral: 'bg-zinc-400 dark:bg-zinc-500',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-[11px] font-medium tracking-tight',
    md: 'px-3 py-1 text-xs font-medium tracking-tight',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant] || dotColors.default}`} />
      )}
      {children}
    </span>
  );
};
export default Badge;
