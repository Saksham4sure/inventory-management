import { useState, useRef, useEffect, Children } from 'react';
import { ChevronsUpDown, Check, Search, X } from 'lucide-react';

export const Select = ({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  children,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  compact = false,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options from either options prop or children <option> tags
  let normalizedOptions = [];
  if (options && options.length > 0) {
    normalizedOptions = options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: String(opt), label: String(opt) };
      }
      return {
        value: String(opt.value ?? opt.code ?? opt.id ?? ''),
        label: String(opt.label ?? opt.name ?? opt.value ?? ''),
        subtext: opt.subtext || '',
      };
    });
  } else if (children) {
    Children.forEach(children, (child) => {
      if (child && child.props) {
        normalizedOptions.push({
          value: String(child.props.value ?? child.props.children ?? ''),
          label: String(child.props.children ?? child.props.value ?? ''),
          subtext: child.props['data-subtext'] || '',
        });
      }
    });
  }

  // Find currently selected option
  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Auto-enable search if there are more than 7 options
  const isSearchActive = searchable || normalizedOptions.length > 7;

  // Filtered options based on search query
  const filteredOptions = isSearchActive && searchQuery
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : normalizedOptions;

  const closeMenu = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const openMenu = () => {
    setSearchQuery('');
    setIsOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && isSearchActive && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSearchActive]);

  // Handle keyboard events (Escape to close)
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
      e.stopPropagation();
    } else if ((e.key === 'Enter' || e.key === ' ') && !isOpen) {
      e.preventDefault();
      openMenu();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0].value);
      }
    } else if (e.key === 'Escape') {
      closeMenu();
    }
  };

  const handleSelectOption = (optValue) => {
    if (onChange) {
      // Send standard synthetic-like event object for React compatibility
      onChange({
        target: {
          value: optValue,
          name: name || id,
        },
      });
    }
    closeMenu();
  };

  return (
    <div
      className={`w-full ${label ? 'space-y-1.5' : ''} ${isOpen ? 'relative z-50' : 'relative z-10'}`}
      ref={containerRef}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400"
        >
          {label} {required && <span className="text-zinc-400 dark:text-zinc-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* iPhone Inspired Trigger Button */}
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => (!disabled ? (isOpen ? closeMenu() : openMenu()) : null)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full flex items-center justify-between text-left transition-all duration-200 ease-out select-none ${
            compact
              ? 'rounded-xl px-3 py-1.5 text-xs'
              : 'rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm'
          } ${
            error
              ? 'border border-rose-400/80 bg-rose-500/5 dark:border-rose-800 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100'
              : 'border border-black/[0.08] bg-black/[0.025] hover:bg-black/[0.04] hover:border-black/[0.14] dark:border-white/[0.09] dark:bg-white/[0.05] dark:hover:bg-white/[0.07] dark:hover:border-white/[0.15]'
          } ${
            isOpen
              ? 'ring-2 ring-zinc-400/25 border-zinc-700 dark:border-zinc-400 dark:ring-zinc-600/30 bg-white dark:bg-[#181b22]'
              : ''
          } ${
            disabled ? 'opacity-50 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-800/40' : 'cursor-pointer active:scale-[0.985]'
          } ${className}`}
        >
          <span
            className={`truncate font-normal ${
              selectedOption
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2 shrink-0 transition-transform duration-300 ease-out ${
              isOpen ? 'rotate-180 scale-110 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'
            }`}
          />
        </button>

        {/* Hidden native select for form serialization / accessibility */}
        <select
          tabIndex={-1}
          aria-hidden="true"
          value={value || ''}
          name={name || id}
          onChange={() => {}}
          className="sr-only"
        >
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* iPhone Inspired Floating Popover Sheet */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl bg-white/95 dark:bg-[#191b22]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-2xl ring-1 ring-black/[0.05] dark:ring-white/[0.05] p-1.5 animate-ios-menu overflow-hidden min-w-[200px]"
          >
            {/* iOS Search Bar */}
            {isSearchActive && (
              <div className="p-1 pb-1.5 border-b border-black/[0.05] dark:border-white/[0.06] mb-1">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search options..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 border border-transparent focus:border-black/[0.1] dark:focus:border-white/[0.15] focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectOption(opt.value);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOption(opt.value);
                      }}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm transition-all duration-150 cursor-pointer select-none active:scale-[0.985] ${
                        isSelected
                          ? 'bg-black/[0.06] dark:bg-white/[0.09] text-zinc-950 dark:text-white font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.035] dark:hover:bg-white/[0.05] active:bg-black/[0.07] dark:active:bg-white/[0.1]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.subtext && (
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-normal">
                            {opt.subtext}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0 ml-2 animate-ios-check" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  No matching options
                </div>
              )}
            </div>
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

export default Select;
