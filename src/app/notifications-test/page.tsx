'use client';

import React, { useState } from 'react';
import axios from 'axios';

const NotificationsTestPage = () => {
  const [platform, setPlatform] = useState('telegram');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ข้อมูลตัวอย่างสำหรับการทดสอบ
  const sampleBookingData = {
    id: 999,
    bookingNumber: 'CAR-2568-9999',
    submissionDate: '20/04/2568',
    requesterId: 1,
    requesterName: 'นายทดสอบ ระบบ',
    requesterPosition: 'นักพัฒนาระบบ',
    destination: 'สำนักงานทดสอบระบบ',
    purpose: 'ทดสอบการส่งการแจ้งเตือน',
    travelers: 2,
    departureDate: '21/04/2568',
    departureTime: '09:00',
    returnDate: '21/04/2568',
    returnTime: '17:00',
    carId: 1,
    carLicensePlate: 'กธ - 2321',
    driverId: 1,
    driverName: 'นายอนุรักษ์ รัตนบุรี',
    notes: 'ทดสอบการแจ้งเตือน',
    approvalStatus: 'pending',
    approvalNotes: ''
  };

  const handleSendNotification = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await axios.post('/api/notifications', {
        platform,
        bookingData: sampleBookingData
      });

      setResult(response.data);
    } catch (err: any) {
      console.error('Error sending notification:', err);
      setError(err.response?.data?.error || err.message || 'เกิดข้อผิดพลาดในการส่งการแจ้งเตือน');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ทดสอบระบบการแจ้งเตือน</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            แพลตฟอร์ม
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="telegram">Telegram</option>
            <option value="line">Line</option>
          </select>
        </div>
        
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900 mb-2">ข้อมูลตัวอย่างสำหรับทดสอบ:</h2>
          <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
            {JSON.stringify(sampleBookingData, null, 2)}
          </pre>
        </div>
        
        <button
          onClick={handleSendNotification}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'กำลังส่ง...' : 'ส่งการแจ้งเตือน'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          <p className="font-medium">เกิดข้อผิดพลาด</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
          <p className="font-medium">ส่งการแจ้งเตือนสำเร็จ</p>
          <pre className="mt-2 bg-white p-2 rounded-md overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">คำแนะนำ</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>หน้านี้ใช้สำหรับทดสอบการส่งการแจ้งเตือนเท่านั้น โดยระบบจะทำการส่งแจ้งเตือนอัตโนมัติเมื่อ:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>แจ้งเตือน Telegram: เมื่อมีการสร้างการจองใหม่</li>
                <li>แจ้งเตือน Line: เมื่อมีการกำหนดรถและคนขับให้กับการจอง</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTestPage;