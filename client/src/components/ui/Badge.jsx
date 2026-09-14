export const Badge = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
}) => {
  const variants = {
    default:
      'bg-zinc-100 text-zinc-700 border-zinc-200/70 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-750',
    accent:
      'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    primary:
      'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    warning:
      'bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
    danger:
      'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
    neutral:
      'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800',
  };

  const dotColors = {
    default: 'bg-zinc-400 dark:bg-zinc-500',
    accent: 'bg-emerald-500',
    primary: 'bg-emerald-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-zinc-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-tight',
    md: 'px-2.5 py-1 text-xs font-medium tracking-tight',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant] || dotColors.default}`} />}
      {children}
    </span>
  );
};
export default Badge;
