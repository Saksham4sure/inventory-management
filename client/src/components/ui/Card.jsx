export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  compact = false,
  glass = true,
  ...props
}) => {
  const surfaceStyle = glass
    ? 'bg-white/85 dark:bg-[#181b22]/80 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.08] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_32px_-4px_rgba(0,0,0,0.35)] ring-1 ring-white/80 dark:ring-white/[0.05]'
    : 'bg-white dark:bg-[#181b22] border border-zinc-200/80 dark:border-zinc-800 shadow-xs';

  const hoverStyle = hoverEffect
    ? 'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_14px_40px_-4px_rgba(0,0,0,0.5)] hover:border-black/[0.1] dark:hover:border-white/[0.15] transition-all duration-200 ease-out will-change-transform'
    : 'transition-colors duration-150';

  return (
    <div
      className={`rounded-2xl sm:rounded-[22px] text-zinc-900 dark:text-zinc-100 ${surfaceStyle} ${
        compact ? 'p-3.5 sm:p-4' : 'p-4.5 sm:p-6'
      } ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
