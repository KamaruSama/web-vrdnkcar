// แก้ไขในทุกไฟล์ที่ใช้ BookingList และส่ง users prop
// ตัวอย่าง: src/app/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BookingList from '@/components/bookings/BookingList';
import { Booking } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';

const Page = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const bookingsRes = await axios.get('/api/bookings');
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้านี้หรือลองใหม่ในภายหลัง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-center my-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div>
<h1 className="text-2xl font-bold text-gray-900 mb-6">ระบบจองรถ ศวพ.ภาคใต้ตอนบน</h1>
      
      {!user ? (
        <div>
          <BookingList
            initialBookings={bookings}
            currentUser={null}
            onRefresh={fetchData}
            readOnly={true}
          />
        </div>
      ) : (
        <BookingList
          initialBookings={bookings}
          currentUser={user}
          onRefresh={fetchData}
          readOnly={false}
        />
      )}
    </div>
  );
};

export default Page;