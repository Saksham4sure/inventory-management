import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-600 transition-all duration-150 hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.95] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-200 rotate-0 scale-100 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-200 rotate-0 scale-100 text-zinc-600" />
      )}
    </button>
  );
};
export default ThemeToggle;
