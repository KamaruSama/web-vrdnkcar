'use client';

import React, { useState } from 'react';
import Button from '../ui/Button';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface SurveyFormProps {
  bookingId: number;
  bookingNumber: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface SurveyCategory {
  id: string;
  label: string;
  value: number;
}

interface SurveyFormData {
  [key: string]: number | string;
  suggestions: string;
}

const SurveyForm: React.FC<SurveyFormProps> = ({
  bookingId,
  bookingNumber,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  // กำหนดหมวดหมู่คำถามของแบบประเมิน
  const surveyCategories: SurveyCategory[] = [
    { id: 'drivingRules', label: 'ขับขี่ตามกฎจราจร', value: 3 },
    { id: 'appropriateSpeed', label: 'ใช้ความเร็วอย่างเหมาะสม', value: 3 },
    { id: 'politeDriving', label: 'ขับขี่รถอย่างสุภาพ', value: 3 },
    { id: 'servicePoliteness', label: 'ความสุภาพในการให้บริการของพนักงานขับรถยนต์', value: 3 },
    { id: 'missionUnderstanding', label: 'พนักงานขับรถยนต์มีความเข้าใจในภารกิจและมีการเตรียมความพร้อมในการปฏิบัติงานอย่างเหมาะสม', value: 3 },
    { id: 'punctuality', label: 'ตรงต่อเวลา', value: 3 },
    { id: 'travelPlanning', label: 'มีการวางแผนการเดินทางอย่างเหมาะสม', value: 3 },
    { id: 'carSelection', label: 'เลือกใช้รถยนต์เหมาะสมกับภารกิจ', value: 3 },
    { id: 'carReadiness', label: 'ความพร้อมของรถยนต์ (เช่น แอร์ น้ำมัน ลมยาง อื่นๆ)', value: 3 },
    { id: 'carCleanliness', label: 'ความสะอาดของรถยนต์', value: 3 },
  ];
  
  const [formData, setFormData] = useState<SurveyFormData>({
    ...Object.fromEntries(surveyCategories.map(cat => [cat.id, cat.value])),
    suggestions: '',
  });
  
  const handleRatingChange = (field: string, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  // คำนวณคะแนนเฉลี่ย
  const calculateAverage = () => {
    const totalPoints = surveyCategories.reduce((sum, category) => sum + (formData[category.id] as number), 0);
    return (totalPoints / surveyCategories.length).toFixed(2);
  };
  
  // กำหนดสีตามระดับคะแนน
  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-success-500';
    if (rating >= 3) return 'text-primary-500';
    if (rating >= 2) return 'text-warning-500';
    return 'text-danger-500';
  };
  
  const getBackgroundColor = (currentValue: number, selectedValue: number) => {
    if (currentValue > selectedValue) return 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500';
    
    if (selectedValue >= 4) return 'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300';
    if (selectedValue >= 3) return 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300';
    if (selectedValue >= 2) return 'bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300';
    return 'bg-danger-100 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300';
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-2">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">เลขที่ใบขอใช้รถ</p>
        <p className="font-medium text-slate-900 dark:text-white">{bookingNumber}</p>
      </div>
      
      {/* Average Score Display */}
      <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg p-4 text-white flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">คะแนนเฉลี่ย</p>
          <p className="text-2xl font-bold">{calculateAverage()}</p>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="p-1">
              <StarSolidIcon className="h-6 w-6 text-white opacity-90" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-6">
        {surveyCategories.map((category) => (
          <div key={category.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {category.label}
            </label>
            <div className="flex flex-wrap gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingChange(category.id, rating)}
                  disabled={isSubmitting}
                  className={`
                    w-12 h-12 rounded-lg flex flex-col items-center justify-center
                    ${getBackgroundColor(rating, formData[category.id] as number)}
                    transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500
                  `}
                >
                  <span className="text-lg font-bold">{rating}</span>
                  <StarIcon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
              <span>น้อยที่สุด</span>
              <span>มากที่สุด</span>
            </div>
          </div>
        ))}
        
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <label htmlFor="suggestions" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ข้อเสนอแนะ
          </label>
          <textarea
            id="suggestions"
            name="suggestions"
            rows={4}
            value={formData.suggestions}
            onChange={handleTextChange}
            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-slate-700 dark:text-white"
            placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)"
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          loading={isSubmitting}
          icon={<StarSolidIcon className="h-4 w-4" />}
        >
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการประเมิน'}
        </Button>
      </div>
    </form>
  );
};

export default SurveyForm;