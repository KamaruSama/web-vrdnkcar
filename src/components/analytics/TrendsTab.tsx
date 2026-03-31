import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/16/solid';
import { TimelineData } from './types';

interface TrendsTabProps {
  timelineData: TimelineData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 min-w-[160px]">
      <p className="text-xs font-semibold text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-baseline gap-1 mb-1">
          <span className={`text-xl font-black tabular-nums ${p.dataKey === 'avgScore' ? 'text-violet-600 dark:text-violet-400' : 'text-sky-600 dark:text-sky-400'}`}>
            {p.dataKey === 'avgScore' ? p.value.toFixed(2) : p.value}
          </span>
          <span className="text-xs text-slate-400">{p.dataKey === 'avgScore' ? '/5' : 'ครั้ง'}</span>
        </div>
      ))}
    </div>
  );
};

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : 0;

  if (Math.abs(diff) < 0.005) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
        <MinusIcon className="w-3 h-3" /> —
      </span>
    );
  }

  const isUp = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
      {isUp ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
      {isUp ? '+' : ''}{diff.toFixed(2)} ({pct.toFixed(1)}%)
    </span>
  );
}

export default function TrendsTab({ timelineData }: TrendsTabProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      {/* Area chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">แนวโน้มคะแนนตามช่วงเวลา</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">คะแนนเฉลี่ยและจำนวนการประเมินรายเดือน</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full bg-violet-500" />
            <span className="text-xs text-slate-500">คะแนนเฉลี่ย</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full bg-sky-400" />
            <span className="text-xs text-slate-500">จำนวนประเมิน</span>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
              <defs>
                <linearGradient id="areaScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F1F5F9" strokeWidth={1} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="score"
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 10, fill: '#CBD5E1' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 10, fill: '#CBD5E1' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                yAxisId="score"
                y={4.0}
                stroke="#10B981"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                opacity={0.4}
                label={{ value: 'เกณฑ์ดี', position: 'insideTopRight', fill: '#10B981', fontSize: 10, fontWeight: 600 }}
              />
              <Area
                yAxisId="score"
                type="monotone"
                dataKey="avgScore"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                fill="url(#areaScore)"
                dot={{ r: 4, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#7C3AED', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                yAxisId="count"
                type="monotone"
                dataKey="count"
                stroke="#38BDF8"
                strokeWidth={1.5}
                fill="url(#areaCount)"
                dot={{ r: 3, fill: '#38BDF8', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#0EA5E9', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly data table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">ข้อมูลรายเดือน</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-slate-100 dark:border-slate-700">
                {['เดือน/ปี', 'คะแนนเฉลี่ย', 'จำนวนประเมิน', 'การเปลี่ยนแปลง'].map((h, i) => (
                  <th key={h} className={`px-6 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody onMouseLeave={() => setHoveredRow(null)}>
              {timelineData.map((item, idx) => {
                const prev = idx > 0 ? timelineData[idx - 1].avgScore : item.avgScore;
                const dimmed = hoveredRow !== null && hoveredRow !== idx;
                return (
                  <tr
                    key={item.date}
                    className="group transition-colors"
                    style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s ease' }}
                    onMouseEnter={() => setHoveredRow(idx)}
                  >
                    <td className={`px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 ${idx < timelineData.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {item.date}
                    </td>
                    <td className={`px-6 py-3 text-center ${idx < timelineData.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-sm font-black tabular-nums ${
                        item.avgScore >= 4.0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' :
                        item.avgScore >= 3.0 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' :
                        'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {item.avgScore.toFixed(2)}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-center text-sm font-bold text-slate-600 dark:text-slate-300 tabular-nums ${idx < timelineData.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {item.count} <span className="text-xs font-medium text-slate-400">ครั้ง</span>
                    </td>
                    <td className={`px-6 py-3 text-center ${idx < timelineData.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {idx > 0 ? <ChangeIndicator current={item.avgScore} previous={prev} /> : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
