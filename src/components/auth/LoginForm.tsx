'use client';

import React, { useState } from 'react';
import Button from '../ui/Button';
import { useAuth } from './AuthProvider';
import { UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('กรุณาระบุชื่อผู้ใช้');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await login(username);
      
      // ถ้าสำเร็จ เรียกใช้ callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.log('Login error handled:', err.message);
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="inline-block p-3 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300 mb-4">
          <UserIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">ยินดีต้อนรับ</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">เข้าสู่ระบบเพื่อใช้งานเต็มรูปแบบ</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <UserIcon className="h-5 w-5 text-slate-400" />
          </div>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pl-10 block w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
            placeholder="ระบุชื่อผู้ใช้"
            disabled={loading}
          />
        </div>
        
        {error && (
          <div className="p-3 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 rounded-lg">
            <p className="text-sm text-danger-600 dark:text-danger-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}
        
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
          loading={loading}
          icon={<ArrowRightIcon className="h-5 w-5" />}
          iconPosition="right"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </Button>
      </form>
      
      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">บัญชีทดสอบระบบ</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 text-center">
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">admin</span>
          </div>
          <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 text-center">
            <span className="text-xs font-medium text-success-600 dark:text-success-400">driver1</span>
          </div>
          <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 text-center">
            <span className="text-xs font-medium text-warning-600 dark:text-warning-400">approve1</span>
          </div>
          <div className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 text-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">user1</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 dark:text-slate-500">
          * ระบบนี้ใช้เพียงชื่อผู้ใช้ในการเข้าสู่ระบบ ไม่จำเป็นต้องใช้รหัสผ่าน
        </p>
      </div>
    </div>
  );
};

export default LoginForm;