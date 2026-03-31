import React, { useState } from 'react';
import Image from 'next/image';
import { TruckIcon, UserGroupIcon, UsersIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Booking, Car } from '@/types';
import { truncateText, formatDate } from './utils';

interface CarStatsTabProps {
  cars: Car[];
  bookings: Booking[];
  selectedCar: string | null;
  loadingCars: boolean;
  loadingBookings: boolean;
  onSelectCar: (licensePlate: string) => void;
  onBack: () => void;
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 opacity-80">{icon}</div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-2xl font-black tabular-nums leading-tight">{value}</p>
          {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function CarStatsTab({ cars, bookings, selectedCar, loadingCars, loadingBookings, onSelectCar, onBack }: CarStatsTabProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Car list view
  if (!selectedCar) {
    const carsWithStats = cars.map(car => {
      const cb = bookings.filter(b => b.carId === car.id);
      return { ...car, tripCount: cb.length, passengers: cb.reduce((t, b) => t + (b.travelers || 0), 0) };
    }).sort((a, b) => b.tripCount - a.tripCount);
    const maxTrips = carsWithStats[0]?.tripCount || 1;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">สถิติรถทั้งหมด</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">เลือกเพื่อดูรายละเอียด · {cars.length} คัน</p>
        </div>
        <div onMouseLeave={() => setHovered(null)}>
          {carsWithStats.map((car, index) => {
            const barPct = Math.round((car.tripCount / maxTrips) * 100);
            const isLast = index === carsWithStats.length - 1;
            const dimmed = hovered !== null && hovered !== index;
            return (
              <button
                key={car.id}
                onClick={() => onSelectCar(car.licensePlate)}
                className={`w-full flex items-center gap-4 px-6 py-3 text-left transition-colors ${!isLast ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}
                style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s ease' }}
                onMouseEnter={() => setHovered(index)}
              >
                <span className="text-xs font-bold text-slate-400 w-5 text-right tabular-nums flex-shrink-0">{index + 1}</span>
                {car.photoUrl?.trim() ? (
                  <div className="relative w-6 h-6 rounded overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                    <Image src={car.photoUrl} alt={car.licensePlate} fill sizes="24px" style={{ objectFit: 'cover' }} />
                  </div>
                ) : (
                  <TruckIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-28 flex-shrink-0">{car.licensePlate}</span>
                <div className="flex-1 min-w-0 hidden sm:block">
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-violet-400 transition-all duration-500" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums w-12 text-right flex-shrink-0">{car.tripCount}</span>
                <span className="text-xs text-slate-400 flex-shrink-0 w-8">ครั้ง</span>
                <span className="text-xs text-slate-400 tabular-nums flex-shrink-0 w-14 text-right hidden sm:block">{car.passengers} คน</span>
                <ArrowLeftIcon className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 rotate-180 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Loading
  if (loadingCars || loadingBookings) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 border-3 border-violet-500 border-t-transparent rounded-full" />
          <span className="text-sm text-slate-400">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  // Detail view
  const car = cars.find(c => c.licensePlate === selectedCar);
  if (!car) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
        <p className="text-sm text-slate-400">ไม่พบข้อมูลรถทะเบียนนี้</p>
        <button onClick={onBack} className="mt-3 text-sm font-semibold text-violet-600 hover:text-violet-700">ย้อนกลับ</button>
      </div>
    );
  }

  const carBookings = bookings.filter(b => b.carId === car.id);
  const totalPassengers = carBookings.reduce((t, b) => t + (b.travelers || 0), 0);
  const completedTrips = carBookings.filter(b => b.approvalStatus === 'approved' && new Date(b.returnDate) < new Date()).length;
  const upcomingTrips = carBookings.filter(b => b.approvalStatus === 'approved' && new Date(b.departureDate) > new Date()).length;
  const uniqueDrivers = new Set(carBookings.map(b => b.driverName).filter(Boolean));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <TruckIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedCar}</h2>
              <p className="text-xs text-slate-400">สถิติการใช้งานรถ</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            ย้อนกลับ
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<TruckIcon className="h-6 w-6" />}
            label="การเดินทาง"
            value={carBookings.length}
            sub={`${completedTrips} เสร็จ · ${upcomingTrips} กำลังมา`}
            color="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
          />
          <StatCard
            icon={<UserGroupIcon className="h-6 w-6" />}
            label="ผู้โดยสารรวม"
            value={totalPassengers}
            sub={`จาก ${carBookings.length} เที่ยว`}
            color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
          />
          <StatCard
            icon={<UsersIcon className="h-6 w-6" />}
            label="พนักงานขับรถ"
            value={uniqueDrivers.size}
            sub="คนที่เคยขับรถคันนี้"
            color="bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300"
          />
        </div>
      </div>

      {/* Recent bookings table */}
      {carBookings.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">การจองล่าสุด</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{Math.min(carBookings.length, 10)} รายการล่าสุด</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-slate-100 dark:border-slate-700">
                  {['วันที่', 'ผู้ขอใช้รถ', 'พนักงานขับรถ', 'จุดหมาย', 'ผู้โดยสาร'].map((h, i) => (
                    <th key={h} className={`px-6 py-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest ${i === 4 ? 'text-center' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carBookings.slice(0, 10).map((booking, idx) => (
                  <tr key={booking.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                    <td className={`px-6 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 tabular-nums ${idx < Math.min(carBookings.length, 10) - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {formatDate(booking.departureDate)}
                    </td>
                    <td className={`px-6 py-3 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300 ${idx < Math.min(carBookings.length, 10) - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {truncateText(booking.requesterName || '', 20)}
                    </td>
                    <td className={`px-6 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 ${idx < Math.min(carBookings.length, 10) - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {truncateText(booking.driverName || '—', 20)}
                    </td>
                    <td className={`px-6 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-[180px] truncate ${idx < Math.min(carBookings.length, 10) - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {booking.destination}
                    </td>
                    <td className={`px-6 py-3 whitespace-nowrap text-center text-sm font-bold text-slate-600 dark:text-slate-300 tabular-nums ${idx < Math.min(carBookings.length, 10) - 1 ? 'border-b border-slate-50 dark:border-slate-700/40' : ''}`}>
                      {booking.travelers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {carBookings.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
          <p className="text-sm text-slate-400">ไม่พบประวัติการใช้งานรถทะเบียนนี้</p>
        </div>
      )}
    </div>
  );
}
