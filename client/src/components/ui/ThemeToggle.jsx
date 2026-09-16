import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`group relative inline-flex h-9 w-9 sm:h-9 sm:w-16 items-center justify-between rounded-full p-1 transition-all duration-300 ease-out active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 border border-black/[0.08] dark:border-white/[0.12] bg-black/[0.04] dark:bg-white/[0.08] backdrop-blur-xl shadow-2xs ${className}`}
    >
      {/* On desktop: dual icon pill track */}
      <span className="hidden sm:flex items-center justify-between w-full px-1 text-zinc-400 dark:text-zinc-500">
        <Sun className={`h-3 w-3 transition-colors ${!isDark ? 'text-amber-500' : ''}`} />
        <Moon className={`h-3 w-3 transition-colors ${isDark ? 'text-purple-300' : ''}`} />
      </span>

      {/* Floating sliding thumb on desktop */}
      <span
        className={`hidden sm:flex absolute top-1 h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-zinc-850 shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] dark:ring-white/[0.1] transition-transform duration-300 cubic-bezier(0.16,1,0.3,1) ${
          isDark ? 'translate-x-7 text-purple-400' : 'translate-x-0 text-amber-500'
        }`}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>

      {/* Mobile single icon morphing button */}
      <span className="flex sm:hidden items-center justify-center w-full h-full">
        {isDark ? (
          <Moon className="h-4 w-4 text-purple-400 transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 rotate-0 scale-100" />
        )}
      </span>
    </button>
  );
};
export default ThemeToggle;
