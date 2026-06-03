import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useAchievements } from '../hooks/useDashboardData';
import { 
  IconHome, 
  IconUserScan, 
  IconTarget, 
  IconHistory, 
  IconBrain, 
  IconUsers, 
  IconSettings,
  IconBookmark,
  IconSearch,
  IconFlame,
  IconBell,
  IconChevronDown,
  IconTrophy,
  IconLogout,
} from '@tabler/icons-react';
import { Logo } from '../components/Logo';
import { PageTransition } from '../components/PageTransition';
import { ThemeToggle } from '../components/ThemeToggle';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const NAV_LINKS = [
  { id: 'home', label: 'Home', path: '/dashboard', icon: IconHome, exact: true },
  { id: 'mirror', label: 'My Mirror', path: '/dashboard/mirror', icon: IconUserScan },
  { id: 'goals', label: 'Goals', path: '/dashboard/goals', icon: IconTarget },
  { id: 'saved', label: 'Saved', path: '/dashboard/saved', icon: IconBookmark },
  { id: 'history', label: 'History', path: '/dashboard/history', icon: IconHistory },
  { id: 'coach', label: 'AI Coach', path: '/dashboard/coach', icon: IconBrain, badge: 'New' },
  { id: 'circles', label: 'Circles', path: '/dashboard/circles', icon: IconUsers },
  { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: IconSettings },
];

export const DashboardLayout = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const { data: achievementData } = useAchievements();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Explorer';
  const currentDate = format(new Date(), 'EEEE, MMM do');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#000000] overflow-hidden text-slate-900 dark:text-white font-sans selection:bg-[#6C4FF6]/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-full w-[240px] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-[#111] z-50 flex-col">
        <div className="h-[60px] flex items-center px-6 border-b border-slate-200 dark:border-[#222]">
          <div className="flex items-center gap-2 font-bold text-xl text-[#6C4FF6]">
            <Logo className="w-6 h-6" aria-hidden="true" /> Cognify
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <NavLink 
              key={link.id} 
              to={link.path}
              end={link.exact}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none group z-10",
                isActive 
                  ? "text-white" 
                  : "text-slate-600 dark:text-[#A7A9BE] hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 bg-[#6C4FF6] rounded-lg -z-10 shadow-[0_0_15px_rgba(108,79,246,0.3)]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className={cn("transition-colors", isActive ? "text-white" : "group-hover:text-[#6C4FF6]")}>
                    <link.icon size={20} aria-hidden="true" />
                  </div>
                  <span className="relative z-10">{link.label}</span>
                  {link.badge && (
                    <span className={cn(
                      "ml-auto text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full relative z-10",
                      isActive ? "bg-white/20 text-white" : "bg-[#6C4FF6] text-white"
                    )}>
                      {link.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {achievementData && (
            <div className="mt-4 px-4 py-3 bg-[#6C4FF6]/5 border border-[#6C4FF6]/10 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#6C4FF6] flex items-center gap-1">
                  <IconTrophy size={14} aria-hidden="true" /> Level {achievementData.level || 1}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{achievementData.totalXP || 0} XP</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-[#222] rounded-full overflow-hidden" role="progressbar" aria-label="Level progress">
                <div className="h-full bg-[#6C4FF6] rounded-full" style={{ width: `${((achievementData.totalXP || 0) % 100)}%` }} />
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-[#222]">
          <div className="bg-gradient-to-br from-[#6C4FF6]/20 to-purple-500/10 border border-[#6C4FF6]/30 rounded-xl p-4 text-center">
            <h4 className="text-sm font-bold text-[#6C4FF6] mb-1">Unlock full Mirror</h4>
            <p className="text-xs text-slate-600 dark:text-[#A7A9BE] mb-3">Pro from ₹299/mo</p>
            <button 
              className="w-full py-1.5 bg-[#6C4FF6] text-white text-xs font-bold rounded-lg hover:bg-[#5B40DB] transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6C4FF6] outline-none"
              aria-label="Upgrade to Pro"
            >
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Bar */}
        <header className="h-[60px] flex items-center justify-between px-4 lg:px-8 border-b border-slate-200/50 dark:border-[#111] bg-white/60 dark:bg-[#000000]/60 backdrop-blur-2xl z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-bold text-lg text-[#6C4FF6] lg:hidden" aria-label="Cognify">
              <Logo className="w-5 h-5" aria-hidden="true" /> Cognify
            </div>
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold">Good morning, {firstName}</h2>
              <p className="text-xs text-slate-500 dark:text-[#A7A9BE]">{currentDate}</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4 lg:mx-8 hidden sm:block relative">
            <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input 
              type="search" 
              placeholder="Search your content history..." 
              aria-label="Search content history"
              className="w-full bg-slate-100 dark:bg-[#1A1A1A] border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#6C4FF6] outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button 
              className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none"
              aria-label="Notifications — 1 unread"
            >
              <IconBell size={22} aria-hidden="true" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
            </button>

            {/* User Avatar / Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 ml-2 cursor-pointer border-l pl-4 border-slate-200 dark:border-[#222] focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none rounded"
                aria-label="User menu"
                aria-expanded={showUserMenu}
              >
                <div className="w-8 h-8 rounded-full bg-[#6C4FF6] text-white flex items-center justify-center font-bold text-sm uppercase">
                  {firstName.charAt(0)}
                </div>
                <IconChevronDown size={16} className="text-slate-500 hidden sm:block" aria-hidden="true" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-[#333]">
                    <p className="text-xs font-bold truncate">{firstName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                  >
                    <IconLogout size={16} aria-hidden="true" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8">
          <div className="max-w-[1200px] mx-auto w-full">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[65px] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-slate-200 dark:border-[#222] z-50 flex items-center justify-around px-2 pb-safe" aria-label="Mobile navigation">
        {[
          { id: 'home', path: '/dashboard', icon: IconHome, label: 'Home', exact: true },
          { id: 'goals', path: '/dashboard/goals', icon: IconTarget, label: 'Goals' },
          { id: 'coach', path: '/dashboard/coach', icon: IconBrain, label: 'Coach' },
          { id: 'circles', path: '/dashboard/circles', icon: IconUsers, label: 'Circles' },
          { id: 'settings', path: '/dashboard/settings', icon: IconSettings, label: 'Settings' }
        ].map(link => (
          <NavLink
            key={link.id}
            to={link.path}
            end={link.exact}
            aria-label={link.label}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none gap-0.5",
              isActive ? "text-[#6C4FF6]" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <link.icon size={22} stroke={1.5} aria-hidden="true" />
            <span className="text-[9px] font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
