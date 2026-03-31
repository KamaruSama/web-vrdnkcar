'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/components/auth/AuthProvider';
import UserProfile from '@/components/auth/UserProfile';
import { Booking } from '@/types';
import Link from 'next/link';
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  TruckIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className="opacity-70">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</p>
          <p className="text-2xl font-black tabular-nums leading-tight">{value}</p>
          {sub && <p className="text-[10px] opacity-50 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold text-gray-700 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const r = await axios.get('/api/bookings');
      setBookings(r.data.bookings || []);
    } catch { setError('ไม่สามารถโหลดข้อมูลการจองได้'); }
    finally { setLoadingBookings(false); }
  };

  const handleUpdateProfile = async (updatedUserData: any) => {
    try {
      setLoading(true); setError(null); setSuccessMessage(null);
      const r = await axios.put(`/api/users/${user?.id}`, updatedUserData);
      if (r.data.user) { updateUser(r.data.user); setSuccessMessage('อัปเดตโปรไฟล์เรียบร้อยแล้ว'); }
    } catch (err: any) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์'); }
    finally { setLoading(false); }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <ShieldCheckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-700">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-sm text-gray-400 mt-1">เพื่อดูข้อมูลโปรไฟล์ของคุณ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
          <XCircleIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl text-sm">
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Profile Card */}
      <UserProfile user={user} onUpdate={handleUpdateProfile} isLoading={loading} />

      {/* Quick Link to Analytics */}
      <Link
        href="/analytics"
        className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
            <ChartBarIcon className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">ดูผลประเมินและสถิติ</p>
            <p className="text-xs text-gray-400">คะแนนเฉลี่ย แนวโน้ม และข้อมูลเชิงลึก</p>
          </div>
        </div>
        <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
      </Link>

      {/* Admin Dashboard */}
      {user.role === 'admin' && (
        <AdminDashboard bookings={bookings} loading={loadingBookings} />
      )}
    </div>
  );
}

function AdminDashboard({ bookings, loading }: { bookings: Booking[]; loading: boolean }) {
  const [cars, setCars] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingData(true);
        const [c, d, u] = await Promise.all([axios.get('/api/car'), axios.get('/api/drivers'), axios.get('/api/users')]);
        setCars(c.data.cars || []); setDrivers(d.data.drivers || []); setUsers(u.data.users || []);
      } catch {} finally { setLoadingData(false); }
    })();
  }, []);

  if (loading || loadingData) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-3 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const approved = bookings.filter(b => b.approvalStatus === 'approved');
  const rejected = bookings.filter(b => b.approvalStatus === 'rejected');
  const pending = bookings.filter(b => b.approvalStatus === 'pending');
  const fullyAssigned = bookings.filter(b => b.approvalStatus === 'approved' && b.carId && b.driverId);
  const totalTravelers = bookings.reduce((t, b) => t + (b.travelers || 0), 0);
  const assignedCar = bookings.filter(b => b.carId).length;
  const assignedDriver = bookings.filter(b => b.driverId).length;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-gray-900">แดชบอร์ดผู้ดูแลระบบ</h2>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<ChartBarIcon className="h-5 w-5" />} label="การจองทั้งหมด" value={bookings.length} sub={`${totalTravelers} ผู้โดยสาร`} color="bg-violet-50 text-violet-700" />
        <StatCard icon={<CheckCircleIcon className="h-5 w-5" />} label="อนุมัติ" value={approved.length} sub={`${fullyAssigned.length} จัดสรรครบ`} color="bg-emerald-50 text-emerald-700" />
        <StatCard icon={<XCircleIcon className="h-5 w-5" />} label="ไม่อนุมัติ" value={rejected.length} color="bg-red-50 text-red-600" />
        <StatCard icon={<ClockIcon className="h-5 w-5" />} label="รออนุมัติ" value={pending.length} color="bg-amber-50 text-amber-700" />
      </div>

      {/* Resources + Usage */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">ทรัพยากรและการใช้งาน</h3>

        {/* Resource counts */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center py-3 bg-gray-50 rounded-lg">
            <TruckIcon className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-black text-gray-800 tabular-nums">{cars.length}</p>
            <p className="text-[10px] text-gray-400 font-medium">รถทั้งหมด</p>
          </div>
          <div className="text-center py-3 bg-gray-50 rounded-lg">
            <UserGroupIcon className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-black text-gray-800 tabular-nums">{drivers.length}</p>
            <p className="text-[10px] text-gray-400 font-medium">พนักงานขับรถ</p>
          </div>
          <div className="text-center py-3 bg-gray-50 rounded-lg">
            <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-black text-gray-800 tabular-nums">{users.length}</p>
            <p className="text-[10px] text-gray-400 font-medium">ผู้ใช้ทั้งหมด</p>
          </div>
        </div>

        {/* Usage bars */}
        {cars.length > 0 && drivers.length > 0 && (
          <div className="space-y-3">
            <ProgressBar label="อัตราการใช้งานรถ" value={assignedCar} max={cars.length} color="bg-orange-400" />
            <ProgressBar label="อัตราการใช้งานพนักงานขับรถ" value={assignedDriver} max={drivers.length} color="bg-blue-400" />
          </div>
        )}
      </div>
    </div>
  );
}
