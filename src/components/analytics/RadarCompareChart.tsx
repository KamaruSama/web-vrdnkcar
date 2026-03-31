import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer, Dot
} from 'recharts';
import { AverageScores } from './types';

interface RadarCompareChartProps {
  data: AverageScores[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  const name = payload[0].payload?.fullName;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{name}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-violet-600 dark:text-violet-400 tabular-nums">{val.toFixed(2)}</span>
        <span className="text-xs text-slate-400">/5</span>
      </div>
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#7C3AED"
      stroke="white"
      strokeWidth={2}
    />
  );
};

export default function RadarCompareChart({ data }: RadarCompareChartProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">เปรียบเทียบคะแนนแต่ละด้าน</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">การกระจายตัวของคะแนนในทุกหมวดหมู่</p>
      </div>

      <div className="h-80 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <defs>
              <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.08} />
              </radialGradient>
            </defs>
            <PolarGrid
              gridType="polygon"
              stroke="#E2E8F0"
              strokeWidth={1}
              strokeDasharray="0"
            />
            <PolarAngleAxis
              dataKey="fullName"
              tick={{ fontSize: 10.5, fill: '#94A3B8', fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fontSize: 9, fill: '#CBD5E1' }}
              axisLine={false}
              tickCount={6}
            />
            <Radar
              name="คะแนนเฉลี่ย"
              dataKey="score"
              stroke="#7C3AED"
              fill="url(#radarFill)"
              fillOpacity={1}
              strokeWidth={2}
              dot={<CustomDot />}
              isAnimationActive={true}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <div className="w-3 h-3 rounded-full bg-violet-600 opacity-80" />
        <span className="text-xs text-slate-400 font-medium">คะแนนเฉลี่ยแต่ละด้าน</span>
      </div>
    </div>
  );
}
