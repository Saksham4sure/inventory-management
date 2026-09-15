import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Navbar } from '../common/Navbar';
import { BottomNav } from '../common/BottomNav';

export const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased transition-colors">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:px-6 sm:py-7 lg:px-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Native-like Mobile Bottom Nav Bar */}
      <BottomNav />
    </div>
  );
};
export default DashboardLayout;
