export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  compact = false,
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 shadow-xs transition-all duration-150 ${
        compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'
      } ${
        hoverEffect
          ? 'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
