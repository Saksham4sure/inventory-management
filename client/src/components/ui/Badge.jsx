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
      'bg-[#DBFE80]/20 text-zinc-900 border-[#DBFE80]/40 dark:bg-[#DBFE80]/15 dark:text-[#DBFE80] dark:border-[#DBFE80]/30',
    primary:
      'bg-[#DBFE80]/20 text-zinc-900 border-[#DBFE80]/40 dark:bg-[#DBFE80]/15 dark:text-[#DBFE80] dark:border-[#DBFE80]/30',
    success:
      'bg-[#DBFE80]/20 text-zinc-900 border-[#DBFE80]/40 dark:bg-[#DBFE80]/15 dark:text-[#DBFE80] dark:border-[#DBFE80]/30',
    warning:
      'bg-amber-500/10 text-amber-800 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    danger:
      'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    neutral:
      'bg-black/[0.04] text-zinc-600 border-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-300 dark:border-white/[0.08]',
  };

  const dotColors = {
    default: 'bg-zinc-400 dark:bg-zinc-500',
    accent: 'bg-[#8ca825] dark:bg-[#DBFE80] shadow-[0_0_6px_rgba(219,254,128,0.7)]',
    primary: 'bg-[#8ca825] dark:bg-[#DBFE80] shadow-[0_0_6px_rgba(219,254,128,0.7)]',
    success: 'bg-[#8ca825] dark:bg-[#DBFE80] shadow-[0_0_6px_rgba(219,254,128,0.7)]',
    warning: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]',
    danger: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]',
    neutral: 'bg-zinc-400',
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
