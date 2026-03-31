import React from 'react';
import { ChartBarIcon, StarIcon, RocketLaunchIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface KpiCardsProps {
  surveysLength: number;
  overallAverage: string;
  maxScore: { score: number; name: string };
  minScore: { score: number; name: string };
  selectedPeriod: string;
}

export default function KpiCards({
  surveysLength,
  overallAverage,
  maxScore,
  minScore,
  selectedPeriod
}: KpiCardsProps) {
  const periodLabel = selectedPeriod === 'week' ? '7 วัน' : selectedPeriod === 'month' ? '30 วัน' : selectedPeriod === 'quarter' ? '90 วัน' : 'ทั้งหมด';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 overflow-hidden shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-violet-200 text-xs font-bold uppercase tracking-widest">ประเมินทั้งหมด</span>
            <ChartBarIcon className="h-4 w-4 text-violet-300" />
          </div>
          <div className="text-4xl font-black text-white leading-none mb-1">{surveysLength}</div>
          <div className="text-violet-200 text-xs font-medium mt-2">{periodLabel}</div>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 overflow-hidden shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-emerald-100 text-xs font-bold uppercase tracking-widest">คะแนนเฉลี่ย</span>
            <StarIcon className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-black text-white leading-none">{overallAverage}</span>
            <span className="text-emerald-200 text-sm font-semibold">/5</span>
          </div>
          <div className="text-emerald-200 text-xs font-medium mt-2">{periodLabel}</div>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-5 overflow-hidden shadow-lg shadow-sky-200 dark:shadow-sky-900/30">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sky-100 text-xs font-bold uppercase tracking-widest">สูงสุด</span>
            <RocketLaunchIcon className="h-4 w-4 text-sky-200" />
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-black text-white leading-none">{maxScore.score.toFixed(1)}</span>
            <span className="text-sky-200 text-sm font-semibold">/5</span>
          </div>
          <div className="text-sky-100 text-xs font-medium mt-2 truncate" title={maxScore.name}>{maxScore.name}</div>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 overflow-hidden shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-100 text-xs font-bold uppercase tracking-widest">ต่ำสุด</span>
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-200" />
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-black text-white leading-none">{minScore.score.toFixed(1)}</span>
            <span className="text-amber-200 text-sm font-semibold">/5</span>
          </div>
          <div className="text-amber-100 text-xs font-medium mt-2 truncate" title={minScore.name}>{minScore.name}</div>
        </div>
      </div>

    </div>
  );
}
