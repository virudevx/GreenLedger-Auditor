import React from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Leaf, TrendingUp } from 'lucide-react';
import { VerifiedLineItem } from '../types/audit';

interface VarianceChartProps {
  lineItems: VerifiedLineItem[];
}

const tooltipStyle = {
  backgroundColor: '#0D1728',
  borderColor: '#1C2A42',
  borderRadius: '12px',
  fontSize: '10px',
  color: '#F4F7F5',
};

export const VarianceChart: React.FC<VarianceChartProps> = ({ lineItems }) => {
  if (!lineItems || lineItems.length === 0) return null;

  const priceData = lineItems
    .filter((item) => item.benchmarkUnitPrice !== null)
    .map((item) => ({
      name: item.description.length > 16 ? `${item.description.slice(0, 16)}…` : item.description,
      billed: item.billedUnitPrice,
      benchmark: item.benchmarkUnitPrice,
      variance: item.priceVariancePercent ?? 0,
    }));

  const carbonData = lineItems
    .filter((item) => item.benchmarkCarbonFactor !== null)
    .map((item) => {
      const claimedIntensity =
        item.claimedCarbonKg !== null && item.quantity > 0 ? item.claimedCarbonKg / item.quantity : 0;
      return {
        name: item.description.length > 16 ? `${item.description.slice(0, 16)}…` : item.description,
        claimed: claimedIntensity,
        benchmark: item.benchmarkCarbonFactor,
        mismatchRatio: item.carbonMismatchRatio,
      };
    });

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-border bg-surface-dark p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-primary">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Price variance
          </span>
          <span className="font-mono text-[9px] text-text-muted">ERP index</span>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priceData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#71839D', fontSize: 8 }} interval={0} />
              <YAxis tick={{ fill: '#71839D', fontSize: 8 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#F4F7F5', fontWeight: 600 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="benchmark" fill="#33445E" name="Benchmark" radius={[4, 4, 0, 0]} />
              <Bar dataKey="billed" name="Billed" radius={[4, 4, 0, 0]}>
                {priceData.map((entry, index) => (
                  <Cell key={`price-${index}`} fill={entry.variance > 10 ? '#FF6B8A' : entry.variance > 0 ? '#FFD166' : '#B9FF9D'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-1.5 font-mono text-[8.5px] text-text-muted">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#33445E]" /> Benchmark</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Compliant</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-danger" /> &gt;10%</span>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-border bg-surface-dark p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-primary">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            Carbon intensity
          </span>
          <span className="font-mono text-[9px] text-text-muted">kg CO₂e / unit</span>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={carbonData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#71839D', fontSize: 8 }} interval={0} />
              <YAxis tick={{ fill: '#71839D', fontSize: 8 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#F4F7F5', fontWeight: 600 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="benchmark" fill="#7CF07A" name="Verified factor" radius={[4, 4, 0, 0]} />
              <Bar dataKey="claimed" name="Claimed intensity" radius={[4, 4, 0, 0]}>
                {carbonData.map((entry, index) => (
                  <Cell key={`carbon-${index}`} fill={entry.mismatchRatio && entry.mismatchRatio >= 2 ? '#FFD166' : '#F79BC3'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-1.5 font-mono text-[8.5px] text-text-muted">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#7CF07A]" /> Verified factor</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blush-deep" /> Claimed</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Mismatch</span>
        </div>
      </div>
    </div>
  );
};
