'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface StudyModeToggleProps {
  initial?: boolean;
  onChange?: (value: boolean) => void;
}

export function StudyModeToggle({ initial = false, onChange }: StudyModeToggleProps) {
  const [on, setOn] = useState(initial);

  const handleToggle = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };

  return (
    <button
      id="study-mode-toggle"
      onClick={handleToggle}
      className={`flex items-center gap-3 glass px-4 py-2.5 rounded-2xl border-l-4 transition-all duration-300 group ${
        on
          ? 'border-l-success bg-success/5 hover:bg-success/10'
          : 'border-l-slate-600 hover:bg-white/5'
      }`}
    >
      <ShieldCheck
        size={18}
        className={`transition-colors ${on ? 'text-success' : 'text-slate-500'}`}
      />
      <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${on ? 'text-success' : 'text-slate-500'}`}>
        {on ? 'Shield Active' : 'Shield Off'}
      </span>

      {/* Toggle pill */}
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${on ? 'bg-success' : 'bg-slate-700'}`}>
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${
            on ? 'left-5' : 'left-0.5'
          }`}
        />
      </div>
    </button>
  );
}
