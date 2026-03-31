// src/components/bookings/BookingCard.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Booking, User, Driver, Car } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';
import {
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  MapPinIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  TruckIcon, 
  UserIcon,
  DocumentTextIcon, 
  PencilIcon, 
  PrinterIcon, 
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Modal from '../ui/Modal';
import SurveyForm from '../survey/SurveyForm';
import Button from '../ui/Button';
import { ExtendedError } from '@/types/api-types';
import ImageSelect from '../ui/ImageSelect';

interface BookingCardProps {
  booking: Booking;
  currentUser: User | null;
  onUpdateCar?: (bookingId: number, carId: string) => void;
  onUpdateDriver?: (bookingId: number, driverId: string) => void;
  onUpdateNotes?: (bookingId: number, notes: string) => void;
  onUpdateApproval?: (bookingId: number, status: 'approved' | 'rejected' | 'pending', notes?: string) => void;
  onUpdateSurveyStatus?: (bookingId: number, hasEvaluated: boolean) => void;
  readOnly?: boolean;
  hasEvaluated?: boolean;
  adminView?: boolean; // เพิ่ม prop สำหรับการดูแบบ admin
  successTimeout?: number; // เพิ่ม prop สำหรับค่า timeout (นาที)
  evaluatedTimestamp?: number | null; // เพิ่ม prop สำหรับเวลาที่ทำการประเมิน (timestamp)
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  currentUser,
  onUpdateCar,
  onUpdateDriver,
  onUpdateNotes,
  onUpdateApproval,
  onUpdateSurveyStatus,
  readOnly = false,
  hasEvaluated = false,
  adminView = false,
  successTimeout = 10, // ค่าเริ่มต้น 10 นาที (ตามที่ตั้งไว้ในระบบ)
  evaluatedTimestamp = null
}) => {
  // สถานะสำหรับการแสดง modal
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  // สถานะสำหรับการแก้ไขข้อมูล
  const [notes, setNotes] = useState(booking.notes || '');
  const [approvalNotes, setApprovalNotes] = useState(booking.approvalNotes || '');
  const [selectedCar, setSelectedCar] = useState(booking.carId?.toString() || '');
  const [selectedDriver, setSelectedDriver] = useState(booking.driverId?.toString() || '');
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'rejected' | 'pending'>(booking.approvalStatus || 'pending');
  
  // สถานะสำหรับข้อมูลรถและพนักงานขับรถ
  const [cars, setCars] = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverPhoto, setSelectedDriverPhoto] = useState<string | null>(null);
  const [loadingDriverPhoto, setLoadingDriverPhoto] = useState(false);
  
  // เพิ่มสถานะสำหรับเวลานับถอยหลัง
  const [timeRemaining, setTimeRemaining] = useState<{ minutes: number, seconds: number } | null>(null);
  
  // ตรวจสอบว่าผู้ขอและคนขับเป็นคนเดียวกันหรือไม่ (เทียบชื่อ)
  const isSelfDriving = booking.requesterName && booking.driverName &&
                        booking.requesterName.trim() === booking.driverName.trim();

  // ตรวจสอบว่าเป็น approved แต่ไม่มีรถ/คนขับ (ไม่ต้องประเมิน)
  const isNoEval = booking.approvalStatus === 'approved' && !isSelfDriving && (!booking.carId || !booking.driverId);

  // เก็บ timestamp ครั้งแรกที่ card ถูก render ในสถานะ no_eval (ไม่ recalculate ทุกวินาที)
  const noEvalTimestampRef = useRef<number | null>(isNoEval ? Date.now() : null);
  
  // ฟังก์ชันสำหรับการทำเครื่องหมายว่ามีการประเมินแล้ว (กรณีขับรถเอง)
  const markAsSelfDriving = useCallback(async () => {
    console.log('Calling markAsSelfDriving for booking:', booking.id);
    try {
      // เรียก API endpoint เพื่อบันทึกการประเมิน
      const response = await axios.post(`/api/bookings/${booking.id}/mark-evaluated`, {
        hasBeenEvaluated: true
      });
      
      console.log('Mark as self-driving response:', response.data);
      
      if (response.data && response.data.success) {
        // แจ้ง parent component ว่าให้ถือว่าประเมินแล้ว
        if (onUpdateSurveyStatus) {
          console.log('Updating survey status in parent component');
          onUpdateSurveyStatus(booking.id, true);
        }
      }
    } catch (error) {
      console.error('Error marking booking as self-driving:', error);
      // ถึงแม้จะเกิดข้อผิดพลาด ยังคงแจ้ง parent component เพื่อปรับปรุง UI
      if (onUpdateSurveyStatus) {
        onUpdateSurveyStatus(booking.id, true);
      }
    }
  }, [booking.id, onUpdateSurveyStatus]);
  
  // ตั้งค่าเริ่มต้นให้มีการประเมินเลยถ้าผู้ขอและคนขับเป็นคนเดียวกัน
  useEffect(() => {
    if (isSelfDriving && booking.approvalStatus === 'approved' && !hasEvaluated && onUpdateSurveyStatus) {
      // เรียกใช้ฟังก์ชันที่สร้างขึ้นเพื่อทำเครื่องหมายว่าประเมินแล้ว
      markAsSelfDriving();
    }
  }, [booking, isSelfDriving, hasEvaluated, onUpdateSurveyStatus, markAsSelfDriving]);
  
  // ฟังก์ชันคำนวณเวลาที่เหลือ (ปรับปรุงให้ทำงานได้ดีขึ้น)
  const calculateTimeRemaining = () => {
    // ถ้าไม่มีการตั้งค่า timeout หรือค่าเป็น 0 ให้ไม่แสดงการนับถอยหลัง
    if (!successTimeout || successTimeout <= 0) {
      setTimeRemaining(null);
      return;
    }
    
    // กำหนดตัวแปรเก็บเวลาที่ใช้ในการคำนวณ
    let timestampToUse = evaluatedTimestamp;
    
    // กรณีไม่ต้องประเมิน ใช้ timestamp ที่บันทึกไว้ตอน render ครั้งแรก
    if (!timestampToUse && isNoEval && booking.approvalStatus === 'approved') {
      timestampToUse = noEvalTimestampRef.current ?? Date.now();
    }

    // กรณีขับรถเอง ถ้าไม่มี evaluatedTimestamp ให้ใช้เวลาปัจจุบันลบด้วยครึ่งหนึ่งของเวลา timeout
    if (!timestampToUse && isSelfDriving && booking.approvalStatus === 'approved') {
      // จำลองว่าเวลาผ่านไปครึ่งหนึ่งของ timeout
      const halfTimeoutMs = (successTimeout * 60 * 1000) / 2;
      timestampToUse = Date.now() - halfTimeoutMs;
    }
    
    // ถ้ายังไม่มี timestamp ที่จะใช้ ให้ไม่แสดงการนับถอยหลัง
    if (!timestampToUse) {
      setTimeRemaining(null);
      return;
    }
    
    // คำนวณเวลาที่เหลือ
    const now = Date.now();
    const expirationTime = timestampToUse + (successTimeout * 60 * 1000);
    const remaining = Math.max(0, expirationTime - now);
    
    // ถ้าเวลาที่เหลือเป็น 0 หรือน้อยกว่า ให้ไม่แสดงการนับถอยหลัง
    if (remaining <= 0) {
      setTimeRemaining(null);
      return;
    }
    
    // คำนวณนาทีและวินาที
    const minutes = Math.floor(remaining / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
    
    setTimeRemaining({ minutes, seconds });
  };
  
  // เช็คว่าควรแสดงการนับถอยหลังหรือไม่
  const shouldShowCountdown = () => {
    // แสดงการนับถอยหลังเมื่อ:
    // 1. มีเวลาที่เหลือ (timeRemaining ไม่เป็น null)
    // 2. มีการตั้งค่า timeout (ไม่เป็น 0)
    // 3. เฉพาะกรณีดูแบบ admin เท่านั้น
    // 4. เป็นกรณีใดกรณีหนึ่งต่อไปนี้:
    //    - ประเมินแล้ว (hasEvaluated เป็น true) หรือ
    //    - ขับรถเองและอนุมัติแล้ว (isSelfDriving และ approved)
    
    if (!timeRemaining || successTimeout <= 0 || !adminView) {
      return false;
    }
    
    return hasEvaluated || (isSelfDriving && booking.approvalStatus === 'approved') || isNoEval;
  };
  
  // ฟังก์ชันช่วยแสดงผลเวลาที่เหลือในรูปแบบที่อ่านง่าย
  const formatTimeRemaining = () => {
    if (!timeRemaining) return '';
    
    const { minutes, seconds } = timeRemaining;
    
    if (minutes === 0) {
      if (seconds < 10) {
        return `อีกไม่กี่วินาทีจะหายไป`;
      }
      return `อีก ${seconds} วินาทีจะหายไป`;
    }
    
    if (minutes === 1) {
      return `อีก 1 นาที ${seconds} วินาทีจะหายไป`;
    }
    
    return `อีก ${minutes} นาที ${seconds} วินาทีจะหายไป`;
  };
  
  // ดึงข้อมูลรถและพนักงานขับรถเมื่อเปิด modal แก้ไข
  useEffect(() => {
    if (isEditModalOpen) {
      fetchCarsAndDrivers();
    }
  }, [isEditModalOpen]);
  
  // ดึงรูปภาพพนักงานขับรถเมื่อเลือกพนักงานขับรถ
  useEffect(() => {
    if (selectedDriver && selectedDriver !== '') {
      fetchDriverPhoto(selectedDriver);
    } else {
      setSelectedDriverPhoto(null);
    }
  }, [selectedDriver]);
  
  // อัปเดตการนับถอยหลังทุก 1 วินาที
  useEffect(() => {
    // คำนวณครั้งแรกทันที
    calculateTimeRemaining();
    
    // ตั้ง interval เพื่ออัปเดตทุกวินาที
    const intervalId = setInterval(() => {
      calculateTimeRemaining();
    }, 1000);
    
    // ทำความสะอาด interval เมื่อ component ถูก unmount
    return () => clearInterval(intervalId);
  }, [hasEvaluated, evaluatedTimestamp, successTimeout, isSelfDriving, isNoEval, booking.approvalStatus]);

  // ฟังก์ชันดึงข้อมูลรถและพนักงานขับรถ
  const fetchCarsAndDrivers = async () => {
    try {
      // ดึงข้อมูลทั้งหมดในครั้งเดียวโดยใช้ Promise.all
      try {
        const [carsRes, driversRes] = await Promise.all([
          axios.get('/api/car'),
          axios.get('/api/drivers')
        ]);
        
        setCars(carsRes.data.cars || []);
        setDrivers(driversRes.data.drivers || []);
      } catch (error) {
        console.log('Error fetching data:', error);
        setCars([]);
        setDrivers([]);
      }
    } catch (error) {
      console.log('Unexpected error in fetchCarsAndDrivers:', error);
    }
  };

  // ฟังก์ชันดึงรูปภาพพนักงานขับรถ
  const fetchDriverPhoto = async (driverId: string) => {
    setSelectedDriverPhoto(null);
    
    // setLoadingDriverPhoto(true);
    
    try {
      // ในการพัฒนาขั้นแรก เราจะไม่แสดงรูปภาพ (เพราะยังไม่มีคอลัมน์ photo_url)
      setSelectedDriverPhoto(null);
      
      /* 
      // โค้ดนี้จะทำงานเมื่อฐานข้อมูลมีคอลัมน์ photo_url แล้ว
      const response = await axios.get(`/api/drivers/${driverId}`);
      if (response.data.driver && response.data.driver.photoUrl) {
        setSelectedDriverPhoto(response.data.driver.photoUrl);
      } else {
        setSelectedDriverPhoto(null);
      }
      */
    } catch (error) {
      console.log('Error fetching driver photo:', error);
      setSelectedDriverPhoto(null);
    } finally {
      setLoadingDriverPhoto(false);
    }
  };

  // สร้าง badge แสดงสถานะการอนุมัติ
  const getStatusBadge = () => {
    switch (booking.approvalStatus) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300">
            <CheckCircleIcon className="mr-1 h-4 w-4" />
            อนุมัติแล้ว
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300">
            <XCircleIcon className="mr-1 h-4 w-4" />
            ไม่อนุมัติ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300">
            <ClockIcon className="mr-1 h-4 w-4" />
            รออนุมัติ
          </span>
        );
    }
  };
  
  // ตรวจสอบสถานะของการ์ดว่าควรแสดง Overlay แบบใด
  const getCardOverlayStatus = () => {
    // Highest priority: Rejected
    if (booking.approvalStatus === 'rejected') {
      return 'rejected';
    }
    
    // Success - requires approved, has car, has driver, and either evaluated or self-driving
    if (booking.approvalStatus === 'approved' && 
        booking.carId && 
        booking.driverId && 
        (hasEvaluated || isSelfDriving)) {
      return 'success';
    }
    
    // Evaluate - requires approved, has car, has driver, but not evaluated and not self-driving
    if (booking.approvalStatus === 'approved' && 
        booking.carId && 
        booking.driverId && 
        !hasEvaluated && 
        !isSelfDriving) {
      return 'evaluate';
    }
    
    // Approval - requires pending status, and has car and driver
    if (booking.approvalStatus === 'pending' && booking.carId && booking.driverId) {
      return 'approval';
    }
    
    // Assigning - missing car or driver (but not for approved bookings)
    if (!booking.carId || !booking.driverId) {
      // Special case: approved but no car/driver = ไม่ต้องประเมิน
      if (booking.approvalStatus === 'approved') {
        return 'no_eval';
      }
      return 'assigning';
    }
    
    // Default case
    return 'none';
  };
  
  // กำหนดสีขอบการ์ดตามสถานะ
  const getCardBorderClass = () => {
    const cardStatus = getCardOverlayStatus();
    
    switch (cardStatus) {
      case 'success':
        return 'border-success-500';
      case 'rejected':
        return 'border-danger-500';
      case 'evaluate':
        return 'border-accent-500';
      case 'approval':
        return 'border-warning-500';
      case 'assigning':
        return 'border-primary-500';
      case 'no_eval':
        return 'border-slate-400 dark:border-slate-500';
      default:
        return 'border-slate-200 dark:border-slate-700';
    }
  };

  // ตรวจสอบสิทธิ์ในการแก้ไข
  const canEditCarDriver = currentUser && (currentUser.role === 'admin' || currentUser.role === 'driver');
  const canEditApproval = currentUser && (currentUser.role === 'admin' || currentUser.role === 'approve');

  // ตรวจสอบว่าเป็นการจองที่อนุมัติแล้วและมีรถและคนขับพร้อม และไม่ใช่กรณีขับเอง (สามารถประเมินได้)
  const canEvaluate = booking.approvalStatus === 'approved' && 
                       booking.carId && booking.driverId && 
                       !isSelfDriving;

  // จัดการการบันทึกการเปลี่ยนแปลงทั้งหมดในครั้งเดียว
  const handleSaveChanges = async () => {
    if (readOnly) return;
    
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // สร้างข้อมูลที่ต้องการอัปเดตทั้งหมด
      const updateData: any = {
        bookingNumber: booking.bookingNumber,
        userId: currentUser?.id || 1 // ใช้ default เป็น 1 ถ้าไม่มี user
      };
      
      // เพิ่มข้อมูลที่ต้องการอัปเดตเข้าไปตามสิทธิ์
      if (canEditCarDriver || adminView) {
        updateData.carId = selectedCar ? parseInt(selectedCar) : null;
        updateData.driverId = selectedDriver ? parseInt(selectedDriver) : null;
        updateData.notes = notes;
      } else {
        // เพิ่มส่วนนี้เพื่อเก็บข้อมูลรถและคนขับไว้แม้ผู้ใช้จะไม่มีสิทธิ์แก้ไข
        // ส่งข้อมูลรถและคนขับเดิมกลับไปเพื่อรักษาข้อมูลไว้
        if (booking.carId !== undefined) {
          updateData.carId = booking.carId;
        }
        if (booking.driverId !== undefined) {
          updateData.driverId = booking.driverId;
        }
        // ส่งหมายเหตุเดิมกลับไปด้วย
        updateData.notes = booking.notes || '';
      }
      
      if (canEditApproval || adminView) {
        updateData.approvalStatus = approvalStatus;
        updateData.approvalNotes = approvalNotes;
      }
      
      // ส่งคำขออัปเดตเพียงครั้งเดียว
      const response = await axios.put(`/api/bookings/${booking.id}`, updateData);
      
      if (response.data.booking) {
        // อัปเดตสำเร็จ ปิด modal
        setIsEditModalOpen(false);
        
        // รีเฟรชข้อมูลครั้งเดียวหลังจากบันทึกทั้งหมด
        if (onUpdateCar) {
          onUpdateCar(booking.id, updateData.carId?.toString() || '');
        }
      } else {
        setErrorMessage('ไม่สามารถอัปเดตข้อมูลได้ โปรดลองใหม่อีกครั้ง');
      }
    } catch (error: any) {
      console.log('Error saving changes:', error);
      
      // แสดงข้อความข้อผิดพลาดที่เป็นมิตรกับผู้ใช้
      if (error.response?.status === 500) {
        setErrorMessage('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ โปรดลองใหม่อีกครั้งในภายหลัง');
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else if (error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // จัดการการส่งแบบประเมิน
  const handleSubmitSurvey = async (surveyData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // ส่งข้อมูลแบบประเมิน (ไม่ต้องมี userId ก็ได้, API จะใช้ default = 1)
      await axios.post('/api/survey', {
        ...surveyData,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId: currentUser?.id // อาจส่งเป็น undefined ได้ถ้าไม่ได้ล็อกอิน
      });
      
      setIsSurveyModalOpen(false);
      
      // เพิ่มอีเวนต์เพื่อแจ้งว่ามีการประเมินแล้ว - สำคัญมากเพื่อให้การ์ดหายไป
      if (onUpdateSurveyStatus) {
        onUpdateSurveyStatus(booking.id, true);
      }
      
      alert('บันทึกแบบประเมินเรียบร้อยแล้ว');
    } catch (error) {
      console.log('Error submitting survey:', error);
      
      // แสดงข้อความข้อผิดพลาดที่เป็นมิตรกับผู้ใช้
      const err = error as ExtendedError;
      if (err.response?.status === 500) {
        setErrorMessage('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ โปรดลองใหม่อีกครั้งในภายหลัง');
      } else if (err.response?.data?.error) {
        setErrorMessage(err.response.data.error as string);
      } else if (err.message) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('เกิดข้อผิดพลาดในการบันทึกแบบประเมิน กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardOverlayStatus = getCardOverlayStatus();
  const cardBorderClass = getCardBorderClass();

  return (
    <>
      {/* การ์ดแสดงข้อมูลการจอง */}
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 ${!expanded ? 'aspect-square' : ''} flex flex-col relative group border-2 ${cardBorderClass}`}
      >
        {/* แสดงข้อความสำหรับกรณีขับเอง - เฉพาะแอดมิน */}
        {isSelfDriving && booking.approvalStatus === 'approved' && adminView && (
          <div className="absolute bottom-0 left-0 m-2 z-20">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300">
              <CheckCircleIcon className="mr-1 h-3 w-3" />
              ขับรถเอง (นับถอยหลัง)
            </span>
          </div>
        )}

        {/* แสดงข้อความสำหรับกรณีไม่ต้องประเมิน - เฉพาะแอดมิน */}
        {isNoEval && adminView && (
          <div className="absolute bottom-0 left-0 m-2 z-20">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <CheckCircleIcon className="mr-1 h-3 w-3" />
              Exempt (นับถอยหลัง)
            </span>
          </div>
        )}
        
        {/* แสดง badge สำหรับ admin view เมื่อมีการประเมินแล้ว */}
        {adminView && hasEvaluated && !isSelfDriving && (
          <div className="absolute top-0 right-0 m-2 z-20">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300">
              <CheckCircleIcon className="mr-1 h-3 w-3" />
              มีการประเมินแล้ว
            </span>
          </div>
        )}
        
        {/* แสดง overlay ตามสถานะ */}
        
        {/* Success - เมื่อประเมินแล้ว หรือขับรถเอง */}
        {cardOverlayStatus === 'success' && (
          <div className="absolute inset-0 bg-success-100 dark:bg-success-900/20 bg-opacity-0 flex items-center justify-center transition-all duration-300 z-10 group-hover:bg-opacity-60 dark:group-hover:bg-opacity-30 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-success-500 text-white text-sm font-bold py-1 px-3 rounded-full shadow-lg">
                Success
              </span>
            </div>
          </div>
        )}

        {/* Rejected - เมื่อไม่อนุมัติ */}
        {cardOverlayStatus === 'rejected' && (
          <div className="absolute inset-0 bg-danger-100 dark:bg-danger-900/20 bg-opacity-0 flex items-center justify-center transition-all duration-300 z-10 group-hover:bg-opacity-60 dark:group-hover:bg-opacity-30 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-danger-500 text-white text-sm font-bold py-1 px-3 rounded-full shadow-lg">
                Rejected
              </span>
            </div>
          </div>
        )}

        {/* Evaluate - ต้องประเมิน */}
        {cardOverlayStatus === 'evaluate' && (
          <div className="absolute inset-0 bg-accent-100 dark:bg-accent-900/20 bg-opacity-0 flex items-center justify-center transition-all duration-300 z-10 group-hover:bg-opacity-60 dark:group-hover:bg-opacity-30 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-accent-500 text-white text-sm font-bold py-1 px-3 rounded-full shadow-lg">
                Evaluate
              </span>
            </div>
          </div>
        )}

        {/* Approval - รออนุมัติและมีรถและคนขับครบ */}
        {cardOverlayStatus === 'approval' && (
          <div className="absolute inset-0 bg-warning-100 dark:bg-warning-900/20 bg-opacity-0 flex items-center justify-center transition-all duration-300 z-10 group-hover:bg-opacity-60 dark:group-hover:bg-opacity-30 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-warning-500 text-white text-sm font-bold py-1 px-3 rounded-full shadow-lg">
                Approval
              </span>
            </div>
          </div>
        )}
        
        {/* Assigning - ยังไม่มีรถหรือคนขับ */}
        {cardOverlayStatus === 'assigning' && (
          <div className="absolute inset-0 bg-primary-100 dark:bg-primary-900/20 bg-opacity-0 flex items-center justify-center transition-all duration-300 z-10 group-hover:bg-opacity-60 dark:group-hover:bg-opacity-30 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-primary-500 text-white text-sm font-bold py-1 px-3 rounded-full shadow-lg">
                Assigning
              </span>
            </div>
          </div>
        )}

        {/* No Eval - อนุมัติแต่ไม่มีรถ/คนขับ ไม่ต้องประเมิน */}
        {cardOverlayStatus === 'no_eval' && (
          <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900/20 bg-opacity-0 flex items-center justify-center transition-all duration-300 z-10 group-hover:bg-opacity-60 dark:group-hover:bg-opacity-30 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-slate-500 text-white text-sm font-bold py-1 px-3 rounded-full shadow-lg">
                Exempt
              </span>
            </div>
          </div>
        )}
        
        {/* ส่วนหัวการ์ด แสดงเลขที่และสถานะ */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{booking.bookingNumber}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(booking.submissionDate)}</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {(!readOnly && (currentUser?.role !== 'user' || adminView)) && (
              <button
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-full transition-colors z-20"
                onClick={() => setIsEditModalOpen(true)}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* แสดงเวลานับถอยหลังที่มองเห็นได้ชัดเจนตรงส่วนบนของการ์ด */}
        {(hasEvaluated || isSelfDriving) && timeRemaining && adminView && (
          <div className="bg-blue-100 dark:bg-blue-900/40 p-2 mb-2 mx-3 mt-3 rounded-lg border border-blue-200 dark:border-blue-700 flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">การ์ดนี้จะหายไปโดยอัตโนมัติ</span>
            </div>
            <div className="bg-white dark:bg-blue-800/60 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-600">
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {timeRemaining.minutes}:{timeRemaining.seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
        
        {/* เนื้อหาของการ์ด */}
        <div className="p-4 flex-1 overflow-hidden">
          {/* ข้อมูลผู้ขอ + สถานที่ + รูปรถ */}
          <div className="flex gap-3 mb-4">
            {/* ซ้าย: ผู้ขอ + สถานที่ + วัตถุประสงค์ */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mr-3 flex-shrink-0 text-white shadow-sm">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-white truncate">{booking.requesterName}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{booking.requesterPosition}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className={`text-sm text-slate-700 dark:text-slate-300 ${!expanded ? 'line-clamp-2' : ''}`}>{booking.destination}</p>
              </div>
              <div className="flex items-start">
                <DocumentTextIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className={`text-sm text-slate-700 dark:text-slate-300 ${!expanded ? 'line-clamp-2' : ''}`}>{booking.purpose}</p>
              </div>
            </div>

            {/* ขวา: รูปรถ */}
            <div className="relative w-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0 bg-slate-50 dark:bg-slate-700/30 flex items-center justify-center self-stretch">
              {booking.carPhotoUrl && booking.carPhotoUrl.trim() ? (
                <Image
                  src={booking.carPhotoUrl}
                  alt={booking.carLicensePlate || 'รถ'}
                  fill
                  sizes="96px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <TruckIcon className="h-8 w-8 text-slate-300 dark:text-slate-500" />
              )}
            </div>
          </div>

          {/* ข้อมูลการเดินทาง */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{booking.travelers} คน</span>
            </div>
            
            <div className="flex items-center">
              <TruckIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{booking.carLicensePlate || '-'}</span>
            </div>
            
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(booking.departureDate)}</span>
            </div>
            
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatTime(booking.departureTime)} น.</span>
            </div>
            
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(booking.returnDate)}</span>
            </div>
            
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatTime(booking.returnTime)} น.</span>
            </div>
          </div>
          
          {/* คนขับรถ */}
          {booking.driverName && (
            <div className="flex items-center mb-3">
              <UserIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 mr-2" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{booking.driverName}</span>
              {isSelfDriving && (
                <span className="ml-2 text-xs text-success-600 dark:text-success-400 font-medium">(ขับรถเอง)</span>
              )}
            </div>
          )}
          
          {/* หมายเหตุ (ถ้ามี) */}
          {booking.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg mb-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">หมายเหตุ</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{booking.notes}</p>
            </div>
          )}
          
          {/* หมายเหตุการอนุมัติ (ถ้ามี) - แสดงเมื่อกดขยาย */}
          {expanded && booking.approvalNotes && (
            <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <div className="flex items-start">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-warning-600 dark:text-warning-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-xs text-warning-700 dark:text-warning-300 font-medium">หมายเหตุการอนุมัติ</p>
                  <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">{booking.approvalNotes}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* ส่วนแสดงการนับถอยหลังที่เห็นชัดเจน */}
          {timeRemaining && (hasEvaluated || isSelfDriving) && adminView && (
            <div className="mt-2 bg-blue-50 dark:bg-blue-800/30 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center">
                <div className="relative w-12 h-12 mr-3">
                  {/* วงกลมภายนอก */}
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-700"></div>
                  
                  {/* วงกลมนับถอยหลัง */}
                  <svg className="absolute inset-0 -rotate-90 w-full h-full">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="transparent"
                      className="text-blue-500 dark:text-blue-400"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - (timeRemaining.minutes * 60 + timeRemaining.seconds) / (successTimeout * 60))}
                    />
                  </svg>
                  
                  {/* เวลาแสดงตรงกลาง */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      {Math.floor(timeRemaining.minutes)}:{timeRemaining.seconds.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    เวลาที่เหลือ
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {formatTimeRemaining()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* ส่วนท้ายของการ์ด มีปุ่มดำเนินการ */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 flex flex-wrap justify-between items-center gap-2">
          <div className="flex space-x-2">
            {/* แสดงปุ่มประเมินเฉพาะเมื่อมีเงื่อนไขพร้อมและไม่ใช่กรณีขับเอง */}
            {(canEvaluate && !hasEvaluated) || (adminView && canEvaluate && !hasEvaluated) ? (
              <Button
                size="xs"
                variant="primary"
                onClick={() => setIsSurveyModalOpen(true)}
                icon={<ChartBarIcon className="h-4 w-4" />}
                className="relative z-30"
              >
                ประเมินความพึงพอใจ
              </Button>
            ) : null}
            
            {/* แสดงป้ายประเมินแล้ว */}
            {hasEvaluated && !isSelfDriving && !adminView && (
              <div className="flex flex-col space-y-1">
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300">
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  ประเมินแล้ว
                </span>
              </div>
            )}
            
            {/* แสดงป้ายขับรถเอง */}
            {isSelfDriving && booking.approvalStatus === 'approved' && !adminView && (
              <div className="flex flex-col space-y-1">
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300">
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  ขับรถเอง (นับถอยหลัง)
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-full transition-colors z-20 ${expanded ? 'bg-slate-200 dark:bg-slate-700 z-20' : ''}`}
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? 'transform rotate-180' : ''}`} />
            </button>
            
            <Button
              size="xs"
              variant="secondary"
              onClick={() => window.open(`/print/${booking.id}`, '_blank')}
              icon={<PrinterIcon className="h-4 w-4" />}
              className="z-20"
            >
              พิมพ์
            </Button>
          </div>
        </div>
        
        {/* แสดงเวลานับถอยหลังแบบวงกลมทั้งเวลา (อีกรูปแบบ) */}
        {shouldShowCountdown() && (
          <div className="absolute bottom-14 right-4 z-20">
            <div className="relative flex items-center justify-center w-10 h-10">
              {/* วงกลมรอบนอก */}
              <div className="absolute inset-0 rounded-full border-2 border-accent-200 dark:border-accent-700 opacity-40"></div>
              
              {/* วงกลมนับถอยหลัง */}
              <svg className="absolute inset-0 -rotate-90 w-full h-full">
                <circle
                  cx="20"
                  cy="20"
                  r="9"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="transparent"
                  className={`${isSelfDriving ? 'text-success-500 dark:text-success-400' : 'text-accent-500 dark:text-accent-400'}`}
                  strokeDasharray={2 * Math.PI * 9}
                  strokeDashoffset={timeRemaining ? 2 * Math.PI * 9 * (1 - (timeRemaining.minutes * 60 + timeRemaining.seconds) / (successTimeout * 60)) : 0}
                />
              </svg>
              
              {/* เวลาที่เหลือแสดงตรงกลาง */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-medium ${isSelfDriving ? 'text-success-700 dark:text-success-300' : 'text-accent-700 dark:text-accent-300'}`}>
                  {timeRemaining ? `${timeRemaining.minutes}:${timeRemaining.seconds.toString().padStart(2, '0')}` : '0:00'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal แก้ไขข้อมูลการจอง */}
      {!readOnly && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="จัดการข้อมูลการจองรถ"
          size="lg"
        >
          <div className="space-y-6 p-4">
            {errorMessage && (
              <div className="bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 px-4 py-3 rounded-lg mb-4 flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">เกิดข้อผิดพลาด</p>
                  <p className="text-sm">{errorMessage}</p>
                </div>
              </div>
            )}
            
            {/* Admin สามารถแก้ไขได้ทุกส่วน */}
            {(canEditCarDriver || adminView) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รถ</label>
                    <ImageSelect
                      value={selectedCar}
                      onChange={setSelectedCar}
                      placeholder="เลือกรถ"
                      disabled={isSubmitting}
                      fallbackIcon={<TruckIcon className="w-full h-full" />}
                      options={[
                        { value: '', label: 'เลือกรถ' },
                        ...cars.map(car => ({ value: car.id.toString(), label: car.licensePlate, imageUrl: car.photoUrl })),
                        { value: '8', label: 'ยกเลิก' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">พนักงานขับรถ</label>
                    <ImageSelect
                      value={selectedDriver}
                      onChange={setSelectedDriver}
                      placeholder="เลือกพนักงานขับรถ"
                      disabled={isSubmitting}
                      fallbackIcon={<UserIcon className="w-full h-full" />}
                      options={[
                        { value: '', label: 'เลือกพนักงานขับรถ' },
                        ...drivers.map(d => ({ value: d.id.toString(), label: d.name, imageUrl: d.photoUrl })),
                        { value: '5', label: 'ยกเลิก' },
                      ]}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">หมายเหตุ</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-slate-800 dark:text-white"
                    placeholder="บันทึกหมายเหตุ (ถ้ามี)"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
            
            {/* ส่วนการอนุมัติ */}
            {(canEditApproval || adminView) && (
              <>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">สถานะการอนุมัติ</label>
                  <div className="mt-2 space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="approval"
                        value="approved"
                        checked={approvalStatus === 'approved'}
                        onChange={() => setApprovalStatus('approved')}
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                        disabled={isSubmitting}
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">อนุมัติ</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="approval"
                        value="rejected"
                        checked={approvalStatus === 'rejected'}
                        onChange={() => setApprovalStatus('rejected')}
                        className="focus:ring-danger-500 h-4 w-4 text-danger-600 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                        disabled={isSubmitting}
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">ไม่อนุมัติ</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="approval"
                        value="pending"
                        checked={approvalStatus === 'pending'}
                        onChange={() => setApprovalStatus('pending')}
                        className="focus:ring-warning-500 h-4 w-4 text-warning-600 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                        disabled={isSubmitting}
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">รออนุมัติ</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="approvalNotes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">หมายเหตุการอนุมัติ</label>
                  <textarea
                    id="approvalNotes"
                    rows={3}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-slate-800 dark:text-white"
                    placeholder="บันทึกหมายเหตุการอนุมัติ (ถ้ามี)"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveChanges}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                บันทึก
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal แบบประเมินความพึงพอใจ - เปิดได้ไม่ว่าจะมีการล็อกอินหรือไม่ */}
      <Modal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        title="แบบประเมินความพึงพอใจในการใช้รถ"
        size="lg"
      >
        {errorMessage && (
          <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 rounded-lg">
            <p className="text-sm text-danger-600 dark:text-danger-400 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              {errorMessage}
            </p>
          </div>
        )}
        
        <SurveyForm
          bookingId={booking.id}
          bookingNumber={booking.bookingNumber}
          onSubmit={handleSubmitSurvey}
          onCancel={() => setIsSurveyModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </>
  );
};

export default BookingCard;