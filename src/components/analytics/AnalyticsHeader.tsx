import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { DriverPerformance } from './types';

interface AnalyticsHeaderProps {
  surveysLength: number;
  scrollPosition: number;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onRefresh: () => void;
  allDriverPerformance: DriverPerformance[];
  selectedDriver: string | null;
  selectedPeriod: string;
  driverSearchTerm: string;
  onDriverChange: (driver: string | null) => void;
  onPeriodChange: (period: string) => void;
  onDriverSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResetFilter: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'overview', label: 'ภาพรวม', icon: <ChartBarIcon className="h-4 w-4" /> },
  { id: 'categories', label: 'หมวดหมู่' },
  { id: 'drivers', label: 'พนักงานขับรถ' },
  { id: 'trends', label: 'แนวโน้ม' },
  { id: 'carstats', label: 'สถิติรถ' },
];

export default function AnalyticsHeader({
  activeTab,
  onTabChange
}: AnalyticsHeaderProps) {
  return (
    <div className="sticky top-0 z-50">
      <div className="py-3 flex justify-center">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon && (
                <span className={activeTab === tab.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-500'}>
                  {tab.icon}
                </span>
              )}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
