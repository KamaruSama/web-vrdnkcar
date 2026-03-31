'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { Driver } from '@/types';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardBody } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { SectionToolbar, Pagination, type ViewMode } from './SectionToolbar';
import ImageUploadField from '@/components/ui/ImageUploadField';

export default function DriversSection() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', photoUrl: '' });
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

  const fetchDrivers = async () => {
    try { setLoading(true); setError(null); const r = await axios.get('/api/drivers'); setDrivers(r.data.drivers || []); }
    catch { setError('ไม่สามารถโหลดข้อมูลพนักงานขับรถได้'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchDrivers(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    if (!formData.name.trim()) { setError('กรุณากรอกชื่อพนักงานขับรถ'); return; }
    try {
      setIsSubmitting(true); setError(null);
      await axios.post('/api/drivers', formData);
      pendingUploadRef.current = null; setPendingUpload(null);
      setFormData({ name: '', photoUrl: '' }); setIsAddOpen(false); fetchDrivers();
    } catch { setError('เกิดข้อผิดพลาดในการเพิ่มข้อมูล'); }
    finally { setIsSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!selectedDriver || !formData.name.trim()) { setError('กรุณากรอกชื่อ'); return; }
    try {
      setIsSubmitting(true); setError(null);
      await axios.put(`/api/drivers/${selectedDriver.id}`, formData);
      pendingUploadRef.current = null; setPendingUpload(null);
      setIsEditOpen(false); fetchDrivers();
    } catch { setError('เกิดข้อผิดพลาดในการแก้ไขข้อมูล'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedDriver) return;
    try {
      setIsSubmitting(true); setError(null);
      await axios.delete(`/api/drivers/${selectedDriver.id}`);
      setIsDeleteOpen(false); fetchDrivers();
    } catch (err: any) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
    finally { setIsSubmitting(false); }
  };

  const openEdit = (d: Driver) => { setSelectedDriver(d); setFormData({ name: d.name, photoUrl: d.photoUrl || '' }); setIsEditOpen(true); };
  const openDelete = (d: Driver) => { setSelectedDriver(d); setIsDeleteOpen(true); };

  const filtered = search ? drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : drivers;
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const inputCls = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm';

  const Avatar = ({ d, size = 'sm' }: { d: Driver; size?: 'sm' | 'lg' }) => {
    const cls = size === 'lg' ? 'h-20 w-20' : 'h-8 w-8';
    return d.photoUrl?.trim() ? (
      <div className={`relative ${cls} rounded-full overflow-hidden border border-gray-200 shrink-0`}>
        <Image src={d.photoUrl} alt={d.name} fill style={{ objectFit: 'cover' }} />
      </div>
    ) : (
      <div className={`${cls} rounded-full bg-gray-100 flex items-center justify-center shrink-0`}>
        <UserIcon className={size === 'lg' ? 'h-9 w-9 text-gray-400' : 'h-4 w-4 text-gray-400'} />
      </div>
    );
  };

  if (loading) return <div className="py-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="space-y-3">
      <SectionToolbar
        view={view} onView={setView}
        rightSlot={
          <Button variant="primary" size="sm" icon={<PlusIcon className="h-4 w-4 mr-1" />}
            onClick={() => { setFormData({ name: '', photoUrl: '' }); setIsAddOpen(true); }}>
            เพิ่มพนักงานใหม่
          </Button>
        }
      />

      {error && <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-sm text-red-600">{error}</div>}

      {/* Mobile layout */}
      <div className="sm:hidden space-y-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="ค้นหาชื่อ..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 bg-white" />
        </div>
        {search && <p className="text-[11px] text-gray-400">พบ {filtered.length} รายการ</p>}
        {paged.length > 0 ? paged.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 active:bg-gray-50">
            <Avatar d={d} size="sm" />
            <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">{d.name}</span>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><PencilIcon className="h-4 w-4" /></button>
              <button onClick={() => openDelete(d)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon className="h-4 w-4" /></button>
            </div>
          </div>
        )) : <div className="text-center py-8 text-gray-400 text-sm">ไม่พบข้อมูลพนักงานขับรถ</div>}
      </div>

      {/* Desktop filter bar */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="ค้นหาชื่อ..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-44 pl-7 pr-2 h-7 text-xs rounded-md border border-gray-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-400" />
        </div>
        {search && <span className="text-[11px] text-gray-400">{filtered.length} รายการ</span>}
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:block">
        {view === 'card' && (
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
            {paged.length > 0 ? paged.map(d => (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex justify-between items-center py-2 px-3">
                  <p className="font-medium text-sm truncate">{d.name}</p>
                  <div className="flex gap-0.5 shrink-0">
                    <button onClick={() => openEdit(d)} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="h-3.5 w-3.5" /></button>
                    <button onClick={() => openDelete(d)} className="p-1 text-red-600 hover:bg-red-100 rounded"><TrashIcon className="h-3.5 w-3.5" /></button>
                  </div>
                </CardHeader>
                <CardBody className="py-3 flex justify-center">
                  <Avatar d={d} size="lg" />
                </CardBody>
              </Card>
            )) : <div className="col-span-full text-center py-8 text-gray-400 text-sm">ไม่พบข้อมูลพนักงานขับรถ</div>}
          </div>
        )}
        {view === 'list' && (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-4 text-left text-sm font-semibold text-gray-600">รูปภาพ</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">ชื่อ-นามสกุล</th>
                  <th className="py-3 pr-4 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paged.length > 0 ? paged.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="py-3 pl-4"><Avatar d={d} size="sm" /></td>
                    <td className="py-3 px-4 font-medium text-gray-900">{d.name}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(d)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => openDelete(d)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={3} className="py-10 text-center text-gray-400">ไม่พบข้อมูลพนักงานขับรถ</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />

      <Modal isOpen={isAddOpen} onClose={async () => { await discardPendingUpload(); setIsAddOpen(false); }} title="เพิ่มพนักงานขับรถใหม่">
        <div className="space-y-3 p-4">
          {error && isAddOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล *</label><input name="name" value={formData.name} onChange={handleChange} className={inputCls} placeholder="เช่น นายอนุรักษ์ รัตนบุรี" disabled={isSubmitting} /></div>
          <ImageUploadField
            label="รูปภาพ (ถ้ามี)"
            value={formData.photoUrl}
            onChange={url => setFormData(p => ({ ...p, photoUrl: url }))}
            onUploaded={url => { pendingUploadRef.current = url; setPendingUpload(url); }}
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={async () => { await discardPendingUpload(); setIsAddOpen(false); }} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="primary" onClick={handleAdd} disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={async () => { await discardPendingUpload(); setIsEditOpen(false); }} title="แก้ไขข้อมูลพนักงานขับรถ">
        <div className="space-y-3 p-4">
          {error && isEditOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล *</label><input name="name" value={formData.name} onChange={handleChange} className={inputCls} disabled={isSubmitting} /></div>
          <ImageUploadField
            label="รูปภาพ (ถ้ามี)"
            value={formData.photoUrl}
            onChange={url => setFormData(p => ({ ...p, photoUrl: url }))}
            onUploaded={url => { pendingUploadRef.current = url; setPendingUpload(url); }}
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={async () => { await discardPendingUpload(); setIsEditOpen(false); }} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="primary" onClick={handleEdit} disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="ยืนยันการลบพนักงานขับรถ">
        <div className="space-y-3 p-4">
          {error && isDeleteOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <p className="text-sm">ต้องการลบพนักงาน <strong>{selectedDriver?.name}</strong> ใช่หรือไม่?</p>
          <p className="text-xs text-red-500">ไม่สามารถลบพนักงานที่มีการจองอยู่ในระบบได้</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? 'กำลังลบ...' : 'ยืนยันการลบ'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
