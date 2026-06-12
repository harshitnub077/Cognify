import React from 'react';

// ─── Feature Section 3D Background ────────────────────────────────────────────
// Premium 3D Orbital "Semantic Core" — blends perfectly with the Identity Telemetry aesthetic.
// Pure CSS keyframes — GPU compositor, zero JS overhead.
export default function FeatureBackground() {
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden flex items-center justify-center">
      <style>{`
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes float-up {
          0% { transform: translateY(150px) scale(0.5); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-150px) scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* ── Top mask — prevents bleed into the hero section above */}
      <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent z-20 pointer-events-none" />

      {/* ── 3D Orbital Rings System ────────────────────────────────────────────── */}
      <div className="absolute left-1/2 top-[55%] w-[1200px] h-[1200px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center" style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}>
        
        {/* Ring 1 - Outer */}
        <div className="absolute w-full h-full" style={{ transform: 'rotateX(72deg) rotateY(8deg)', transformStyle: 'preserve-3d' }}>
          <div 
            className="w-full h-full rounded-full border-[2px] border-slate-500/10 border-t-slate-400/40" 
            style={{ 
              animation: 'spin-slow 35s linear infinite',
              boxShadow: 'inset 0 10px 50px rgba(148,163,184,0.05), 0 -10px 50px rgba(148,163,184,0.08)'
            }} 
          />
        </div>

        {/* Ring 2 - Middle */}
        <div className="absolute w-[75%] h-[75%]" style={{ transform: 'rotateX(68deg) rotateY(-12deg)', transformStyle: 'preserve-3d' }}>
          <div 
            className="w-full h-full rounded-full border-[2px] border-white/5 border-l-white/30" 
            style={{ 
              animation: 'spin-reverse 25s linear infinite',
              boxShadow: 'inset -10px 0 50px rgba(255,255,255,0.05)'
            }} 
          />
        </div>

        {/* Ring 3 - Inner Core Boundary */}
        <div className="absolute w-[45%] h-[45%]" style={{ transform: 'rotateX(78deg) rotateY(4deg)', transformStyle: 'preserve-3d' }}>
          <div 
            className="w-full h-full rounded-full border border-slate-300/10 border-b-slate-200/50 border-r-slate-200/20" 
            style={{ 
              animation: 'spin-slow 15s linear infinite',
              boxShadow: '0 20px 80px rgba(203,213,225,0.1)'
            }} 
          />
        </div>

        {/* Ring 4 - Abstract Offset */}
        <div className="absolute w-[90%] h-[90%]" style={{ transform: 'rotateX(60deg) rotateY(20deg) rotateZ(45deg)', transformStyle: 'preserve-3d' }}>
          <div 
            className="w-full h-full rounded-full border-[1.5px] border-white/5 border-r-white/20" 
            style={{ animation: 'spin-reverse 45s linear infinite' }} 
          />
        </div>
      </div>

      {/* ── Central Neural Glow ────────────────────────────────────────────────── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          left: '50%',
          top: '55%',
          marginLeft: -250,
          marginTop: -250,
          background: 'radial-gradient(circle, rgba(203,213,225,0.08) 0%, rgba(148,163,184,0.03) 30%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'pulse-glow 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none mix-blend-screen"
        style={{
          width: 200,
          height: 200,
          left: '50%',
          top: '55%',
          marginLeft: -100,
          marginTop: -100,
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
          filter: 'blur(20px)',
        }}
      />

      {/* ── Telemetry Particles ────────────────────────────────────────────────── */}
      {[
        { left: '42%', delay: '0s', dur: '8s', size: 4 },
        { left: '55%', delay: '2s', dur: '12s', size: 3 },
        { left: '48%', delay: '5s', dur: '9s', size: 5 },
        { left: '58%', delay: '1s', dur: '15s', size: 3 },
        { left: '38%', delay: '7s', dur: '11s', size: 4 },
        { left: '50%', delay: '3s', dur: '10s', size: 6 },
        { left: '45%', delay: '6s', dur: '14s', size: 3 },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          style={{
            left: p.left,
            top: '55%',
            width: p.size,
            height: p.size,
            animation: `float-up ${p.dur} linear infinite`,
            animationDelay: p.delay,
            willChange: 'transform, opacity',
          }}
        />
      ))}

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none" />
    </div>
  );
}
