'use client';

import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import LoginForm from '../auth/LoginForm';
import Modal from '../ui/Modal';
import { useAuth } from '../auth/AuthProvider';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleOpenLoginModal = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  if (!mounted) {
    return null; // Prevent hydration issues
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar 
        onLoginClick={handleOpenLoginModal}
        scrolled={scrolled}
      />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative">
        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-primary-600 animate-spin"></div>
              <div className="h-16 w-16 rounded-full border-r-4 border-l-4 border-transparent absolute top-0 animate-ping opacity-20"></div>
            </div>
          </div>
        ) : (
          <div className="fade-in">{children}</div>
        )}
      </main>
      <footer className="mt-10">
        <div className="flex justify-center">
          <button
            onClick={() => setFooterOpen(p => !p)}
            className="group flex items-center gap-1.5 px-4 py-2 text-[11px] text-slate-400 hover:text-slate-500 transition-colors"
          >
            <span className="w-8 h-px bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 transition-colors" />
            <span>{footerOpen ? 'ซ่อน' : 'เกี่ยวกับระบบ'}</span>
            <span className="w-8 h-px bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 transition-colors" />
          </button>
        </div>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${footerOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 py-6">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">VRDNK</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  &copy; {new Date().getFullYear()} ระบบจองรถสำนักงาน
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">
                  ศูนย์วิจัยและพัฒนาการสัตวแพทย์ภาคใต้ตอนบน
                </p>
                <p className="text-slate-300 dark:text-slate-600 text-[10px] mt-2">
                  พัฒนาโดย ทีมพัฒนาระบบ
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal เข้าสู่ระบบ */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={handleCloseLoginModal}
        title="เข้าสู่ระบบ"
        size="sm"
      >
        <LoginForm onSuccess={handleCloseLoginModal} />
      </Modal>
    </div>
  );
};

export default Layout;