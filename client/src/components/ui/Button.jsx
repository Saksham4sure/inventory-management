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
    'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const variants = {
    // Restrained green accent
    primary:
      'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 font-semibold',
    secondary:
      'bg-white text-zinc-800 border border-zinc-200/80 shadow-xs hover:bg-zinc-50 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:border-zinc-700',
    ghost:
      'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-850',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-900/40',
    subtle:
      'bg-zinc-100 text-zinc-800 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-3.5 py-2 text-xs sm:text-sm rounded-lg gap-2',
    lg: 'px-4 py-2.5 text-sm sm:text-base rounded-xl gap-2',
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
};
export default Button;
