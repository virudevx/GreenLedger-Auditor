import React from 'react';
import { VerifiedLineItem } from '../types/audit';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TrendingUp, Leaf } from 'lucide-react';

interface VarianceChartProps {
  lineItems: VerifiedLineItem[];
}

export const VarianceChart: React.FC<VarianceChartProps> = ({ lineItems }) => {
  if (!lineItems || lineItems.length === 0) return null;

  // Format data for price comparison
  const priceData = lineItems
    .filter(item => item.benchmarkUnitPrice !== null)
    .map(item => ({
      name: item.description.length > 18 ? item.description.slice(0, 18) + '...' : item.description,
      fullName: item.description,
      billed: item.billedUnitPrice,
      benchmark: item.benchmarkUnitPrice,
      variance: item.priceVariancePercent ?? 0,
    }));

  // Format data for carbon comparison
  const carbonData = lineItems
    .filter(item => item.benchmarkCarbonFactor !== null)
    .map(item => {
      const claimedIntensity = item.claimedCarbonKg !== null && item.quantity > 0 
        ? item.claimedCarbonKg / item.quantity 
        : 0;
      return {
        name: item.description.length > 18 ? item.description.slice(0, 18) + '...' : item.description,
        fullName: item.description,
        claimed: claimedIntensity,
        benchmark: item.benchmarkCarbonFactor,
        mismatchRatio: item.carbonMismatchRatio,
        unit: item.unit
      };
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* Price Comparison Card */}
      <div className="p-3.5 rounded-xl bg-surface-dark border border-border flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Unit Price Variance vs. Benchmark ($/unit)</span>
          </div>
          <span className="text-[10px] font-mono text-text-muted">ERP Index</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priceData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#F9FAFB', fontWeight: 600 }}
              />
              <Bar dataKey="benchmark" fill="#374151" name="Benchmark Price ($)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="billed" name="Billed Price ($)" radius={[4, 4, 0, 0]}>
                {priceData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.variance > 10 ? '#EF4444' : entry.variance > 0 ? '#F59E0B' : '#10B981'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-2 border-t border-border/50">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-600 inline-block"></span> Benchmark
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Compliant
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger inline-block"></span> &gt;10% Markup
          </span>
        </div>
      </div>

      {/* Carbon Scope 3 Intensity Card */}
      <div className="p-3.5 rounded-xl bg-surface-dark border border-border flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <span>Carbon Intensity Comparison (kg CO₂e/unit)</span>
          </div>
          <span className="text-[10px] font-mono text-text-muted">DEFRA / GLEC</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={carbonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#F9FAFB', fontWeight: 600 }}
              />
              <Bar dataKey="benchmark" fill="#10B981" name="Benchmark Factor (True Ref)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="claimed" name="Claimed Supplier Intensity" radius={[4, 4, 0, 0]}>
                {carbonData.map((entry, index) => (
                  <Cell 
                    key={`c-cell-${index}`} 
                    fill={entry.mismatchRatio && entry.mismatchRatio >= 2.0 ? '#F59E0B' : '#059669'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-2 border-t border-border/50">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Verified Ref Factor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Greenwashing Claim
          </span>
        </div>
      </div>

    </div>
  );
};
