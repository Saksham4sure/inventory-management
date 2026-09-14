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
          className="block text-[11px] font-medium tracking-wide uppercase text-zinc-500 dark:text-zinc-400"
        >
          {label} {required && <span className="text-emerald-600 dark:text-emerald-400">*</span>}
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
          className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-all duration-150 focus:outline-none ${
            error
              ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-zinc-200/90 bg-white hover:border-zinc-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-zinc-700 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900' : ''} ${
            rightElement ? 'pr-10' : ''
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">{helperText}</p>
      )}
    </div>
  );
};
export default Input;
