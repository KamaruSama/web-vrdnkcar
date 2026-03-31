'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface ImageSelectOption {
  value: string;
  label: string;
  imageUrl?: string;
  /** Fallback icon when no image */
  icon?: React.ReactNode;
}

interface ImageSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ImageSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** pill style (small, rounded-full) vs default (normal form select) */
  variant?: 'default' | 'pill';
  /** Fallback icon for options without images */
  fallbackIcon?: React.ReactNode;
}

export default function ImageSelect({
  value,
  onChange,
  options,
  placeholder = 'เลือก...',
  disabled = false,
  className = '',
  variant = 'default',
  fallbackIcon,
}: ImageSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, openUp: false });

  const selected = options.find(o => o.value === value);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const dropdownHeight = Math.min(options.length * 40, 240); // max-h-60 = 240px
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < dropdownHeight && rect.top > spaceBelow;
      setDropdownPos({
        top: openUp ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 180),
        openUp,
      });
    }
  }, [options.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  const isPill = variant === 'pill';
  const hasValue = value && value !== 'all' && value !== '';

  const btnClass = isPill
    ? `flex items-center gap-1.5 appearance-none rounded-full cursor-pointer border-none outline-none text-xs font-medium px-3 h-[26px] min-w-[140px] ${hasValue ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`
    : `flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 ${className}`;

  const Thumb = ({ src, icon, size = 'sm' }: { src?: string; icon?: React.ReactNode; size?: 'sm' | 'xs' }) => {
    const s = size === 'xs' ? 'w-4 h-4' : 'w-5 h-5';
    if (src) {
      return (
        <div className={`relative ${s} rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600`}>
          <Image src={src} alt="" fill sizes="20px" style={{ objectFit: 'cover' }} />
        </div>
      );
    }
    if (icon) return <span className={`${s} flex items-center justify-center shrink-0 opacity-40`}>{icon}</span>;
    return null;
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={btnClass}
      >
        {selected ? (
          <>
            <Thumb src={selected.imageUrl} icon={selected.icon || fallbackIcon} size={isPill ? 'xs' : 'sm'} />
            <span className="truncate flex-1 text-left">{selected.label}</span>
          </>
        ) : (
          <span className="truncate flex-1 text-left opacity-60">{placeholder}</span>
        )}
        <ChevronDownIcon className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${isPill && hasValue ? 'text-white/70' : 'text-gray-400'}`} />
      </button>

      {open && createPortal(
        <div ref={dropdownRef} className="fixed z-[100] max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors ${opt.value === value ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
            >
              <Thumb src={opt.imageUrl} icon={opt.icon || fallbackIcon} />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
