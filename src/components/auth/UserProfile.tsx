import React, { useState, useRef, useEffect } from 'react';
import { User } from '@/types';
import Button from '../ui/Button';
import Image from 'next/image';
import { UserIcon, CameraIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { translateRole } from '@/lib/utils';

interface UserProfileProps {
  user: User;
  onUpdate?: (user: Partial<User>) => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
  user, 
  onUpdate,
  readOnly = false,
  isLoading = false
}) => {
  const [name, setName] = useState(user.name);
  const [position, setPosition] = useState(user.position);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>(user.profilePicture || undefined);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUrlInputVisible, setIsUrlInputVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when user prop changes
  useEffect(() => {
    setName(user.name);
    setPosition(user.position);
    setProfileImage(user.profilePicture || undefined);
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (onUpdate) {
      const updates: Partial<User> = {
        name,
        position
      };
      
      // Only include profilePicture if it has changed
      if (profileImage !== user.profilePicture) {
        updates.profilePicture = profileImage;
      }
      
      onUpdate(updates);
    }
    
    setIsEditing(false);
  };

  const handleImageClick = () => {
    if (readOnly || isLoading) return;
    fileInputRef.current?.click();
  };

  // ฟังก์ชันใหม่สำหรับอัปโหลดรูปภาพผ่าน API
  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
      }
      
      return result.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setError(null);
    
    // ตรวจสอบประเภทไฟล์ (เฉพาะรูปภาพ)
    if (!file.type.startsWith('image/')) {
      setError('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }
    
    // จำกัดขนาดไฟล์ (ใช้ในการแสดงผลก่อนอัปโหลด)
    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 5MB กรุณาลดขนาดรูปภาพ หรือใช้ URL แทน');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // อัปโหลดรูปภาพผ่าน API ใหม่
      const imageUrl = await uploadImage(file);
      
      if (imageUrl) {
        // อัปเดตรูปภาพโปรไฟล์
        setProfileImage(imageUrl);
        
        // บันทึกรูปโปรไฟล์ทันทีหลังการเปลี่ยนแปลง
        if (onUpdate) {
          try {
            await onUpdate({
              profilePicture: imageUrl
            });
          } catch (error) {
            console.error('Error updating profile picture:', error);
            setError('เกิดข้อผิดพลาดในการบันทึกรูปโปรไฟล์');
            setProfileImage(user.profilePicture || undefined);
          }
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) {
      setError('กรุณาระบุ URL รูปภาพ');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // ตรวจสอบว่า URL เป็นรูปภาพจริงๆ
      const img = new window.Image();
      
      // สร้าง Promise สำหรับรอการโหลดรูป
      const imageLoadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('URL ไม่ถูกต้องหรือไม่ใช่รูปภาพ'));
        img.src = imageUrl;
      });
      
      await imageLoadPromise;
      
      // เมื่อโหลดรูปสำเร็จ ให้อัปเดตโปรไฟล์
      setProfileImage(imageUrl);
      
      // บันทึกรูปโปรไฟล์
      if (onUpdate) {
        await onUpdate({
          profilePicture: imageUrl
        });
      }
      
      setImageUrl('');
      setIsUrlInputVisible(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'URL ไม่ถูกต้องหรือไม่ใช่รูปภาพ');
    } finally {
      setIsUploading(false);
    }
  };

  const clearProfileImage = () => {
    setProfileImage(undefined);
    
    // บันทึกการลบรูปโปรไฟล์ทันที
    if (onUpdate) {
      onUpdate({
        profilePicture: undefined
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* รูปโปรไฟล์ */}
        <div className="flex-shrink-0 relative">
          <div 
            className={`w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 ${!readOnly && !isLoading ? 'cursor-pointer group' : ''}`}
            onClick={handleImageClick}
          >
            {profileImage && profileImage.trim() ? (
              <div className="relative w-full h-full">
                <Image
                  src={profileImage}
                  alt={user.name}
                  fill
                  sizes="128px"
                  style={{ objectFit: 'cover' }}
                  className="rounded-full"
                />
                {!readOnly && !isLoading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearProfileImage();
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="ลบรูปโปรไฟล์"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                <UserIcon className="h-16 w-16 text-gray-400" aria-hidden="true" />
              </div>
            )}
            
            {!readOnly && !isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <CameraIcon className="h-8 w-8 text-white" />
              </div>
            )}
            
            {(isUploading || isLoading) && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
          
          {/* Move file input outside of buttons container */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
            disabled={readOnly || isLoading || isUploading}
          />
          
          {!readOnly && !isLoading && (
            <div className="mt-2 flex justify-center z-10 relative">
              <button
                type="button"
                onClick={() => setIsUrlInputVisible(!isUrlInputVisible)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                disabled={isUploading}
              >
                <LinkIcon className="h-3 w-3 mr-1" />
                {isUrlInputVisible ? 'ซ่อนช่อง URL' : 'ใช้ URL รูปภาพ'}
              </button>
            </div>
          )}
          
          {!readOnly && !isLoading && isUrlInputVisible && (
            <div className="mt-2 z-10 relative">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="ใส่ URL รูปภาพ"
                className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="mt-1 w-full text-xs bg-blue-100 text-blue-700 py-1 px-2 rounded hover:bg-blue-200"
                disabled={isUploading}
              >
                ใช้ URL นี้
              </button>
            </div>
          )}
          
          {error && (
            <div className="mt-2 text-xs text-red-600 max-w-[200px] text-center">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  ตำแหน่ง
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    setName(user.name);
                    setPosition(user.position);
                    setProfileImage(user.profilePicture || undefined);
                    setIsEditing(false);
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-600 text-lg mt-1">{user.position}</p>
              <p className="text-sm text-blue-600 mt-2">บทบาท: {translateRole(user.role)}</p>
              <p className="text-sm text-gray-500 mt-1">ชื่อบัญชี: {user.username}</p>
              
              {!readOnly && onUpdate && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  แก้ไขข้อมูล
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;