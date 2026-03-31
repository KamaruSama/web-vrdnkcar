'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  UsersIcon,
  TruckIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  ChevronDownIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

const UsersSection = dynamic(() => import('@/components/admin/UsersSection'), { ssr: false });
const CarsSection = dynamic(() => import('@/components/admin/CarsSection'), { ssr: false });
const DriversSection = dynamic(() => import('@/components/admin/DriversSection'), { ssr: false });
const LogsSection = dynamic(() => import('@/components/admin/LogsSection'), { ssr: false });
const BackupSection = dynamic(() => import('@/components/admin/BackupSection'), { ssr: false });
const DoctorSection = dynamic(() => import('@/components/admin/DoctorSection'), { ssr: false });

interface Section {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  color: string;
  dot: string;
  bg: string;
  border: string;
  activeText: string;
  component: React.ReactNode;
}

const sections: Section[] = [
  { id: 'users',   title: 'จัดการผู้ใช้',           shortTitle: 'ผู้ใช้',     icon: <UsersIcon className="w-5 h-5" />,                color: 'text-blue-600',    dot: 'bg-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',    activeText: 'text-blue-600',    component: <UsersSection /> },
  { id: 'car',     title: 'จัดการรถ',               shortTitle: 'รถ',         icon: <TruckIcon className="w-5 h-5" />,                color: 'text-emerald-600', dot: 'bg-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', activeText: 'text-emerald-600', component: <CarsSection /> },
  { id: 'drivers', title: 'จัดการพนักงานขับรถ',     shortTitle: 'พนักงาน',    icon: <UserGroupIcon className="w-5 h-5" />,            color: 'text-violet-600',  dot: 'bg-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100',  activeText: 'text-violet-600',  component: <DriversSection /> },
  { id: 'logs',    title: 'กิจกรรมผู้ใช้',          shortTitle: 'กิจกรรม',    icon: <ClipboardDocumentListIcon className="w-5 h-5" />, color: 'text-amber-600',   dot: 'bg-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',   activeText: 'text-amber-600',   component: <LogsSection /> },
  { id: 'backup',  title: 'สำรองข้อมูล',            shortTitle: 'สำรอง',      icon: <CircleStackIcon className="w-5 h-5" />,         color: 'text-cyan-600',    dot: 'bg-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-100',    activeText: 'text-cyan-600',    component: <BackupSection /> },
  { id: 'doctor',  title: 'สภาพระบบ',              shortTitle: 'ระบบ',       icon: <HeartIcon className="w-5 h-5" />,                color: 'text-rose-600',    dot: 'bg-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-100',    activeText: 'text-rose-600',    component: <DoctorSection /> },
];

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<string | null>(null);
  const [mounted, setMounted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== 'admin') router.push('/');
  }, [user, router]);

  if (!user || user.role !== 'admin') return null;

  const toggle = (id: string) => {
    const next = expanded === id ? null : id;
    if (next) setMounted(m => new Set(m).add(next));
    setExpanded(next);
  };

  const selectMobileTab = (id: string) => {
    setMounted(m => new Set(m).add(id));
    setMobileTab(id);
  };

  const sorted = expanded
    ? [sections.find(s => s.id === expanded)!, ...sections.filter(s => s.id !== expanded)]
    : sections;

  const activeSection = sections.find(s => s.id === mobileTab);

  return (
    <>
      {/* ===== MOBILE LAYOUT ===== */}
      <div className="sm:hidden">
        {!mobileTab ? (
          /* Section picker */
          <div className="py-2">
            <h1 className="text-xl font-bold text-gray-900 mb-1">ผู้ดูแลระบบ</h1>
            <p className="text-xs text-gray-400 mb-5">เลือกหมวดหมู่เพื่อจัดการข้อมูล</p>
            <div className="space-y-2">
              {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => selectMobileTab(sec.id)}
                  className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 active:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg ${sec.bg} ${sec.color} flex items-center justify-center shrink-0`}>
                    {sec.icon}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 flex-1 text-left">{sec.title}</span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-300 -rotate-90" />
                </button>
              ))}
            </div>
          </div>
        ) : activeSection && (
          /* Section content */
          <div className="py-2">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setMobileTab(null)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 active:text-gray-600"
              >
                <ChevronDownIcon className="w-3.5 h-3.5 rotate-90" />
              </button>
              <div className="relative flex-1">
                <select
                  value={mobileTab || ''}
                  onChange={e => selectMobileTab(e.target.value)}
                  className={`w-full appearance-none pl-10 pr-8 py-2.5 rounded-xl border text-sm font-semibold bg-white ${activeSection.border} ${activeSection.activeText} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-violet-300`}
                >
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.title}</option>
                  ))}
                </select>
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${activeSection.color}`}>
                  {activeSection.icon}
                </div>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Content */}
            <div>
              {mounted.has(activeSection.id) && activeSection.component}
            </div>
          </div>
        )}
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden sm:block">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ผู้ดูแลระบบ</h1>
          <p className="text-sm text-gray-500 mt-1">เลือกหมวดหมู่เพื่อจัดการข้อมูล</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Left shortcut sidebar */}
          <aside className="w-14 shrink-0 sticky top-20 hidden md:flex flex-col gap-2">
            {sections.map(sec => {
              const isActive = expanded === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => toggle(sec.id)}
                  title={sec.title}
                  className={`group relative flex items-center justify-center w-14 h-14 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? `${sec.bg} ${sec.border} ${sec.color} shadow-sm scale-105`
                      : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  }`}
                >
                  {sec.icon}
                  <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                    {sec.title}
                  </span>
                  {isActive && (
                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${sec.dot} border-2 border-white`} />
                  )}
                </button>
              );
            })}
          </aside>

          {/* Main accordion */}
          <div className="flex-1 space-y-3 min-w-0">
            {sorted.map(sec => {
              const isOpen = expanded === sec.id;
              return (
                <div
                  key={sec.id}
                  className={`rounded-xl border bg-white overflow-hidden transition-shadow duration-200 ${isOpen ? `${sec.border} shadow-md` : 'border-gray-200'}`}
                >
                  <button
                    onClick={() => toggle(sec.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${sec.bg} ${sec.color} shrink-0`}>
                      {sec.icon}
                    </div>
                    <span className="flex-1 font-semibold text-gray-800">{sec.title}</span>
                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      {mounted.has(sec.id) && (
                        <div className={`mx-4 mb-4 p-5 rounded-xl ${sec.bg} border ${sec.border}`}>
                          {sec.component}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
