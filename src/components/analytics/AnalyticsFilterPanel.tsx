import React from 'react';
import Button from '@/components/ui/Button';
import { UserIcon, CalendarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { DriverPerformance } from './types';
import { truncateText } from './utils';
import ImageSelect from '@/components/ui/ImageSelect';

interface AnalyticsFilterPanelProps {
  allDriverPerformance: DriverPerformance[];
  selectedDriver: string | null;
  selectedPeriod: string;
  driverSearchTerm: string;
  onDriverChange: (driver: string | null) => void;
  onPeriodChange: (period: string) => void;
  onDriverSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

export default function AnalyticsFilterPanel({
  allDriverPerformance,
  selectedDriver,
  selectedPeriod,
  driverSearchTerm,
  onDriverChange,
  onPeriodChange,
  onDriverSearch,
  onReset
}: AnalyticsFilterPanelProps) {
  return (
    <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex flex-col md:flex-row md:items-end gap-5">
        <div className="flex-1">
          <label htmlFor="driver-filter" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-widest flex items-center gap-1">
            <UserIcon className="h-4 w-4 text-violet-600" />
            พนักงานขับรถ
          </label>
          <div className="space-y-2">
            <ImageSelect
              value={driverSearchTerm ? '' : (selectedDriver || 'all')}
              onChange={(v) => onDriverChange(v === 'all' ? null : v)}
              placeholder="ทั้งหมด"
              fallbackIcon={<UserIcon className="w-full h-full" />}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                ...allDriverPerformance.map(d => ({
                  value: d.name,
                  label: `${truncateText(d.name, 30)} (${d.count})`,
                  imageUrl: d.photoUrl,
                })),
              ]}
            />

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาพนักงาน..."
                value={driverSearchTerm}
                onChange={onDriverSearch}
                className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <label htmlFor="period-filter" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-widest flex items-center gap-1">
            <CalendarIcon className="h-4 w-4 text-violet-600" />
            ช่วงเวลา
          </label>
          <select
            id="period-filter"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            onChange={(e) => onPeriodChange(e.target.value)}
            value={selectedPeriod}
          >
            <option value="all">ทั้งหมด</option>
            <option value="week">7 วันที่ผ่านมา</option>
            <option value="month">30 วันที่ผ่านมา</option>
            <option value="quarter">90 วันที่ผ่านมา</option>
          </select>
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={onReset}
          >
            รีเซ็ต
          </Button>
        </div>
      </div>
    </div>
  );
}
