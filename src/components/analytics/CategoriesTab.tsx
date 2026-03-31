import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, LabelList, PieChart, Pie, Label, Sector
} from 'recharts';
import { AverageScores } from './types';

interface CategoriesTabProps {
  averageScores: AverageScores[];
}

const CATEGORY_COLORS = [
  '#7C3AED', '#8B5CF6', '#6D28D9', '#9333EA', '#7E22CE',
  '#A855F7', '#6366F1', '#818CF8', '#4F46E5', '#C084FC',
];

const CustomBarTooltip = ({ active, payload }: any) => {
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
    </div>
  );
};

function CenterLabel({ viewBox, value }: any) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" className="fill-slate-800 dark:fill-white" fontSize={28} fontWeight={900}>
        {value}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="central" className="fill-slate-400" fontSize={11} fontWeight={500}>
        เฉลี่ยรวม
      </text>
    </g>
  );
}

export default function CategoriesTab({ averageScores }: CategoriesTabProps) {
  const sorted = [...averageScores].sort((a, b) => b.score - a.score);
  const overallAvg = averageScores.length > 0
    ? (averageScores.reduce((s, a) => s + a.score, 0) / averageScores.length).toFixed(2)
    : '0';
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const onPieEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(null), []);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const onBarEnter = useCallback((_: any, index: number) => setActiveBar(index), []);
  const onBarLeave = useCallback(() => setActiveBar(null), []);

  return (
    <div className="space-y-6">
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horizontal Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">คะแนนทุกหัวข้อ</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">เรียงจากคะแนนสูงสุด</p>
          </div>
          <div style={{ height: Math.max(280, sorted.length * 42) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }} barCategoryGap="28%" onMouseLeave={onBarLeave}>
                <defs>
                  {sorted.map((_, i) => (
                    <linearGradient key={i} id={`catbar-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid horizontal={false} stroke="#F1F5F9" strokeWidth={1} />
                <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="fullName" width={130} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#F5F3FF', radius: 4 }} />
                <ReferenceLine x={4.0} stroke="#10B981" strokeDasharray="5 4" strokeWidth={1.5} opacity={0.5} label={{ value: '4.0', position: 'top', fill: '#10B981', fontSize: 10, fontWeight: 600 }} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={28} onMouseEnter={onBarEnter} onMouseLeave={onBarLeave}>
                  {sorted.map((_, i) => (
                    <Cell
                      key={i}
                      fill={`url(#catbar-${i})`}
                      opacity={activeBar === null ? 1 : activeBar === i ? 1 : 0.25}
                      style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                    />
                  ))}
                  <LabelList dataKey="score" position="right" formatter={(v: number) => v.toFixed(2)} style={{ fontSize: 11, fontWeight: 700, fill: '#7C3AED' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">สัดส่วนคะแนนแต่ละหัวข้อ</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">การกระจายของคะแนนเฉลี่ย</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={averageScores}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={activeIndex !== null ? 85 : 85}
                  paddingAngle={3}
                  dataKey="score"
                  nameKey="fullName"
                  strokeWidth={0}
                  cornerRadius={4}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {averageScores.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                      opacity={activeIndex === null ? 1 : activeIndex === i ? 1 : 0.3}
                      style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                    />
                  ))}
                  <Label content={<CenterLabel value={overallAvg} />} position="center" />
                </Pie>
                <Tooltip content={<CustomBarTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
            {averageScores.map((item, i) => (
              <div
                key={item.category}
                className="flex items-center gap-2 min-w-0 cursor-pointer rounded-md px-1 py-0.5 transition-opacity duration-200"
                style={{ opacity: activeIndex === null ? 1 : activeIndex === i ? 1 : 0.35 }}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">{item.fullName}</span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums flex-shrink-0">{item.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">รายละเอียดทุกหัวข้อ</h2>
        </div>
        <div onMouseLeave={() => setHoveredRow(null)}>
          {sorted.map((item, index) => {
            const pct = (item.score / 5) * 100;
            const isLast = index === sorted.length - 1;
            const dimmed = hoveredRow !== null && hoveredRow !== index;
            return (
              <div
                key={item.category}
                className={`flex items-center gap-4 px-6 py-3 transition-colors ${!isLast ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}
                style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s ease' }}
                onMouseEnter={() => setHoveredRow(index)}
              >
                <span className="text-xs font-bold text-slate-400 w-5 text-right tabular-nums flex-shrink-0">{index + 1}</span>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 min-w-0 truncate">{item.fullName}</span>
                <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0 hidden sm:block">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                  />
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums w-12 text-right flex-shrink-0">{item.score.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
