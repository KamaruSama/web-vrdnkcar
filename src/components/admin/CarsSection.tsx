'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { Car } from '@/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon, TruckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { SectionToolbar, Pagination, type ViewMode } from './SectionToolbar';
import ImageUploadField from '@/components/ui/ImageUploadField';

export default function CarsSection() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({ licensePlate: '', photoUrl: '' });
  const [pendingUpload, setPendingUpload] = useState<string | null>(null);
  const pendingUploadRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const discardPendingUpload = async () => {
    const url = pendingUploadRef.current;
    if (url) {
      pendingUploadRef.current = null; setPendingUpload(null);
      await fetch('/api/upload', { method: 'DELETE', body: JSON.stringify({ fileUrl: url }), headers: { 'Content-Type': 'application/json' } });
    }
  };

  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const fetchCars = async () => {
    try { setLoading(true); setError(null); const r = await axios.get('/api/car'); setCars(r.data.cars || []); }
    catch { setError('ไม่สามารถโหลดข้อมูลรถได้'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchCars(); }, []);

  const handleAdd = async () => {
    if (!formData.licensePlate.trim()) { setError('กรุณากรอกเลขทะเบียนรถ'); return; }
    try {
      setIsSubmitting(true); setError(null);
      await axios.post('/api/car', formData);
      pendingUploadRef.current = null; setPendingUpload(null);
      setFormData({ licensePlate: '', photoUrl: '' }); setIsAddOpen(false); fetchCars();
    } catch (err: any) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
    finally { setIsSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!selectedCar || !formData.licensePlate.trim()) { setError('กรุณากรอกเลขทะเบียนรถ'); return; }
    try {
      setIsSubmitting(true); setError(null);
      await axios.put(`/api/car/${selectedCar.id}`, formData);
      pendingUploadRef.current = null; setPendingUpload(null);
      setIsEditOpen(false); fetchCars();
    } catch (err: any) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedCar) return;
    try {
      setIsSubmitting(true); setError(null);
      await axios.delete(`/api/car/${selectedCar.id}`);
      setIsDeleteOpen(false); fetchCars();
    } catch (err: any) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
    finally { setIsSubmitting(false); }
  };

  const openEdit = (c: Car) => { setSelectedCar(c); setFormData({ licensePlate: c.licensePlate, photoUrl: c.photoUrl || '' }); setIsEditOpen(true); };
  const openDelete = (c: Car) => { setSelectedCar(c); setIsDeleteOpen(true); };

  const filtered = search ? cars.filter(c => c.licensePlate.toLowerCase().includes(search.toLowerCase())) : cars;
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const inputCls = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm';

  const Avatar = ({ c, size = 'sm' }: { c: Car; size?: 'sm' | 'lg' }) => {
    const cls = size === 'lg' ? 'h-20 w-20' : 'h-9 w-9';
    return c.photoUrl?.trim() ? (
      <div className={`relative ${cls} rounded-lg overflow-hidden border border-gray-200 shrink-0`}>
        <Image src={c.photoUrl} alt={c.licensePlate} fill style={{ objectFit: 'cover' }} />
      </div>
    ) : (
      <div className={`${cls} rounded-lg bg-emerald-50 flex items-center justify-center shrink-0`}>
        <TruckIcon className={size === 'lg' ? 'h-9 w-9 text-emerald-400' : 'h-5 w-5 text-emerald-600'} />
      </div>
    );
  };

  const actions = (c: Car) => (
    <div className="flex justify-end gap-1">
      <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="h-4 w-4" /></button>
      <button onClick={() => openDelete(c)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><TrashIcon className="h-4 w-4" /></button>
    </div>
  );

  if (loading) return <div className="py-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="space-y-3">
      <SectionToolbar
        view={view} onView={setView}
        rightSlot={
          <Button variant="primary" size="sm" icon={<PlusIcon className="h-4 w-4 mr-1" />}
            onClick={() => { setFormData({ licensePlate: '', photoUrl: '' }); setIsAddOpen(true); }}>
            เพิ่มรถใหม่
          </Button>
        }
      />

      {error && <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-sm text-red-600">{error}</div>}

      {/* Mobile layout */}
      <div className="sm:hidden space-y-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="ค้นหาทะเบียน..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 bg-white" />
        </div>
        {search && <p className="text-[11px] text-gray-400">พบ {filtered.length} รายการ</p>}
        {paged.length > 0 ? paged.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 active:bg-gray-50">
            <Avatar c={c} size="sm" />
            <span className="text-sm font-semibold text-gray-900 flex-1">{c.licensePlate}</span>
            {actions(c)}
          </div>
        )) : <div className="text-center py-8 text-gray-400 text-sm">ไม่พบข้อมูลรถ</div>}
      </div>

      {/* Desktop filter bar */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="ค้นหาทะเบียน..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-44 pl-7 pr-2 h-7 text-xs rounded-md border border-gray-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" />
        </div>
        {search && <span className="text-[11px] text-gray-400">{filtered.length} รายการ</span>}
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:block">
        {view === 'card' && (
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
            {paged.length > 0 ? paged.map(c => (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
                <div className="flex justify-center mb-2">
                  <Avatar c={c} size="lg" />
                </div>
                <p className="text-sm font-semibold text-center text-gray-900 mb-2">{c.licensePlate}</p>
                <div className="flex justify-center">{actions(c)}</div>
              </div>
            )) : <div className="col-span-full text-center py-8 text-gray-400 text-sm">ไม่พบข้อมูลรถ</div>}
          </div>
        )}
        {view === 'list' && (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-4 text-left text-sm font-semibold text-gray-600">รูปภาพ</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">ทะเบียนรถ</th>
                  <th className="py-3 pr-4 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paged.length > 0 ? paged.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3 pl-4"><Avatar c={c} size="sm" /></td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">{c.licensePlate}</td>
                    <td className="py-3.5 pr-4 text-right">{actions(c)}</td>
                  </tr>
                )) : <tr><td colSpan={3} className="py-10 text-center text-gray-400">ไม่พบข้อมูลรถ</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />

      <Modal isOpen={isAddOpen} onClose={async () => { await discardPendingUpload(); setIsAddOpen(false); }} title="เพิ่มรถใหม่">
        <div className="space-y-3 p-4">
          {error && isAddOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700">ทะเบียนรถ *</label><input value={formData.licensePlate} onChange={e => setFormData(p => ({ ...p, licensePlate: e.target.value }))} className={inputCls} placeholder="เช่น กธ-2321" disabled={isSubmitting} /></div>
          <ImageUploadField
            label="รูปภาพรถ (ถ้ามี)"
            value={formData.photoUrl}
            onChange={url => setFormData(p => ({ ...p, photoUrl: url }))}
            onUploaded={url => { pendingUploadRef.current = url; setPendingUpload(url); }}
            disabled={isSubmitting}
            placeholder={<TruckIcon className="h-8 w-8 text-gray-400" />}
            cropShape="rect"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={async () => { await discardPendingUpload(); setIsAddOpen(false); }} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="primary" onClick={handleAdd} disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={async () => { await discardPendingUpload(); setIsEditOpen(false); }} title="แก้ไขข้อมูลรถ">
        <div className="space-y-3 p-4">
          {error && isEditOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700">ทะเบียนรถ *</label><input value={formData.licensePlate} onChange={e => setFormData(p => ({ ...p, licensePlate: e.target.value }))} className={inputCls} disabled={isSubmitting} /></div>
          <ImageUploadField
            label="รูปภาพรถ (ถ้ามี)"
            value={formData.photoUrl}
            onChange={url => setFormData(p => ({ ...p, photoUrl: url }))}
            onUploaded={url => { pendingUploadRef.current = url; setPendingUpload(url); }}
            disabled={isSubmitting}
            placeholder={<TruckIcon className="h-8 w-8 text-gray-400" />}
            cropShape="rect"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={async () => { await discardPendingUpload(); setIsEditOpen(false); }} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="primary" onClick={handleEdit} disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="ยืนยันการลบรถ">
        <div className="space-y-3 p-4">
          {error && isDeleteOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <p className="text-sm">ต้องการลบรถทะเบียน <strong>{selectedCar?.licensePlate}</strong> ใช่หรือไม่?</p>
          <p className="text-xs text-red-500">ไม่สามารถลบรถที่มีการจองอยู่ในระบบได้</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? 'กำลังลบ...' : 'ยืนยันการลบ'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
