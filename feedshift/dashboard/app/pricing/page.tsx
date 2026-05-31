import Link from 'next/link';
import PricingCards from '@/components/PricingCards';
import { ArrowLeft, BrainCircuit } from 'lucide-react';

export const metadata = {
  title: 'Pricing — FeedShift',
  description: 'Choose a FeedShift plan that fits your learning goals.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#030305] text-slate-100 selection:bg-primary/30 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[140px]" />
      </div>

      <div className="relative">
        {/* Top Nav */}
        <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link
              href="/dashboard"
              className="glass p-2.5 rounded-xl glass-hover text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center">
                <BrainCircuit className="text-white" size={16} />
              </div>
              <span className="font-bold text-white">FeedShift</span>
              <span className="text-slate-500 text-sm">/ Plans</span>
            </div>
          </div>
        </header>

        {/* Pricing Cards */}
        <main className="py-12">
          <PricingCards />
        </main>
      </div>
    </div>
  );
}
