import React, { useId, useMemo, useState } from 'react';
import { CheckCircle2, Phone } from 'lucide-react';
import { extractNepaliLocalDigits, validateNepaliPhone } from '../../utils/phoneValidator';

/**
 * iPhone-inspired Nepali Phone Input Component
 * Displays fixed "+977" at front and verifies Nepali mobile (10 digits starting with 98, 97, 96) or landline.
 */
export const PhoneInput = ({
  label = 'Phone Number',
  id,
  value = '',
  onChange,
  onBlur,
  error: externalError,
  required = false,
  disabled = false,
  placeholder = '98XXXXXXXX',
  className = '',
  helperText,
  autoFocus = false,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Extract the local digits from whatever format is stored in value
  const localDigits = useMemo(() => extractNepaliLocalDigits(value), [value]);

  // Validation status
  const validation = useMemo(() => {
    return validateNepaliPhone(localDigits, required);
  }, [localDigits, required]);

  const handleChange = (e) => {
    setHasInteracted(true);
    const rawInput = e.target.value;
    // Extract only digits and limit to 10 characters (Nepali mobile numbers)
    const cleaned = extractNepaliLocalDigits(rawInput).slice(0, 10);
    const formatted = cleaned ? `+977 ${cleaned}` : '';

    if (onChange) {
      // Synthesize event to be drop-in compatible with standard onChange handlers
      const syntheticEvent = {
        target: {
          name: inputId,
          value: formatted,
        },
      };
      onChange(syntheticEvent, formatted, validateNepaliPhone(cleaned, required).isValid);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    setHasInteracted(true);
    if (onBlur) onBlur(e);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // Determine error to display
  const displayError =
    externalError || (hasInteracted && localDigits.length > 0 && !validation.isValid ? validation.error : null);

  const isValidComplete = validation.isValid && localDigits.length >= 8;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400"
          >
            {label} {required && <span className="text-zinc-400 dark:text-zinc-500">*</span>}
          </label>
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
            Nepal (+977)
          </span>
        </div>
      )}

      <div
        className={`relative flex items-center rounded-xl border transition-all duration-200 overflow-hidden ${
          displayError
            ? 'border-rose-400/80 bg-rose-500/5 dark:border-rose-800 dark:bg-rose-950/20 ring-2 ring-rose-500/15'
            : isFocused
            ? 'border-zinc-800 bg-white ring-2 ring-[#DBFE80]/50 dark:border-[#DBFE80] dark:bg-zinc-900/90 dark:ring-[#DBFE80]/25'
            : 'border-black/[0.08] bg-black/[0.025] hover:border-black/[0.14] hover:bg-black/[0.035] dark:border-white/[0.09] dark:bg-white/[0.05] dark:hover:border-white/[0.15]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-800/40' : ''}`}
      >
        {/* Fixed +977 Country Prefix Badge */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] border-r border-black/[0.08] dark:border-white/[0.09] select-none shrink-0">
          <span className="text-sm leading-none" role="img" aria-label="Nepal Flag">
            🇳🇵
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200">
            +977
          </span>
        </div>

        {/* Local Number Input */}
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={localDigits}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          className={`w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none ${className}`}
        />

        {/* Verification indicator icon */}
        <div className="pr-3 flex items-center shrink-0">
          {isValidComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 transition-all animate-in fade-in zoom-in-75 duration-200" />
          ) : (
            <Phone className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          )}
        </div>
      </div>

      {/* Inline Feedback */}
      {displayError ? (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {displayError}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-0.5">{helperText}</p>
      ) : (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 pl-0.5">
          Standard 10-digit mobile (starts with 98, 97, 96) or 8-digit landline
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
