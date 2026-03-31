// src/lib/utils.ts (fixed version)
// ฟังก์ชันสำหรับแปลงรูปแบบวันที่
export function formatDate(dateString: string): string {
  // ตรวจสอบว่าเป็นรูปแบบ "dd/mm/yyyy" หรือไม่
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // หากเป็นรูปแบบอื่น ๆ ให้แปลงเป็น "dd/mm/yyyy"
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

// ฟังก์ชันสำหรับแปลงรูปแบบเวลา
export function formatTime(timeString: string): string {
  // ตรวจสอบว่าเป็นรูปแบบ "hh:mm" หรือไม่
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  
  // หากเป็นรูปแบบอื่น ๆ ให้แปลงเป็น "hh:mm"
  try {
    const date = new Date(timeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
}

// ฟังก์ชันสำหรับสร้างเลขที่ใบขอใช้รถใหม่ (แก้ไขให้ใช้ ID แทนที่จะสุ่ม)
export function generateBookingNumber(id = 0): string {
  const currentYear = new Date().getFullYear() + 543; // แปลงเป็น พ.ศ.
  const number = id.toString().padStart(4, '0');
  
  return `CAR-${currentYear}-${number}`;
}

// ฟังก์ชันสำหรับแปลงบทบาทเป็นข้อความภาษาไทย
export function translateRole(role: string): string {
  switch (role) {
    case 'admin':
      return 'ผู้ดูแลระบบ';
    case 'driver':
      return 'พนักงานขับรถ';
    case 'approve':
      return 'ผู้อนุมัติ';
    case 'user':
      return 'ผู้ใช้ทั่วไป';
    default:
      return 'ผู้ใช้ทั่วไป';
  }
}

// ฟังก์ชันสำหรับแปลงสถานะการอนุมัติเป็นข้อความภาษาไทย
export function translateApprovalStatus(status: string): string {
  switch (status) {
    case 'approved':
      return 'อนุมัติแล้ว';
    case 'rejected':
      return 'ไม่อนุมัติ';
    case 'pending':
      return 'รออนุมัติ';
    default:
      return 'รออนุมัติ';
  }
}