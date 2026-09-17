export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium tracking-tight transition-all duration-200 ease-out active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-900 disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 select-none';

  const variants = {
    primary:
      'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-medium shadow-xs border border-zinc-900/10 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:active:bg-white dark:text-zinc-900 dark:border-white/10',
    accent:
      'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-100 font-medium shadow-xs border border-zinc-700/50 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:active:bg-zinc-100 dark:text-zinc-900',
    secondary:
      'bg-black/[0.04] dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-100 border border-black/[0.07] dark:border-white/[0.09] shadow-2xs hover:bg-black/[0.07] dark:hover:bg-white/[0.14]',
    ghost:
      'text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08]',
    danger:
      'bg-rose-500/10 text-rose-700 border border-rose-500/20 hover:bg-rose-500/18 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50 dark:hover:bg-rose-900/50',
    subtle:
      'bg-zinc-100 text-zinc-800 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80',
    dark:
      'bg-zinc-900 text-white shadow-xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm sm:text-base rounded-2xl gap-2.5',
    icon: 'h-9 w-9 rounded-xl p-0',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
export default Button;
