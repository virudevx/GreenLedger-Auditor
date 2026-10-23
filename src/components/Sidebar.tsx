import React from 'react';
import { BarChart3, ClipboardList, FileText, Home, Leaf, Plus, ShieldCheck } from 'lucide-react';

interface SidebarProps { onNewAudit: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ onNewAudit }) => (
  <aside className="hidden lg:flex w-[218px] shrink-0 min-h-screen flex-col border-r border-white/10 bg-[#07111f]/95 px-4 py-6">
    <div className="flex items-center gap-3 px-2 mb-10">
      <div className="brand-mark"><Leaf className="w-6 h-6 text-[#8dff90] -rotate-12" /></div>
      <div>
        <div className="text-[17px] leading-[1.05] font-extrabold text-white tracking-tight">GreenLedger<br />Auditor</div>
        <div className="text-[10px] text-slate-400 mt-1">Zero-Trust ERP Gate</div>
      </div>
    </div>
    <nav aria-label="Primary navigation" className="space-y-2">
      <button type="button" className="sidebar-link sidebar-link-active" onClick={onNewAudit}><Home className="w-4 h-4" /> Home</button>
      <button type="button" className="sidebar-link" onClick={onNewAudit}><Plus className="w-4 h-4" /> New Audit</button>
      <a className="sidebar-link" href="#scenarios"><FileText className="w-4 h-4" /> Scenarios</a>
      <a className="sidebar-link" href="#audit-ledger"><ClipboardList className="w-4 h-4" /> Audit Log</a>
      <a className="sidebar-link" href="#audit-verdict"><BarChart3 className="w-4 h-4" /> Analytics</a>
    </nav>
    <div className="mt-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#16253e] to-[#0b1525] p-4 shadow-xl">
      <ShieldCheck className="w-7 h-7 text-[#8dff90] mb-3" />
      <p className="text-[18px] leading-tight font-bold text-white">Trust Nothing.<br />Verify Everything.</p>
      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Every supplier claim is checked before it reaches the decision layer.</p>
    </div>
  </aside>
);
