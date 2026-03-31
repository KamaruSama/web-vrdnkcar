import React, { useState } from 'react';
import { TopRequesterData } from './types';

interface TopRequestersProps {
  data: TopRequesterData[];
  timePeriod: string;
  onPeriodChange: (period: string) => void;
}

const PERIODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'week', label: '7 วัน' },
  { key: 'month', label: '30 วัน' },
  { key: 'quarter', label: '90 วัน' },
];

const RANK_STYLES: Record<number, { bg: string; bar: string; badge: string; ring: string }> = {
  0: {
    bg: 'bg-violet-50 dark:bg-violet-900/15',
    bar: 'bg-violet-500',
    badge: 'bg-violet-600 text-white',
    ring: 'ring-violet-200 dark:ring-violet-800/40',
  },
  1: {
    bg: 'bg-violet-50/60 dark:bg-violet-900/10',
    bar: 'bg-violet-400',
    badge: 'bg-violet-500 text-white',
    ring: 'ring-violet-200/60 dark:ring-violet-800/30',
  },
  2: {
    bg: 'bg-violet-50/30 dark:bg-violet-900/5',
    bar: 'bg-violet-300',
    badge: 'bg-violet-400 text-white',
    ring: 'ring-violet-100 dark:ring-violet-800/20',
  },
};

const DEFAULT_STYLE = {
  bg: '',
  bar: 'bg-slate-300 dark:bg-slate-600',
  badge: 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
  ring: '',
};

export default function TopRequesters({ data, timePeriod, onPeriodChange }: TopRequestersProps) {
  const maxCount = data[0]?.count || 1;
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">ผู้ขอใช้รถมากที่สุด</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Top 10 ผู้ขอใช้รถ</p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onPeriodChange(key)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 ${
                timePeriod === key
                  ? 'bg-white dark:bg-slate-600 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-400">ไม่มีข้อมูลในช่วงเวลานี้</p>
        </div>
      ) : (
        <div className="space-y-1.5" onMouseLeave={() => setHovered(null)}>
          {data.map((item, index) => {
            const barPct = Math.round((item.count / maxCount) * 100);
            const style = RANK_STYLES[index] || DEFAULT_STYLE;
            const isTop3 = index < 3;
            const dimmed = hovered !== null && hovered !== index;

            return (
              <div
                key={item.name}
                className={`relative rounded-xl overflow-hidden transition-all duration-200 ${isTop3 ? `${style.bg} ring-1 ${style.ring}` : ''}`}
                style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s ease, transform 0.2s ease' }}
                onMouseEnter={() => setHovered(index)}
              >
                {/* background bar fill */}
                <div
                  className={`absolute inset-y-0 left-0 ${style.bar} opacity-[0.12] transition-all duration-700`}
                  style={{ width: `${barPct}%` }}
                />

                <div className="relative flex items-center gap-3.5 px-4 py-3">
                  {/* rank badge */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${style.badge}`}>
                    {index + 1}
                  </div>

                  {/* name */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${isTop3 ? 'font-bold text-slate-800 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                      {item.name}
                    </span>
                  </div>

                  {/* count + percentage */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={`tabular-nums ${isTop3 ? 'text-lg font-black text-slate-800 dark:text-white' : 'text-sm font-bold text-slate-600 dark:text-slate-300'}`}>
                      {item.count}
                      <span className="text-[10px] font-semibold text-slate-400 ml-0.5">ครั้ง</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 tabular-nums w-10 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
