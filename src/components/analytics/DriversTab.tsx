import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, LabelList
} from 'recharts';
import { DriverPerformance } from './types';

interface DriversTabProps {
  filteredDriverPerformance: DriverPerformance[];
}

const EMERALD_SHADES = [
  '#059669', '#10B981', '#34D399', '#047857', '#0D9488',
  '#059669', '#10B981', '#34D399', '#047857', '#0D9488',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 min-w-[180px]">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{data.name}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{data.avgScore.toFixed(2)}</span>
        <span className="text-sm text-slate-400">/5</span>
      </div>
      <p className="text-xs text-slate-400 tabular-nums">{data.count} ครั้งที่ประเมิน</p>
    </div>
  );
};

export default function DriversTab({ filteredDriverPerformance }: DriversTabProps) {
  const sorted = [...filteredDriverPerformance].sort((a, b) => b.avgScore - a.avgScore);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const onBarEnter = useCallback((_: any, index: number) => setActiveBar(index), []);
  const onBarLeave = useCallback(() => setActiveBar(null), []);

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">คะแนนเฉลี่ยพนักงานขับรถ</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">เรียงจากคะแนนสูงสุด</p>
        </div>
        <div style={{ height: Math.max(280, sorted.length * 42) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }} barCategoryGap="28%" onMouseLeave={onBarLeave}>
              <defs>
                {sorted.map((_, i) => (
                  <linearGradient key={i} id={`drvbar-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={EMERALD_SHADES[i % EMERALD_SHADES.length]} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={EMERALD_SHADES[i % EMERALD_SHADES.length]} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid horizontal={false} stroke="#F1F5F9" strokeWidth={1} />
              <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ECFDF5', radius: 4 }} />
              <ReferenceLine x={4.0} stroke="#10B981" strokeDasharray="5 4" strokeWidth={1.5} opacity={0.5} label={{ value: '4.0', position: 'top', fill: '#10B981', fontSize: 10, fontWeight: 600 }} />
              <Bar dataKey="avgScore" radius={[0, 6, 6, 0]} maxBarSize={28} onMouseEnter={onBarEnter} onMouseLeave={onBarLeave}>
                {sorted.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`url(#drvbar-${i})`}
                    opacity={activeBar === null ? 1 : activeBar === i ? 1 : 0.25}
                    style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                  />
                ))}
                <LabelList dataKey="avgScore" position="right" formatter={(v: number) => v.toFixed(2)} style={{ fontSize: 11, fontWeight: 700, fill: '#059669' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">รายละเอียดพนักงานขับรถ</h2>
        </div>
        <div onMouseLeave={() => setHoveredRow(null)}>
          {sorted.map((driver, index) => {
            const pct = (driver.avgScore / 5) * 100;
            const isLast = index === sorted.length - 1;
            const dimmed = hoveredRow !== null && hoveredRow !== index;
            return (
              <div
                key={driver.name}
                className={`flex items-center gap-4 px-6 py-3 transition-colors ${!isLast ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}
                style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s ease' }}
                onMouseEnter={() => setHoveredRow(index)}
              >
                <span className="text-xs font-bold text-slate-400 w-5 text-right tabular-nums flex-shrink-0">{index + 1}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 min-w-0 truncate">{driver.name}</span>
                <span className="text-xs text-slate-400 tabular-nums flex-shrink-0 w-16 text-right">{driver.count} ครั้ง</span>
                <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0 hidden sm:block">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: EMERALD_SHADES[index % EMERALD_SHADES.length] }}
                  />
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums w-12 text-right flex-shrink-0">{driver.avgScore.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
