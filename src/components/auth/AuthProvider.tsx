'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ตรวจสอบสถานะการล็อกอินเมื่อโหลดคอมโพเนนต์
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data.user);
      } catch {
        // ไม่แสดงข้อผิดพลาดใน console
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string) => {
    setLoading(true);
    
    try {
      // สร้าง Axios instance เพื่อจัดการกับข้อผิดพลาดได้ดีขึ้น
      const loginRequest = axios.create({
        validateStatus: function () {
          // ไม่ throw ข้อผิดพลาดสำหรับรหัสสถานะใดๆ เพื่อให้เราจัดการเอง
          return true;
        }
      });
      
      const response = await loginRequest.post('/api/auth/login', { username });
      
      // ตรวจสอบรหัสสถานะและตอบสนองตามนั้น
      if (response.status === 200 && response.data && response.data.user) {
        setUser(response.data.user);
        return;
      }
      
      // จัดการกับข้อผิดพลาดที่มีรหัสสถานะต่างๆ
      if (response.status === 404) {
        throw new Error('ไม่พบผู้ใช้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้');
      }
      
      if (response.status === 400) {
        throw new Error(response.data?.error || 'ข้อมูลไม่ถูกต้อง');
      }
      
      if (response.status >= 500) {
        throw new Error('เกิดข้อผิดพลาดบนเซิร์ฟเวอร์ กรุณาลองใหม่ภายหลัง');
      }
      
      // กรณีทั่วไปที่ไม่สามารถระบุได้
      throw new Error(response.data?.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      
    } catch (error) {
      // ส่งข้อผิดพลาดกลับไปให้ LoginForm จัดการโดยไม่แสดงใน console
      if (error instanceof Error) {
        throw error;
      }
      
      // กรณีที่ไม่ใช่ Error object
      throw new Error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await axios.post('/api/auth/logout');
      setUser(null);
    } catch {
      // ไม่แสดงข้อผิดพลาดใน console
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}