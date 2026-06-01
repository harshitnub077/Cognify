import React from 'react';
import { Link } from 'react-router-dom';
import { IconError404, IconHome } from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';

const NotFound = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-white p-4">
      <IconError404 size={100} className="text-[#6C4FF6] mb-6" />
      <h1 className="text-4xl font-black mb-4 text-center">Lost in the Algorithm?</h1>
      <p className="text-slate-500 dark:text-[#A7A9BE] max-w-md text-center mb-8 text-lg">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>
      <Link 
        to={user ? "/dashboard" : "/"}
        className="flex items-center gap-2 bg-[#6C4FF6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#5B40DB] transition-colors"
      >
        <IconHome size={20} />
        {user ? "Back to Dashboard" : "Back Home"}
      </Link>
    </div>
  );
};

export default NotFound;
