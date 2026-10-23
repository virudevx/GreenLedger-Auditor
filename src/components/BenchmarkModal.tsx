import React, { useEffect, useRef } from 'react';
import { BookOpen, CheckCircle2, Info, X } from 'lucide-react';
import { BENCHMARK_CATALOG, BENCHMARK_DATASET_VERSION } from '../constants/benchmarks';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="benchmark-modal-title"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-dark p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-dim text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="benchmark-modal-title" className="text-base font-extrabold tracking-tight text-white">
                Trusted reference benchmark catalog
              </h2>
              <p className="font-mono text-[10px] text-text-secondary">
                Version <span className="text-primary-light">{BENCHMARK_DATASET_VERSION}</span> · {BENCHMARK_CATALOG.length} procurement baselines
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close benchmark catalog"
            onClick={onClose}
            className="rounded-xl p-1.5 text-text-muted transition-colors hover:bg-surface-light hover:text-text-primary focus-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning-dim p-3 text-[10.5px] leading-relaxed text-warning/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              These figures are deterministic demonstration baselines, not independently certified market data. Five
              categories are modelled on public emission-factor sources; three are illustrative. The decision engine
              uses them consistently so results are reproducible.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {BENCHMARK_CATALOG.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface-dark/90 p-3.5 transition-colors hover:border-primary/40"
              >
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-border bg-surface-light px-2 py-0.5 font-mono text-[9px] text-text-muted">
                      {item.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${
                        item.isVerified
                          ? 'border-primary/30 bg-primary-dim text-primary-light'
                          : 'border-border bg-surface-light text-text-muted'
                      }`}
                    >
                      {item.isVerified && <CheckCircle2 className="h-2.5 w-2.5" />}
                      {item.isVerified ? 'VERIFIED' : 'ILLUSTRATIVE'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold leading-tight text-text-primary">{item.name}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">{item.description}</p>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5 font-mono text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Index price</span>
                    <span className="font-semibold text-text-primary">
                      ${item.benchmarkPrice.toFixed(2)} / {item.benchmarkUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Carbon factor</span>
                    <span className="font-semibold text-primary-light">
                      {item.carbonFactor} {item.carbonFactorUnit}
                    </span>
                  </div>
                  <p className="truncate pt-1 text-[9px] text-text-muted" title={item.dataSource}>
                    Source: {item.dataSource}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-surface-dark p-3 sm:p-4">
          <span className="font-mono text-[10px] text-text-muted">Deterministic trusted-memory registry</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface-light px-4 py-1.5 text-[11px] font-semibold text-text-primary transition-colors hover:bg-surface focus-ring"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
