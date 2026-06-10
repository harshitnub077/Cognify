import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useAchievements, useUserProfile } from '../hooks/useDashboardData';
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
  IconBell,
  IconChevronDown,
  IconLogout,
  IconX,
  IconMenu2,
  IconScan,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconSparkles,
  IconClock
} from '@tabler/icons-react';
import { Logo } from '../components/Logo';
import { PageTransition } from '../components/PageTransition';
import { ThemeToggle } from '../components/ThemeToggle';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../lib/api';

const NAV_LINKS = [
  { id: 'home',     label: 'Overview',   path: '/dashboard',          icon: IconHome,     exact: true },
  { id: 'mirror',   label: 'My Mirror',  path: '/dashboard/mirror',   icon: IconUserScan  },
  { id: 'goals',    label: 'Goals',      path: '/dashboard/goals',    icon: IconTarget    },
  { id: 'saved',    label: 'Saved',      path: '/dashboard/saved',    icon: IconBookmark  },
  { id: 'history',  label: 'History',    path: '/dashboard/history',  icon: IconHistory   },
  { id: 'coach',    label: 'AI Coach',   path: '/dashboard/coach',    icon: IconBrain,    badge: 'AI' },
  { id: 'circles',  label: 'Circles',    path: '/dashboard/circles',  icon: IconUsers     },
  { id: 'settings', label: 'Settings',   path: '/dashboard/settings', icon: IconSettings  },
];

const MOBILE_NAV = [
  { id: 'home',     path: '/dashboard',          icon: IconHome,    label: 'Home',    exact: true },
  { id: 'goals',    path: '/dashboard/goals',    icon: IconTarget,  label: 'Goals'   },
  { id: 'coach',    path: '/dashboard/coach',    icon: IconBrain,   label: 'Coach'   },
  { id: 'circles',  path: '/dashboard/circles',  icon: IconUsers,   label: 'Circles' },
  { id: 'settings', path: '/dashboard/settings', icon: IconSettings,label: 'Settings'},
];

export const DashboardLayout = () => {
  const { user, signOut } = useAuthStore();
  const { data: achievementData } = useAchievements();
  const { data: profile } = useUserProfile();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Explorer';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={cn(
      'flex flex-col h-full bg-white dark:bg-[#0a0a0a]',
      mobile
        ? 'w-full'
        : 'w-[232px] border-r border-slate-200 dark:border-[#1a1a1a]'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-5 h-[60px] border-b border-slate-200 dark:border-[#1a1a1a] shrink-0', mobile && 'justify-between')}>
        <div className="flex items-center gap-2.5">
          <Logo className="w-7 h-7" />
          <span className="font-display font-bold text-lg tracking-tight">Cognify</span>
        </div>
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#222]">
            <IconX size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_LINKS.map(link => (
          <NavLink
            key={link.id}
            to={link.path}
            end={link.exact}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) => cn(
              'relative flex items-center gap-3 px-4 h-10 rounded-lg text-sm font-medium transition-all duration-200 group outline-none w-full',
              isActive
                ? 'text-white bg-[#222]'
                : 'text-surface-muted hover:text-white hover:bg-[#222]/50'
            )}
          >
            {({ isActive }) => (
              <>
                <link.icon size={18} aria-hidden="true" />
                <span className="flex-1">{link.label}</span>
                {link.badge && (
                  <span className={cn(
                    'h-5 px-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded border',
                    isActive
                      ? 'border-[#1a1a1a] text-white'
                      : 'border-transparent text-surface-muted'
                  )}>
                    {link.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* XP / Level */}
      {achievementData && (
        <div className="px-5 pb-3">
          <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
            <span className="text-slate-500 dark:text-surface-muted">Level {achievementData.level || 1}</span>
            <span className="text-white font-bold">{achievementData.totalXP || 0} XP</span>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-[#222] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${((achievementData.totalXP || 0) % 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* User */}
      <div className="p-3 border-t border-slate-200 dark:border-[#1a1a1a] shrink-0">
        <div ref={mobile ? undefined : userMenuRef} className="relative mt-2">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#222] transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-primary text-white-fg flex items-center justify-center font-bold text-xs shrink-0 uppercase">
              {firstName.charAt(0)}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-semibold truncate">{firstName}</div>
              <div className="text-[10px] text-surface-muted truncate">{user?.email}</div>
            </div>
            <IconChevronDown size={14} className="text-surface-muted shrink-0" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#1a1a1a] rounded-xl shadow-xl py-1.5 z-50"
              >
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <IconLogout size={15} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white font-sans overflow-hidden">

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 shadow-2xl"
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top bar */}
        <header className="absolute top-0 left-0 right-0 h-[60px] flex items-center gap-4 px-4 lg:px-6 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-xl z-30">
          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#222] transition-colors"
          >
            <IconMenu2 size={20} />
          </button>

          {/* Typographic Center */}
          <div className="flex-1 flex items-center justify-center mx-auto lg:ml-6 hidden sm:flex">
            <div className="flex items-center gap-3 select-none opacity-80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-surface-muted font-bold">
                Neural Sync Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="relative flex items-center justify-center w-10 h-10 rounded-lg text-surface-muted hover:text-white hover:bg-[#222] transition-colors"
              aria-label="Notifications"
            >
              <IconBell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-surface" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pt-[60px]">
          <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 pb-24 lg:pb-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-[#1a1a1a] z-50 flex items-center justify-around px-2">
        {MOBILE_NAV.map(link => (
          <NavLink
            key={link.id}
            to={link.path}
            end={link.exact}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 min-w-[56px] py-2 px-3 rounded-xl transition-colors',
              isActive
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
            )}
          >
            {({ isActive }) => (
              <>
                <link.icon size={20} stroke={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
