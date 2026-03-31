'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '@/types';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';

interface BookingFormProps {
  currentUser: User | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  forceShowRequesterDropdown?: boolean;
  users?: User[];
}

const BookingForm: React.FC<BookingFormProps> = ({
  currentUser,
  onSubmit,
  onCancel,
  isSubmitting = false,
  forceShowRequesterDropdown = false,
  users: initialUsers = [],
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const showRequesterDropdown = isAdmin || forceShowRequesterDropdown;
  
  // เพิ่ม state สำหรับเก็บรายการผู้ขอ
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  
  // สร้างวันที่ปัจจุบันในรูปแบบที่เหมาะสม
  const today = new Date();
  const currentDateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear() + 543}`;
  
  // สถานะข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    requesterId: currentUser?.id.toString() || '',
    submissionDate: currentDateStr,
    destination: '',
    purpose: '',
    travelers: 1,
    departureDate: today,
    departureTime: today,
    returnDate: today,
    returnTime: today,
  });
  
  // ดึงรายการผู้ขอจาก API
  const fetchUsers = async () => {
    if (!showRequesterDropdown || initialUsers.length > 0) return;
    
    try {
      setLoadingUsers(true);
      setUserError(null);
      
      // เพิ่มพารามิเตอร์ requesterOnly=true เพื่อให้ API กรองเฉพาะผู้ที่ควรแสดงในรายการผู้ขอ
      const response = await axios.get('/api/users?requesterOnly=true');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUserError('ไม่สามารถโหลดรายชื่อผู้ขอได้');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // ดึงข้อมูลผู้ขอเมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    fetchUsers();
  }, [showRequesterDropdown]);
  
  // เก็บข้อมูลตำแหน่งของผู้ขอที่เลือก
  const [selectedRequesterPosition, setSelectedRequesterPosition] = useState<string>('');
  
  // อัปเดตตำแหน่งเมื่อเลือกผู้ขอ
  useEffect(() => {
    if (formData.requesterId) {
      const selectedUser = users.find(user => user.id.toString() === formData.requesterId);
      if (selectedUser) {
        setSelectedRequesterPosition(selectedUser.position);
      } else {
        setSelectedRequesterPosition('');
      }
    } else {
      setSelectedRequesterPosition('');
    }
  }, [formData.requesterId, users]);
  
  // สถานะข้อผิดพลาด
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // จัดการการเปลี่ยนแปลงข้อมูลในฟอร์ม
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // ลบข้อผิดพลาดเมื่อมีการแก้ไข
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // จัดการการเปลี่ยนแปลงวันที่
  const handleDateChange = (date: Date | null, fieldName: string) => {
    if (date) {
      setFormData((prev) => ({ ...prev, [fieldName]: date }));
      
      // ลบข้อผิดพลาดเมื่อมีการแก้ไข
      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    }
  };
  
  // ตรวจสอบข้อมูลก่อนส่ง
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.requesterId) {
      newErrors.requesterId = 'กรุณาเลือกผู้ขอ';
    }
    
    if (!formData.destination.trim()) {
      newErrors.destination = 'กรุณาระบุสถานที่ไปราชการ';
    }
    
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'กรุณาระบุวัตถุประสงค์';
    }
    
    if (formData.travelers < 0) {
      newErrors.travelers = 'จำนวนผู้ร่วมเดินทางต้องไม่ติดลบ';
    }
    
    // ตรวจสอบวันที่และเวลา
    const departureDateTime = new Date(formData.departureDate);
    departureDateTime.setHours(formData.departureTime.getHours(), formData.departureTime.getMinutes());
    
    const returnDateTime = new Date(formData.returnDate);
    returnDateTime.setHours(formData.returnTime.getHours(), formData.returnTime.getMinutes());
    
    if (returnDateTime < departureDateTime) {
      newErrors.returnDate = 'วันเวลากลับต้องไม่น้อยกว่าวันเวลาไป';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // ส่งข้อมูลฟอร์ม
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // แปลงวันที่และเวลาให้อยู่ในรูปแบบที่ต้องการ
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
        return `${day}/${month}/${year}`;
      };
      
      const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      // ข้อมูลที่จะส่งไปยัง API
      const submissionData = {
        ...formData,
        departureDate: formatDate(formData.departureDate),
        departureTime: formatTime(formData.departureTime),
        returnDate: formatDate(formData.returnDate),
        returnTime: formatTime(formData.returnTime),
      };
      
      onSubmit(submissionData);
    }
  };

  // CSS สำหรับ DatePicker เพื่อให้ responsive และสวยงามในโหมด Dark
  const datePickerWrapperClass = "w-full relative";
  const datePickerClass = "w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base";
  
  // เพิ่ม class สำหรับ label ให้ชัดเจนในโหมด Dark
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  
  // เพิ่ม class สำหรับ input ให้ชัดเจนในโหมด Dark
  const inputClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white";
  
  // เพิ่ม class สำหรับ textarea ให้ชัดเจนในโหมด Dark
  const textareaClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white";
  
  // เพิ่ม class สำหรับ select ให้ชัดเจนในโหมด Dark
  const selectClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white";
  
  // เพิ่ม class สำหรับข้อความแสดงตำแหน่ง
  const positionTextClass = "mt-1 text-sm text-gray-600 dark:text-gray-400 break-words";
  
  // เพิ่ม class สำหรับพื้นที่แสดงผู้ขอแบบไม่ทำการแก้ไข
  const readOnlyContainerClass = "mt-1 p-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300 break-words";
  
  // เพิ่ม class สำหรับข้อความผิดพลาด
  const errorClass = "mt-1 text-sm text-red-600 dark:text-red-400";

  // เพิ่ม class สำหรับ container ของ input group ที่มี icon
  const inputGroupClass = "relative mt-1 flex items-center";

  // เพิ่ม class สำหรับ icon ใน input group
  const inputIconClass = "absolute left-3 text-gray-400 dark:text-gray-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 form-mobile-padding">
      <div className="grid grid-cols-1 gap-6">
        {showRequesterDropdown ? (
          <div>
            <label htmlFor="requesterId" className={labelClass}>
              ผู้ขอ *
            </label>
            {loadingUsers ? (
              <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full mr-2"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด...</span>
              </div>
            ) : (
              <>
                <select
                  id="requesterId"
                  name="requesterId"
                  value={formData.requesterId}
                  onChange={handleChange}
                  className={selectClass}
                  disabled={isSubmitting}
                >
                  <option value="">เลือกผู้ขอ</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                {userError && (
                  <p className={errorClass}>{userError}</p>
                )}
                {errors.requesterId && (
                  <p className={errorClass}>{errors.requesterId}</p>
                )}
                {/* แสดงตำแหน่งเมื่อมีการเลือกผู้ขอแล้ว */}
                {formData.requesterId && selectedRequesterPosition && (
                  <p className={positionTextClass}>ตำแหน่ง: {selectedRequesterPosition}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <label className={labelClass}>
              ผู้ขอ
            </label>
            <p className={readOnlyContainerClass}>
              {currentUser?.name}
            </p>
            <p className={positionTextClass}>ตำแหน่ง: {currentUser?.position}</p>
          </div>
        )}
        
        <div>
          <label className={labelClass}>
            วันที่ยื่นคำขอ
          </label>
          <p className={readOnlyContainerClass}>
            {formData.submissionDate}
          </p>
        </div>
        
        <div>
          <label htmlFor="destination" className={labelClass}>
            ไปราชการที่ *
          </label>
          <input
            type="text"
            name="destination"
            id="destination"
            value={formData.destination}
            onChange={handleChange}
            className={inputClass}
            placeholder="ระบุสถานที่ไปราชการ"
            disabled={isSubmitting}
          />
          {errors.destination && (
            <p className={errorClass}>{errors.destination}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="purpose" className={labelClass}>
            เพื่อ *
          </label>
          <textarea
            name="purpose"
            id="purpose"
            rows={2}
            value={formData.purpose}
            onChange={handleChange}
            className={textareaClass}
            placeholder="ระบุวัตถุประสงค์ของการเดินทาง"
            disabled={isSubmitting}
          />
          {errors.purpose && (
            <p className={errorClass}>{errors.purpose}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="travelers" className={labelClass}>
            จำนวนผู้ร่วมเดินทาง *
          </label>
          <input
            type="number"
            name="travelers"
            id="travelers"
            min="0"
            value={formData.travelers}
            onChange={handleChange}
            className={inputClass}
            disabled={isSubmitting}
          />
          {errors.travelers && (
            <p className={errorClass}>{errors.travelers}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="departureDate" className={labelClass}>
              วันที่ไป *
            </label>
            <div className={inputGroupClass}>
              <CalendarIcon className={`${inputIconClass} h-5 w-5`} />
              <div className={datePickerWrapperClass}>
                <ReactDatePicker
                  id="departureDate"
                  selected={formData.departureDate}
                  onChange={(date) => handleDateChange(date, 'departureDate')}
                  dateFormat="dd/MM/yyyy"
                  minDate={new Date()}
                  className={`${datePickerClass} pl-10`}
                  disabled={isSubmitting}
                  wrapperClassName="w-full"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="departureTime" className={labelClass}>
              เวลาไป *
            </label>
            <div className={inputGroupClass}>
              <ClockIcon className={`${inputIconClass} h-5 w-5`} />
              <div className={datePickerWrapperClass}>
                <ReactDatePicker
                  id="departureTime"
                  selected={formData.departureTime}
                  onChange={(date) => handleDateChange(date, 'departureTime')}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="เวลา"
                  dateFormat="HH:mm"
                  className={`${datePickerClass} pl-10`}
                  disabled={isSubmitting}
                  wrapperClassName="w-full"
                  popperPlacement="top-end"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="returnDate" className={labelClass}>
              วันที่กลับ *
            </label>
            <div className={inputGroupClass}>
              <CalendarIcon className={`${inputIconClass} h-5 w-5`} />
              <div className={datePickerWrapperClass}>
                <ReactDatePicker
                  id="returnDate"
                  selected={formData.returnDate}
                  onChange={(date) => handleDateChange(date, 'returnDate')}
                  dateFormat="dd/MM/yyyy"
                  minDate={formData.departureDate}
                  className={`${datePickerClass} pl-10`}
                  disabled={isSubmitting}
                  wrapperClassName="w-full"
                />
              </div>
            </div>
            {errors.returnDate && (
              <p className={errorClass}>{errors.returnDate}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="returnTime" className={labelClass}>
              เวลากลับ *
            </label>
            <div className={inputGroupClass}>
              <ClockIcon className={`${inputIconClass} h-5 w-5`} />
              <div className={datePickerWrapperClass}>
                <ReactDatePicker
                  id="returnTime"
                  selected={formData.returnTime}
                  onChange={(date) => handleDateChange(date, 'returnTime')}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="เวลา"
                  dateFormat="HH:mm"
                  className={`${datePickerClass} pl-10`}
                  disabled={isSubmitting}
                  wrapperClassName="w-full"
                  popperPlacement="top-end"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 mobile-friendly"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 mobile-friendly"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              กำลังบันทึก...
            </>
          ) : 'บันทึกคำขอ'}
        </button>
      </div>
    </form>
  );
};

export default BookingForm;