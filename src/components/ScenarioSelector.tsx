import React from 'react';
import { ArrowRight, AlertTriangle, BookOpen, CheckCircle2, FileCheck2, ShieldX, Sparkles } from 'lucide-react';
import { DEMO_SCENARIOS, DemoScenario } from '../constants/scenarios';
import { ScenarioLastRun } from '../types/audit';
import { BlushOcto, LeafCluster, LilacOcto } from './Characters';

interface ScenarioSelectorProps {
  selectedScenarioId: string;
  onSelectScenario: (scenario: DemoScenario) => void;
  isRunning: boolean;
  lastRuns: Record<string, ScenarioLastRun>;
  onOpenCatalog: () => void;
}

const formatVerdict = (verdict: string) => verdict.replace(/_/g, ' ');

const formatVariance = (value: number | null) => {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const formatCarbon = (value: number | null) => {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString()} kg`;
};

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  selectedScenarioId,
  onSelectScenario,
  isRunning,
  lastRuns,
  onOpenCatalog,
}) => {
  return (
    <section aria-labelledby="scenario-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="scenario-title" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            <Sparkles className="h-4 w-4 text-primary" />
            Choose a demo scenario
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Load a sample invoice to see GreenLedger in action — it audits automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCatalog}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-white focus-ring"
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          Benchmark catalog
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {DEMO_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenarioId === scenario.id;
          const lastRun = lastRuns[scenario.id];
          const isBusy = isRunning && isSelected;

          const surface =
            scenario.id === 'clean'
              ? 'pastel-mint'
              : scenario.id === 'anomaly'
                ? 'pastel-lilac'
                : 'pastel-blush';

          const Icon =
            scenario.id === 'clean' ? FileCheck2 : scenario.id === 'anomaly' ? AlertTriangle : ShieldX;

          const Character =
            scenario.id === 'clean' ? LeafCluster : scenario.id === 'anomaly' ? LilacOcto : BlushOcto;

          const BulletIcon =
            scenario.id === 'clean' ? CheckCircle2 : scenario.id === 'anomaly' ? AlertTriangle : ShieldX;

          return (
            <button
              key={scenario.id}
              type="button"
              disabled={isRunning}
              aria-pressed={isSelected}
              aria-label={`${scenario.title}, expected verdict ${formatVerdict(scenario.expectedVerdict)}`}
              onClick={() => onSelectScenario(scenario)}
              className={`relative min-h-[196px] overflow-hidden rounded-card border p-4 text-left shadow-card transition-all duration-200 focus-ring ${surface} ${
                isSelected ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-background' : 'hover:-translate-y-0.5 hover:shadow-glow'
              } ${isRunning ? 'cursor-wait' : ''}`}
            >
              <div className="relative z-10 pr-16">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/55 px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em] text-slate-700">
                    {scenario.number}
                  </span>
                  <span className="rounded-full bg-slate-950/10 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-slate-700">
                    {scenario.badge}
                  </span>
                </div>

                <div className="mt-2 flex items-start gap-2">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/60">
                    <Icon className="h-4 w-4 text-slate-800" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-extrabold leading-tight text-slate-950">
                      {scenario.vendorName}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-700">
                      {scenario.title}
                    </p>
                  </div>
                </div>

                <ul className="mt-3 space-y-1">
                  {scenario.keyHighlights.slice(0, 3).map((highlight) => (
                    <li key={highlight} className="flex items-start gap-1.5 text-[10.5px] font-medium leading-snug text-slate-800">
                      <BulletIcon className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Character className="character pointer-events-none absolute -bottom-5 -right-3 h-32 w-32 opacity-95" />

              <div className="relative z-10 mt-3 flex items-center justify-between gap-2 border-t border-slate-950/10 pt-2">
                <span className="truncate font-mono text-[9.5px] font-semibold text-slate-700">
                  {isBusy
                    ? 'Auditing…'
                    : lastRun
                      ? `Last: ${formatVerdict(lastRun.verdict)} · ${formatVariance(lastRun.variance)} · ${formatCarbon(lastRun.carbon)}`
                      : `Expected: ${formatVerdict(scenario.expectedVerdict)}`}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
