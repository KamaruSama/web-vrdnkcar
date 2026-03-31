// src/types/index.ts

// ตำแหน่ง (Roles)
export type UserRole = 'admin' | 'driver' | 'approve' | 'user';

// สถานะการอนุมัติ
export type ApprovalStatus = 'approved' | 'rejected' | 'pending';

// ข้อมูลผู้ใช้
export interface User {
  id: number;
  username: string;
  name: string;
  position: string;
  role: UserRole;
  profilePicture?: string;
  showInRequesterList?: number; // 1 = แสดง, 0 = ไม่แสดง (SmallInt จาก Prisma)
}

// ข้อมูลรถ
export interface Car {
  id: number;
  licensePlate: string;
  photoUrl?: string;
}

// ข้อมูลพนักงานขับรถ
export interface Driver {
  id: number;
  name: string;
  photoUrl?: string;
}

// ข้อมูลการจอง
export interface Booking {
  id: number;
  bookingNumber: string;
  submissionDate: string;
  requesterId: number;
  requesterName: string;
  requesterPosition: string;
  requesterPhotoUrl?: string;
  destination: string;
  purpose: string;
  travelers: number;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  carId?: number;
  carLicensePlate?: string;
  carPhotoUrl?: string;
  driverId?: number;
  driverName?: string;
  driverPhotoUrl?: string;
  notes?: string;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
  hasEvaluated?: boolean;
  evaluatedTimestamp?: number | null;
}

// ข้อมูลแบบประเมิน
export interface Survey {
  id: number;
  bookingId: number;
  drivingRules: number;
  appropriateSpeed: number;
  politeDriving: number;
  servicePoliteness: number;
  missionUnderstanding: number;
  punctuality: number;
  travelPlanning: number;
  carSelection: number;
  carReadiness: number;
  carCleanliness: number;
  suggestions?: string;
}

// ข้อมูลกิจกรรม
export interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  details?: string;
  createdAt: string;
}