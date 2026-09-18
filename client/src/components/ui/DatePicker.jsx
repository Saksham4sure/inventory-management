import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatToYmd = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (ymdString) => {
  if (!ymdString) return '';
  try {
    const [y, m, d] = ymdString.split('-').map(Number);
    if (!y || !m || !d) return ymdString;
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return ymdString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return ymdString;
  }
};

export const DatePicker = ({
  label,
  id,
  name,
  value = '',
  onChange,
  placeholder = 'Pick a date',
  minDate,
  maxDate,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize initial view date
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = String(value).split('T')[0].split('-').map(Number);
    if (y && m && d) {
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  }, [value]);

  const initialYear = parsedValue ? parsedValue.getFullYear() : new Date().getFullYear();
  const initialMonth = parsedValue ? parsedValue.getMonth() : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // When value changes externally or popover opens, align view
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
    }
  }, [parsedValue, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
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

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      e.stopPropagation();
    } else if (e.key === 'Enter' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Select day
  const handleSelectDay = (dayDate) => {
    const ymd = formatToYmd(dayDate);
    if (onChange) {
      onChange({
        target: {
          name: name || id,
          id,
          value: ymd,
        },
      });
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    if (onChange) {
      onChange({
        target: {
          name: name || id,
          id,
          value: '',
        },
      });
    }
  };

  const handleSelectToday = () => {
    const today = new Date();
    handleSelectDay(today);
  };

  // Min / Max Date constraints
  const minDateTime = useMemo(() => {
    if (!minDate) return null;
    const [y, m, d] = String(minDate).split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }, [minDate]);

  const maxDateTime = useMemo(() => {
    if (!maxDate) return null;
    const [y, m, d] = String(maxDate).split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }, [maxDate]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month filler days to complete grid (42 cells = 6 rows)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Years range for quick selector (e.g. 1920 to currentYear + 5)
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear + 5; y >= 1920; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const todayYmd = formatToYmd(new Date());
  const selectedYmd = parsedValue ? formatToYmd(parsedValue) : '';

  return (
    <div className={`w-full ${label ? 'space-y-1.5' : ''}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400"
        >
          {label} {required && <span className="text-zinc-400 dark:text-zinc-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Shadcn-styled Trigger Button */}
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => (!disabled ? setIsOpen((o) => !o) : null)}
          onKeyDown={handleKeyDown}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`w-full flex items-center justify-between text-left transition-all duration-200 ease-out select-none rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-normal shadow-xs ${
            error
              ? 'border border-rose-400/80 bg-rose-500/5 dark:border-rose-800 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100'
              : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100'
          } ${
            isOpen
              ? 'ring-2 ring-zinc-900/10 dark:ring-zinc-100/10 border-zinc-900 dark:border-zinc-100'
              : ''
          } ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-800/40'
              : 'cursor-pointer active:scale-[0.99]'
          } ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <CalendarIcon
              className={`h-4 w-4 shrink-0 transition-colors ${
                selectedYmd
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            />
            <span
              className={`truncate ${
                selectedYmd
                  ? 'font-medium text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              {selectedYmd ? formatDisplayDate(selectedYmd) : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {selectedYmd && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Clear date"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </button>

        {/* Hidden input for native form compatibility */}
        <input
          type="hidden"
          name={name || id}
          value={selectedYmd}
        />

        {/* Shadcn Popover Calendar Modal */}
        {isOpen && (
          <div
            role="dialog"
            className="absolute left-0 sm:left-auto right-0 sm:right-auto top-[calc(100%+6px)] z-50 w-[300px] sm:w-[320px] rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl ring-1 ring-black/[0.05] dark:ring-white/[0.05] p-3.5 animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            {/* Header: Month & Year Controls */}
            <div className="flex items-center justify-between gap-1 pb-3 mb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              {/* Previous Month */}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Month & Year Selectors */}
              <div className="flex items-center gap-1">
                {/* Month Dropdown */}
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus:outline-none"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus:outline-none font-mono"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Next Month */}
              <button
                type="button"
                onClick={handleNextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAY_NAMES.map((d) => (
                <span
                  key={d}
                  className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 py-1"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map(({ date, dayNum, isCurrentMonth }, idx) => {
                const dayTime = date.getTime();
                const ymd = formatToYmd(date);
                const isSelected = ymd === selectedYmd;
                const isToday = ymd === todayYmd;

                // Check disabled state based on minDate / maxDate
                let isDisabled = false;
                if (minDateTime && dayTime < minDateTime) isDisabled = true;
                if (maxDateTime && dayTime > maxDateTime) isDisabled = true;

                return (
                  <button
                    key={`${ymd}-${idx}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDay(date)}
                    className={`h-8 w-8 sm:h-8.5 sm:w-8.5 mx-auto flex items-center justify-center text-xs rounded-xl transition-all font-medium ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                        : isToday
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-bold ring-1 ring-zinc-300 dark:ring-zinc-600'
                        : isCurrentMonth
                        ? 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        : 'text-zinc-300 dark:text-zinc-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40'
                    } ${
                      isDisabled
                        ? 'opacity-25 cursor-not-allowed pointer-events-none'
                        : 'cursor-pointer active:scale-95'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Today
              </button>

              {selectedYmd && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear</span>
                </button>
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

export default DatePicker;
