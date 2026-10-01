'use client';

import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { logoutUser } from '@/store/features/authSlice';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Shield, User } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push('/login');
  };

  return (
    <AuthGuard>
      <div className="h-screen w-screen overflow-hidden bg-background flex">
        {/* Sidebar - Fixed to the left, does not scroll */}
        <aside className="w-64 h-screen shrink-0 border-r border-border bg-card/50 backdrop-blur-sm hidden md:flex flex-col">
          <div className="p-6 shrink-0">
            <div className="flex items-center gap-2 font-bold text-xl">
              <Shield className="w-6 h-6 text-primary" />
              <span>CyberScan</span>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
            <Link 
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              Overview
            </Link>
          </nav>

          <div className="p-4 border-t border-border mt-auto shrink-0">
            <div className="flex items-center gap-3 px-3 py-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area - Only this container scrolls */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background shrink-0">
             <div className="flex items-center gap-2 font-bold">
              <Shield className="w-5 h-5 text-primary" />
              <span>CyberScan</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer">
              <LogOut className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
