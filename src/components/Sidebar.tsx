import React, { useState } from 'react';
import { BarChart3, ClipboardList, FileText, Home, Leaf, Plus, ShieldCheck } from 'lucide-react';
import { LeafCluster } from './Characters';

interface SidebarProps {
  onNewAudit: () => void;
  onOpenCatalog: () => void;
}

type NavId = 'home' | 'new' | 'scenarios' | 'ledger' | 'analytics';

export const Sidebar: React.FC<SidebarProps> = ({ onNewAudit, onOpenCatalog }) => {
  const [active, setActive] = useState<NavId>('home');

  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const go = (id: NavId, section?: string) => {
    setActive(id);
    if (section) scrollTo(section);
  };

  const startNewAudit = () => {
    setActive('new');
    onNewAudit();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-r border-white/5 bg-[#071120]/95 px-4 py-6 lg:flex">
      <div className="mb-9 flex items-center gap-3 px-1">
        <div className="brand-mark">
          <Leaf className="h-6 w-6 -rotate-12 text-[#0d2a19]" />
        </div>
        <div>
          <div className="text-[17px] font-extrabold leading-[1.05] tracking-tight text-white">
            GreenLedger
            <br />
            Auditor
          </div>
          <div className="mt-1 text-[10px] font-medium tracking-wide text-slate-400">
            Zero-Trust ERP Gate
          </div>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="space-y-1.5">
        <button type="button" className={`nav-link focus-ring ${active === 'home' ? 'nav-link-active' : ''}`} onClick={() => go('home')}>
          <Home className="h-4 w-4" />
          Home
        </button>
        <button type="button" className={`nav-link focus-ring ${active === 'new' ? 'nav-link-active' : ''}`} onClick={startNewAudit}>
          <Plus className="h-4 w-4" />
          New Audit
        </button>
        <button type="button" className={`nav-link focus-ring ${active === 'scenarios' ? 'nav-link-active' : ''}`} onClick={() => go('scenarios', 'scenarios')}>
          <FileText className="h-4 w-4" />
          Scenarios
        </button>
        <button type="button" className={`nav-link focus-ring ${active === 'ledger' ? 'nav-link-active' : ''}`} onClick={() => go('ledger', 'audit-ledger')}>
          <ClipboardList className="h-4 w-4" />
          Audit Log
        </button>
        <button type="button" className={`nav-link focus-ring ${active === 'analytics' ? 'nav-link-active' : ''}`} onClick={() => go('analytics', 'audit-verdict')}>
          <BarChart3 className="h-4 w-4" />
          Analytics
        </button>
      </nav>

      <button
        type="button"
        onClick={onOpenCatalog}
        className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-slate-300 transition-colors hover:border-primary/40 hover:text-white focus-ring"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Benchmark catalog
      </button>

      <div className="relative mt-auto overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#16253e] to-[#0a1424] p-4 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.9)]">
        <LeafCluster className="character pointer-events-none absolute -bottom-3 -right-5 h-28 w-28 opacity-95" />
        <div className="relative z-10 max-w-[130px]">
          <p className="text-[17px] font-extrabold leading-tight text-white">
            Trust Nothing.
            <br />
            Verify Everything.
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            Every supplier claim is checked before it reaches the decision layer.
          </p>
          <button
            type="button"
            onClick={startNewAudit}
            aria-label="Start a new audit"
            className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-slate-950 transition-transform hover:scale-105 focus-ring"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
