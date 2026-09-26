import { useState, useRef, useEffect, Children } from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const searchInputRef = useRef(null);

  const [menuCoords, setMenuCoords] = useState({
    top: undefined,
    bottom: undefined,
    left: 0,
    width: 0,
    maxHeight: 240,
    placement: 'bottom',
  });

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

  // Extract primitive value safely (supports string, number, or synthetic event object)
  const resolvedValue = (() => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') {
      return String(value.target?.value ?? value.value ?? '');
    }
    return String(value);
  })();

  // Find currently selected option
  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === resolvedValue
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

  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // If trigger is scrolled completely out of viewport, close menu
    if (rect.bottom < 0 || rect.top > viewportHeight) {
      closeMenu();
      return;
    }

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip to top if space below is too tight (< 220px) AND space above has more room
    const shouldPlaceTop = spaceBelow < 220 && spaceAbove > spaceBelow;

    const maxHeight = shouldPlaceTop
      ? Math.max(120, Math.min(260, spaceAbove - 20))
      : Math.max(120, Math.min(260, spaceBelow - 20));

    let left = rect.left;
    const width = rect.width;
    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }
    if (left < 8) left = 8;

    setMenuCoords({
      top: shouldPlaceTop ? undefined : rect.bottom + 6,
      bottom: shouldPlaceTop ? viewportHeight - rect.top + 6 : undefined,
      left,
      width,
      maxHeight,
      placement: shouldPlaceTop ? 'top' : 'bottom',
    });
  };

  const openMenu = () => {
    setSearchQuery('');
    setIsOpen(true);
    // Smoothly scroll trigger into comfortable view if near container boundaries
    setTimeout(() => {
      triggerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      updateMenuPosition();
    }, 20);
  };

  // Recalculate menu position on scroll or window resize
  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handleScrollOrResize = (e) => {
      // If scroll happens within the dropdown itself, don't trigger parent updates
      if (popoverRef.current && popoverRef.current.contains(e.target)) {
        return;
      }
      updateMenuPosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
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
      const syntheticEvent = {
        target: {
          value: optValue,
          name: name || id,
        },
        currentTarget: {
          value: optValue,
          name: name || id,
        },
        value: optValue,
        name: name || id,
        toString: () => String(optValue),
        valueOf: () => optValue,
      };

      onChange(syntheticEvent, optValue);
    }
    closeMenu();
  };

  const popoverElement =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
              bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
              left: `${menuCoords.left}px`,
              width: `${menuCoords.width}px`,
              zIndex: 99999,
              transformOrigin: menuCoords.placement === 'top' ? 'bottom center' : 'top center',
            }}
            className="rounded-2xl bg-white/95 dark:bg-[#191b22]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-2xl ring-1 ring-black/[0.05] dark:ring-white/[0.05] p-1.5 animate-ios-menu overflow-hidden min-w-[200px]"
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
            <div
              style={{ maxHeight: `${menuCoords.maxHeight}px` }}
              className="overflow-y-auto space-y-0.5 overscroll-contain modal-scroll"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === resolvedValue;
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
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={`w-full ${label ? 'space-y-1.5' : ''}`}
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
        {/* Trigger Button */}
        <button
          ref={triggerRef}
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
          value={resolvedValue || ''}
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

        {/* Portaled Floating Popover */}
        {popoverElement}
      </div>

      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-0.5">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-0.5">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
