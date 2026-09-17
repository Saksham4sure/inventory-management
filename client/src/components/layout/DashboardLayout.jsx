import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Navbar } from '../common/Navbar';
import { BottomNav } from '../common/BottomNav';

export const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-[#F4F5F7] dark:bg-[#0f1117] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-[#DBFE80] selection:text-zinc-950">
      {/* Ambient Light Glow Layer */}
      <div className="app-ambient-glow" />

      {/* Sidebar navigation */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content viewport: natural stacking context so modals port comfortably */}
      <div className="relative flex flex-1 flex-col min-w-0">
        <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-8 lg:px-8 pb-28 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};
export default DashboardLayout;
