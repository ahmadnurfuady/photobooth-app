import React from 'react';
import Link from 'next/link';

// Icon Components (Pakai SVG langsung agar tidak perlu install library tambahan dulu)
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-hidden flex flex-col font-sans text-slate-100">
      
      {/* --- BACKGROUND EFFECTS (Glowy Blobs) --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* --- NAVBAR --- */}
      <nav className="w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <CameraIcon />
          </div>
          <span className="text-xl font-bold tracking-tight">SnapBooth<span className="text-blue-400">.</span></span>
        </div>
        
        {/* Admin Login dipindah ke sini agar rapi */}
        <Link href="/admin/login">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-full">
            <LockIcon />
            Admin Access
          </button>
        </Link>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 mt-8 mb-16">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Ready to Capture
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 animate-in fade-in slide-in-from-bottom-6 duration-700">
          Capture Moments,<br /> Create Memories.
        </h1>

        {/* Subhead */}
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
          The ultimate digital photobooth experience for your weddings, parties, and corporate events. Simple, fast, and instant sharing.
        </p>

        {/* CTA Button (Start) */}
        <div className="animate-in fade-in zoom-in duration-700 delay-200">
          <Link href="/camera">
            <button className="group relative px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] transition-all transform hover:scale-105 active:scale-95">
              <span className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="flex items-center gap-3">
                <CameraIcon />
                Start Photobooth
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </div>
            </button>
          </Link>
        </div>

      </main>

      {/* --- FEATURES GRID --- */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-20 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <FeatureCard 
            icon={<SparklesIcon />}
            title="Custom Frames"
            desc="Choose from a variety of beautiful, event-specific frames to make your photos unique."
            delay="delay-100"
          />
          <FeatureCard 
            icon={<CameraIcon />}
            title="Instant Capture"
            desc="High-quality photo capture with a countdown timer and live preview."
            delay="delay-200"
          />
          <FeatureCard 
            icon={<DownloadIcon />}
            title="Quick Download"
            desc="Get your photos instantly via QR code or direct download. No waiting."
            delay="delay-300"
          />

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="w-full py-6 text-center text-slate-600 text-sm border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} Photobooth App. Crafted for experiences.</p>
      </footer>
    </div>
  );
}

// Reusable Component untuk Card agar rapi
const FeatureCard = ({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: string }) => (
  <div className={`p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:bg-slate-800/50 transition-colors animate-in fade-in slide-in-from-bottom-10 duration-700 ${delay}`}>
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm">
      {desc}
    </p>
  </div>
);