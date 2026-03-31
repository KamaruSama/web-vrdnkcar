'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Booking, User } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import BookingList from '@/components/bookings/BookingList';
import Modal from '@/components/ui/Modal';
import BookingForm from '@/components/bookings/BookingForm';
import Button from '@/components/ui/Button';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function BookingPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  const fetchBookingsAndUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [bookingsRes, usersRes] = await Promise.all([
        axios.get('/api/bookings'),
        axios.get('/api/users'),
      ]);

      setBookings(bookingsRes.data.bookings || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.log('Error fetching data:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้านี้หรือลองใหม่ในภายหลัง');
    } finally {
      setIsLoading(false);
    }
  };

  // ฟิลเตอร์การจองตามสถานะ
  useEffect(() => {
    if (filter === 'all') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(booking => booking.approvalStatus === filter));
    }
  }, [bookings, filter]);

  useEffect(() => {
    fetchBookingsAndUsers();
  }, []);

  const handleCreateBooking = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      await axios.post('/api/bookings', {
        ...data,
        requesterId: data.requesterId
      });
      
      setIsBookingModalOpen(false);
      fetchBookingsAndUsers();
    } catch (error: any) {
      console.log('Error creating booking:', error);
      alert('เกิดข้อผิดพลาดในการสร้างคำขอ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  };

  return (
    <div className="py-2">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">การจองรถสำนักงาน</h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการการจองรถและตรวจสอบสถานะการอนุมัติ
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button
            variant="primary"
            onClick={() => setIsBookingModalOpen(true)}
            icon={<PlusIcon className="h-5 w-5 mr-2" />}
          >
            สร้างคำขอใหม่
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="danger"
                size="sm"
                className="mt-2"
                onClick={fetchBookingsAndUsers}
              >
                ลองใหม่
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">รายการจองรถ</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              แสดงรายการจองรถทั้งหมดในระบบ
            </p>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mr-3">
              สถานะ:
            </label>
            <select
              id="filter"
              name="filter"
              value={filter}
              onChange={handleFilterChange}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">รออนุมัติ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-200 p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredBookings.length > 0 ? (
            <BookingList
              initialBookings={filteredBookings}
              users={users}
              currentUser={user}
              onRefresh={fetchBookingsAndUsers}
              readOnly={false}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">ไม่พบข้อมูลการจองรถที่ตรงกับเงื่อนไขที่เลือก</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setIsBookingModalOpen(true)}
              >
                สร้างคำขอใหม่
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal การจองรถ - ปรับปรุงให้แสดงผลได้ดีบนมือถือ */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="สร้างคำขอใช้รถ"
        size="full"
      >
        <BookingForm
          currentUser={user}
          users={users}
          onSubmit={handleCreateBooking}
          onCancel={() => setIsBookingModalOpen(false)}
          isSubmitting={isSubmitting}
          forceShowRequesterDropdown={user?.role === 'admin'}
        />
      </Modal>
    </div>
  );
}