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
          className={`w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-xs transition-all duration-200 focus:outline-none ${
            error
              ? 'border-rose-400/80 bg-rose-500/5 dark:border-rose-800 dark:bg-rose-950/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-100/60 dark:bg-zinc-900/60' : ''} ${
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
