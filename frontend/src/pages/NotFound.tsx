import React from 'react';
import { Link } from 'react-router-dom';
import { IconError404, IconHome } from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';

const NotFound = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-slate-900 dark:text-white p-6 text-center">
      <IconError404 size={80} stroke={1.5} className="text-white dark:text-surface-border mb-6" />
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Page Not Found</h1>
      <p className="text-slate-500 dark:text-surface-muted max-w-sm mb-8 text-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link 
        to={user ? "/dashboard" : "/"}
        className="btn-primary flex items-center gap-2"
      >
        <IconHome size={18} />
        {user ? "Back to Dashboard" : "Back Home"}
      </Link>
    </div>
  );
};

export default NotFound;
