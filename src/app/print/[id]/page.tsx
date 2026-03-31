'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Booking } from '@/types';
import axios from 'axios';

export default function PrintPage() {
  const params = useParams();
  const bookingId = params.id as string;
  
  // สถานะสำหรับข้อมูลการจองรถ
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ดึงข้อมูลการจองจากฐานข้อมูล
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/bookings/${bookingId}`);
        setBooking(response.data.booking);
        setLoading(false);
        
        // เรียกใช้ฟังก์ชัน print หลังจากโหลดข้อมูลเสร็จสิ้น
        setTimeout(() => {
          window.print();
        }, 500);
      } catch (err) {
        console.error('Error fetching booking data:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [bookingId]);
  
  // แยกวันที่ออกเป็นส่วน ๆ และแปลงเป็น พ.ศ.
  const parseTHDate = (dateString: string) => {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      // แปลงปีเป็น พ.ศ. โดยการบวกเพิ่ม 543 ปี
      const yearCE = parseInt(parts[2]);
      const yearBE = yearCE + 543;
      
      return {
        day: parts[0],
        month: getThaiMonth(parseInt(parts[1])),
        year: yearBE.toString(),
      };
    }
    return { day: '', month: '', year: '' };
  };
  
  // แปลงเลขเดือนเป็นชื่อเดือนภาษาไทย
  const getThaiMonth = (month: number) => {
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
      'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
      'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return thaiMonths[month - 1];
  };
  
  // แปลงวันที่เป็นรูปแบบสำหรับแสดงในแบบฟอร์ม
  const formatDateForPrint = (dateString: string) => {
    const { day, month, year } = parseTHDate(dateString);
    return `${day} ${month} พ.ศ. ${year}`;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center bg-red-50 p-6 rounded-lg max-w-md">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">ไม่พบข้อมูลการจองรถ</p>
        </div>
      </div>
    );
  }
  
  const submissionDate = parseTHDate(booking.submissionDate);
  
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white print:p-0">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">ใบขออนุญาตใช้รถราชการ</h1>
      </div>
      
      <div className="text-right mb-6">
        <p>วันที่ {submissionDate.day} {submissionDate.month} พ.ศ. {submissionDate.year}</p>
      </div>
      
      <div className="mb-6">
        <p>เรียน ผู้อำนวยการศูนย์วิจัยและพัฒนาการสัตวแพทย์ภาคใต้ตอนบน</p>
        <p className="mt-4">
          ข้าพเจ้า {booking.requesterName} ตำแหน่ง {booking.requesterPosition}
        </p>
        <p className="mt-4">
          ขออนุญาตใช้รถยนต์ ซึ่งใช้ประจำที่ศูนย์วิจัยและพัฒนาการสัตวแพทย์ภาคใต้ตอนบนไปราชการที่ {booking.destination} มีผู้ร่วมเดินทาง {booking.travelers} คน
        </p>
        <p className="mt-4">
          เพื่อ {booking.purpose}
        </p>
        <p className="mt-4">
          ในวันที่ {formatDateForPrint(booking.departureDate)} เวลา {booking.departureTime} น. และกลับในวันที่ {formatDateForPrint(booking.returnDate)} เวลา {booking.returnTime} น.
        </p>
      </div>
      
      <div className="mt-12 mb-16 text-right">
        <div className="inline-block text-right">
          <p className="text-center">{booking.requesterName}</p>
          <p className="text-center">{booking.requesterPosition}</p>
          <p className='text-center'>ผู้ขออนุญาต</p>
        </div>
      </div>
      
      <div className="mt-8">
        <p>การไปราชการครั้งนี้อนุญาตให้ใช้รถยนต์หมายเลขทะเบียน {booking.carLicensePlate || '........................'}</p>
        <p>โดยมี {booking.driverName || '........................'} เป็นพนักงานขับรถยนต์</p>
      </div>
      
      <div className="mt-12 mb-16 text-right">
        <div className="text-center">
          <p className="text-center">นางสาววันดี คงแก้ว</p>
          <p className="text-center">ผู้อำนวยการศูนย์วิจัยและพัฒนาการสัตวแพทย์ภาคใต้ตอนบน</p>
          <p className="text-center">ผู้อนุญาต</p>
        </div>
      </div>

      {/* ปุ่มพิมพ์ - จะแสดงเฉพาะในหน้าจอ ไม่แสดงในการพิมพ์ */}
      <div className="mt-8 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          พิมพ์เอกสาร
        </button>
      </div>
      
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          
          body {
            font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
            font-size: 16pt;
            line-height: 1.5;
          }
          
          h1 {
            font-size: 20pt;
          }
        }
      `}</style>
    </div>
  );
}