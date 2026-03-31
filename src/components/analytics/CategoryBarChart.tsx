import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, LabelList
} from 'recharts';
import { AverageScores } from './types';

interface CategoryBarChartProps {
  data: AverageScores[];
}

const BAR_COLORS = [
  '#7C3AED', '#8B5CF6', '#6D28D9', '#9333EA', '#7E22CE',
  '#A855F7', '#7C3AED', '#6D28D9', '#9333EA', '#7E22CE',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  const name = payload[0].payload?.fullName;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 min-w-[160px]">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{name}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-violet-600 dark:text-violet-400 tabular-nums">{val.toFixed(2)}</span>
        <span className="text-sm text-slate-400">/5</span>
      </div>
      <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(val / 5) * 100}%` }} />
      </div>
    </div>
  );
};

export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  const sortedData = [...data].sort((a, b) => b.score - a.score);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleMouseEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
  const handleMouseLeave = useCallback(() => setActiveIndex(null), []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">คะแนนแยกตามหัวข้อ</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ค่าเฉลี่ยของแต่ละหมวดหมู่ประเมิน</p>
      </div>

      <div style={{ height: Math.max(280, sortedData.length * 42) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
            barCategoryGap="28%"
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {sortedData.map((_, i) => (
                <linearGradient key={i} id={`hbar-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid horizontal={false} stroke="#F1F5F9" strokeWidth={1} />
            <XAxis
              type="number"
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 10, fill: '#CBD5E1' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="fullName"
              width={130}
              tick={{ fontSize: 11.5, fill: '#64748B', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F3FF', radius: 4 }} />
            <ReferenceLine
              x={4.0}
              stroke="#10B981"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              opacity={0.5}
              label={{ value: 'เกณฑ์ดี', position: 'top', fill: '#10B981', fontSize: 10, fontWeight: 600 }}
            />
            <Bar
              dataKey="score"
              radius={[0, 6, 6, 0]}
              maxBarSize={28}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {sortedData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#hbar-${index})`}
                  opacity={activeIndex === null ? 1 : activeIndex === index ? 1 : 0.25}
                  style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                />
              ))}
              <LabelList
                dataKey="score"
                position="right"
                formatter={(v: number) => v.toFixed(2)}
                style={{ fontSize: 11, fontWeight: 700, fill: '#7C3AED' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
