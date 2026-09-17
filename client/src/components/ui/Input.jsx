export const Input = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className = '',
  helperText,
  rightElement,
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400"
        >
          {label} {required && <span className="text-zinc-400 dark:text-zinc-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all duration-200 focus:outline-none ${
            error
              ? 'border-rose-400/80 bg-rose-500/5 dark:border-rose-800 dark:bg-rose-950/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
              : 'border-black/[0.08] bg-black/[0.025] hover:border-black/[0.14] hover:bg-black/[0.035] focus:bg-white focus:border-zinc-800 focus:ring-2 focus:ring-[#DBFE80]/50 dark:border-white/[0.09] dark:bg-white/[0.05] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.07] dark:focus:bg-zinc-900/90 dark:focus:border-[#DBFE80] dark:focus:ring-[#DBFE80]/25'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-800/40' : ''} ${
            rightElement ? 'pr-10' : ''
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-0.5">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-0.5">{helperText}</p>
      )}
    </div>
  );
};
export default Input;
