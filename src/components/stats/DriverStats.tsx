'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Booking, Car } from '@/types';
import { formatDate } from '@/lib/utils';
import { TruckIcon, UserGroupIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';

interface DriverStatsProps {
  bookings: Booking[];
  driverId: number;
  loading: boolean;
}

const DriverStats: React.FC<DriverStatsProps> = ({ bookings, driverId, loading }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      setLoadingCars(true);
      const response = await axios.get('/api/car');
      setCars(response.data.cars || []);
    } catch (error) {
      console.error('Error fetching cars:', error);
    } finally {
      setLoadingCars(false);
    }
  };

  // กรองการจองที่มีพนักงานขับรถคนนี้
  const driverBookings = bookings.filter(booking => booking.driverId === driverId);
  
  // กรองการจองที่ต้องรอพนักงานขับรถ (ได้รับอนุมัติแล้วแต่ยังไม่มีคนขับ)
  const pendingDriverBookings = bookings.filter(
    booking => booking.approvalStatus === 'approved' && !booking.driverId
  );

  // กรองการจองที่มีการกำหนดรถแล้ว
  const assignedCarBookings = bookings.filter(booking => booking.carId);

  // จัดกลุ่มตามรถแต่ละคัน
  const bookingsByCarId: Record<string, Booking[]> = {};
  
  assignedCarBookings.forEach(booking => {
    if (booking.carId) {
      const carId = booking.carId.toString();
      if (!bookingsByCarId[carId]) {
        bookingsByCarId[carId] = [];
      }
      bookingsByCarId[carId].push(booking);
    }
  });

  // สถิติอื่นๆ
  const completedTrips = driverBookings.filter(booking => 
    booking.approvalStatus === 'approved' && 
    new Date(booking.returnDate) < new Date()
  ).length;
  
  const upcomingTrips = driverBookings.filter(booking => 
    booking.approvalStatus === 'approved' && 
    new Date(booking.departureDate) > new Date()
  ).length;
  
  const totalPassengers = driverBookings.reduce(
    (total, booking) => total + (booking.travelers || 0), 
    0
  );

  if (loading || loadingCars) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* บัตรสรุปข้อมูลสถิติ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <TruckIcon className="h-12 w-12 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">การเดินทางทั้งหมด</h3>
              <div className="text-3xl font-bold text-blue-600">{driverBookings.length}</div>
              <div className="text-sm text-gray-500 mt-1">
                <span className="text-green-600">{completedTrips} เสร็จสิ้น</span> • 
                <span className="text-amber-600 ml-1">{upcomingTrips} กำลังจะมาถึง</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <UserGroupIcon className="h-12 w-12 text-green-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">ผู้โดยสารทั้งหมด</h3>
              <div className="text-3xl font-bold text-green-600">{totalPassengers}</div>
              <div className="text-sm text-gray-500 mt-1">
                จากการเดินทาง {driverBookings.length} ครั้ง
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
          <div className="flex items-center">
            <CheckBadgeIcon className="h-12 w-12 text-amber-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">รอกำหนดคนขับ</h3>
              <div className="text-3xl font-bold text-amber-600">{pendingDriverBookings.length}</div>
              <div className="text-sm text-gray-500 mt-1">
                รายการที่ได้รับการอนุมัติแล้ว
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* รายการจอดรถแยกตามทะเบียนรถ */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-700">ข้อมูลการใช้งานรถตามป้ายทะเบียน</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {cars.length > 0 ? (
            cars.map(car => {
              const carBookings = bookingsByCarId[car.id.toString()] || [];
              const totalCarPassengers = carBookings.reduce(
                (total, booking) => total + (booking.travelers || 0), 
                0
              );
              
              return (
                <div key={car.id} className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <div className="mb-3 sm:mb-0">
                      <h4 className="font-semibold text-gray-800 flex items-center">
                        <TruckIcon className="h-5 w-5 mr-2 text-blue-500" />
                        {car.licensePlate}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        ใช้งานทั้งหมด {carBookings.length} ครั้ง • ผู้โดยสารรวม {totalCarPassengers} คน
                      </p>
                    </div>
                    
                    <div className="flex items-center">
                      {[...Array(Math.min(5, carBookings.length))].map((_, i) => (
                        <div key={i} className="-ml-2 first:ml-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white">
                            <UserIcon className="h-4 w-4 text-blue-700" />
                          </div>
                        </div>
                      ))}
                      
                      {carBookings.length > 5 && (
                        <div className="-ml-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium border-2 border-white">
                            +{carBookings.length - 5}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* แสดงการจองล่าสุด 3 รายการ */}
                  {carBookings.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-500 mb-2">การจองล่าสุด:</h5>
                      <div className="space-y-2">
                        {carBookings.slice(0, 3).map(booking => (
                          <div key={booking.id} className="text-sm bg-gray-50 p-2 rounded">
                            <div className="flex justify-between">
                              <span className="font-medium">{booking.requesterName}</span>
                              <span className="text-gray-500">{formatDate(booking.departureDate)}</span>
                            </div>
                            <div className="text-gray-600 truncate">{booking.destination}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              ไม่พบข้อมูลรถในระบบ
            </div>
          )}
        </div>
      </div>
      
      {/* รายการที่กำลังรอพนักงานขับรถ */}
      {pendingDriverBookings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
            <h3 className="text-lg font-semibold text-amber-800">รายการที่รอพนักงานขับรถ</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {pendingDriverBookings.slice(0, 5).map(booking => (
              <div key={booking.id} className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800">{booking.requesterName}</h4>
                    <p className="text-sm text-gray-500">{booking.destination}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(booking.departureDate)} • {booking.travelers} คน
                    </div>
                  </div>
                  
                  <button className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">
                    เลือกเป็นคนขับ
                  </button>
                </div>
              </div>
            ))}
            
            {pendingDriverBookings.length > 5 && (
              <div className="px-6 py-3 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  ดูทั้งหมด {pendingDriverBookings.length} รายการ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverStats;