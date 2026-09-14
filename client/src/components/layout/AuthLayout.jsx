import { Outlet } from 'react-router-dom';
import { QrCode } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-100 via-indigo-50/30 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 mb-3">
            <QrCode className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">StockPulse QR</h2>
          <p className="text-sm text-slate-500 mt-1">
            Multi-Tenant Inventory & QR Tracking System
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
