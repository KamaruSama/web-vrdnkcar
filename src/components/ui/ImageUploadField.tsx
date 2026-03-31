'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpTrayIcon, LinkIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';
import CropModal from './CropModal';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** Called with the uploaded URL right after a successful upload (before save) */
  onUploaded?: (url: string) => void;
  disabled?: boolean;
  label?: string;
  /** Fallback icon when no image (default: UserIcon) */
  placeholder?: React.ReactNode;
  /** Crop shape: "round" for avatars, "rect" for cars/objects (default: "round") */
  cropShape?: 'round' | 'rect';
  /** Aspect ratio for cropping (default: 1 for round, 4/3 for rect) */
  cropAspect?: number;
}

export default function ImageUploadField({
  value,
  onChange,
  onUploaded,
  disabled = false,
  label = 'รูปภาพ',
  placeholder,
  cropShape = 'round',
  cropAspect,
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'preview' | 'url'>('preview');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const uploadBlob = async (blob: Blob) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'อัปโหลดไม่สำเร็จ');
      onChange(data.url);
      onUploaded?.(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('รองรับเฉพาะ JPEG, PNG, GIF, WEBP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('ขนาดไฟล์เกิน 10MB');
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    await uploadBlob(blob);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const applyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setUrlInput('');
    setMode('preview');
  };

  const remove = () => {
    onChange('');
    setMode('preview');
    setUrlInput('');
    setError(null);
  };

  const fallback = placeholder ?? <UserIcon className="h-8 w-8 text-gray-400" />;

  return (
    <>
      <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

        <div className="flex items-start gap-4">
          {/* Avatar preview */}
          <div className={`relative overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 ${cropShape === 'round' ? 'h-20 w-20 rounded-full' : 'h-24 w-[72px] rounded-lg'}`}>
            {value ? (
              <Image src={value} alt="preview" fill style={{ objectFit: 'cover' }} />
            ) : uploading ? (
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              fallback
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-2">
            {mode === 'url' ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyUrl()}
                  placeholder="https://example.com/image.jpg"
                  disabled={disabled}
                  className="flex-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  autoFocus
                />
                <button type="button" onClick={applyUrl} disabled={disabled || !urlInput.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  ใช้
                </button>
                <button type="button" onClick={() => { setMode('preview'); setUrlInput(''); setError(null); }} disabled={disabled}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled || uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                  {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
                </button>
                <button type="button" onClick={() => { setMode('url'); setError(null); }} disabled={disabled || uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <LinkIcon className="h-3.5 w-3.5" />
                  ใช้ URL
                </button>
                {value && (
                  <button type="button" onClick={remove} disabled={disabled || uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <TrashIcon className="h-3.5 w-3.5" />
                    ลบรูป
                  </button>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
            <p className="text-xs text-gray-400">JPEG, PNG, GIF, WEBP · สูงสุด 10MB · จะ crop ก่อนอัปโหลด</p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFile} className="hidden" />
      </div>

      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          cropShape={cropShape}
          aspect={cropAspect}
        />
      )}
    </>
  );
}
