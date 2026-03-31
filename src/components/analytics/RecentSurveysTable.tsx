import React from 'react';
import { SurveyData } from './types';
import { formatDate } from './utils';

interface RecentSurveysTableProps {
  surveys: SurveyData[];
}

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  const color =
    score >= 4.5 ? { stroke: '#10B981', text: 'text-emerald-600 dark:text-emerald-400', track: '#D1FAE5' } :
    score >= 4.0 ? { stroke: '#3B82F6', text: 'text-blue-600 dark:text-blue-400', track: '#DBEAFE' } :
    score >= 3.5 ? { stroke: '#F59E0B', text: 'text-amber-600 dark:text-amber-400', track: '#FEF3C7' } :
    { stroke: '#EF4444', text: 'text-red-600 dark:text-red-400', track: '#FEE2E2' };

  return (
    <div className="relative inline-flex items-center justify-center w-11 h-11">
      <svg width="44" height="44" className="absolute -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke={color.track} strokeWidth="3" className="dark:opacity-30" />
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke={color.stroke} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`text-[11px] font-black tabular-nums ${color.text}`}>{score.toFixed(1)}</span>
    </div>
  );
}

export default function RecentSurveysTable({ surveys }: RecentSurveysTableProps) {
  const recent = surveys.slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="px-6 py-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">การประเมินล่าสุด</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">5 รายการล่าสุด</p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-slate-100 dark:border-slate-700">
              {['วันที่', 'ใบขอ', 'ผู้ประเมิน', 'พนักงานขับรถ', 'คะแนน'].map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest ${i === 4 ? 'text-center' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((survey, idx) => {
              const avg = (
                survey.drivingRules + survey.appropriateSpeed + survey.politeDriving +
                survey.servicePoliteness + survey.missionUnderstanding + survey.punctuality +
                survey.travelPlanning + survey.carSelection + survey.carReadiness +
                survey.carCleanliness
              ) / 10;

              return (
                <tr
                  key={survey.id}
                  className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className={`px-6 py-3 ${idx < recent.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{formatDate(survey.createdAt)}</span>
                  </td>
                  <td className={`px-6 py-3 ${idx < recent.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                    <span className="text-xs font-bold font-mono text-violet-600 dark:text-violet-400 tabular-nums">#{survey.bookingNumber}</span>
                  </td>
                  <td className={`px-6 py-3 ${idx < recent.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px] inline-block">{survey.requesterName}</span>
                  </td>
                  <td className={`px-6 py-3 ${idx < recent.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px] inline-block">{survey.driverName}</span>
                  </td>
                  <td className={`px-6 py-3 text-center ${idx < recent.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                    <ScoreRing score={avg} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden px-4 pb-4 space-y-2">
        {recent.map((survey) => {
          const avg = (
            survey.drivingRules + survey.appropriateSpeed + survey.politeDriving +
            survey.servicePoliteness + survey.missionUnderstanding + survey.punctuality +
            survey.travelPlanning + survey.carSelection + survey.carReadiness +
            survey.carCleanliness
          ) / 10;

          return (
            <div key={survey.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <ScoreRing score={avg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{survey.driverName}</span>
                  <span className="text-[10px] font-bold font-mono text-violet-600 dark:text-violet-400 tabular-nums flex-shrink-0">#{survey.bookingNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate">{survey.requesterName}</span>
                  <span className="tabular-nums flex-shrink-0">{formatDate(survey.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
