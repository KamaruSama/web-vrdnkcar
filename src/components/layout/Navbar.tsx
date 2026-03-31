'use client';

import { Fragment, useState, useEffect } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ChartBarIcon,
  HomeIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../auth/AuthProvider';
import { translateRole } from '@/lib/utils';

interface NavbarProps {
  onLoginClick?: () => void;
  scrolled?: boolean;
}

const getNavigation = (role?: string) => {
  const base = [
    { name: 'หน้าหลัก', href: '/', icon: HomeIcon },
    { name: 'ผลประเมิน', href: '/analytics', icon: ChartBarIcon },
  ];
  if (role === 'admin') {
    return [...base, { name: 'ผู้ดูแลระบบ', href: '/admin', icon: ShieldCheckIcon }];
  }
  return base;
};

const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const navItems = user ? getNavigation(user.role) : getNavigation();

  if (!mounted) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Disclosure as="nav" className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800">
      {({ open }) => (
        <>
          <div className="mx-auto container px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary-600 group-hover:bg-primary-700 transition-colors flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">VRDNK</span>
                  <span className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 font-normal">ระบบจองรถ</span>
                </div>
              </Link>

              {/* Desktop nav links */}
              <div className="hidden sm:flex items-center gap-0.5">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {item.name}
                      {active && (
                        <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary-500" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-1.5">
                {user ? (
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2.5 pl-2.5 pr-1.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                          {user.name.split(' ').slice(0, 2).join(' ')}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                          {translateRole(user.role)}
                        </p>
                      </div>
                      {user.profilePicture && user.profilePicture.trim() ? (
                        <Image
                          src={user.profilePicture}
                          alt="Profile"
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-primary-400 transition-all"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-primary-400 transition-all shrink-0">
                          {getInitials(user.name)}
                        </div>
                      )}
                    </Menu.Button>

                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user.position}</p>
                          <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                            {translateRole(user.role)}
                          </span>
                        </div>
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/profile"
                                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  active
                                    ? 'bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                โปรไฟล์ของฉัน
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => logout()}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  active
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                    : 'text-red-500 dark:text-red-400'
                                }`}
                              >
                                <ArrowRightOnRectangleIcon className="w-4 h-4 shrink-0" />
                                ออกจากระบบ
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <button
                    onClick={onLoginClick}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all"
                  >
                    เข้าสู่ระบบ
                  </button>
                )}

                {/* Mobile hamburger */}
                <Disclosure.Button className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors ml-1">
                  <span className="sr-only">{open ? 'ปิดเมนู' : 'เปิดเมนู'}</span>
                  {open ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <Disclosure.Panel className="sm:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-3 py-2 space-y-0.5">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Disclosure.Button
                    key={item.name}
                    as="a"
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </Disclosure.Button>
                );
              })}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Navbar;
