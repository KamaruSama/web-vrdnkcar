'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { User } from '@/types';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardBody } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon, UserIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { translateRole } from '@/lib/utils';
import { SectionToolbar, Pagination, type ViewMode } from './SectionToolbar';
import ImageUploadField from '@/components/ui/ImageUploadField';

const roleBadge = (role: string) => {
  const s: Record<string, string> = { admin: 'bg-purple-100 text-purple-800', driver: 'bg-blue-100 text-blue-800', approve: 'bg-green-100 text-green-800', user: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s[role] ?? s.user}`}>{translateRole(role)}</span>;
};

export default function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', name: '', position: '', role: 'user', showInRequesterList: true, profilePicture: '' });
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);

  const fetchUsers = async () => {
    try { setLoading(true); setError(null); const r = await axios.get('/api/users'); setUsers(r.data.users || []); }
    catch { setError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.checked }));

  const handleAdd = async () => {
    if (!formData.username.trim() || !formData.name.trim() || !formData.position.trim()) { setError('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    try {
      setIsSubmitting(true); setError(null);
      const r = await axios.post('/api/users', formData);
      if (r.data.user) { pendingUploadRef.current = null; setPendingUpload(null); setUsers(p => [...p, r.data.user]); setFormData({ username: '', name: '', position: '', role: 'user', showInRequesterList: true, profilePicture: '' }); setIsAddOpen(false); }
    } catch (err: any) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้'); }
    finally { setIsSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!selectedUser || !formData.name.trim() || !formData.position.trim()) { setError('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    try {
      setIsSubmitting(true); setError(null);
      const r = await axios.put(`/api/users/${selectedUser.id}`, { name: formData.name, position: formData.position, role: formData.role, showInRequesterList: formData.showInRequesterList, profilePicture: formData.profilePicture || null });
      pendingUploadRef.current = null; setPendingUpload(null);
      setUsers(p => p.map(u => u.id === selectedUser.id ? r.data.user : u));
      setIsEditOpen(false);
    } catch { setError('เกิดข้อผิดพลาดในการแก้ไขข้อมูล'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true); setError(null);
      await axios.delete(`/api/users/${selectedUser.id}`);
      setUsers(p => p.filter(u => u.id !== selectedUser.id));
      setIsDeleteOpen(false);
    } catch (err: any) { setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบผู้ใช้'); }
    finally { setIsSubmitting(false); }
  };

  const openEdit = (u: User) => { setSelectedUser(u); setFormData({ username: u.username, name: u.name, position: u.position, role: u.role, showInRequesterList: (u.showInRequesterList ?? 1) === 1, profilePicture: u.profilePicture || '' }); setIsEditOpen(true); };
  const openDelete = (u: User) => { setSelectedUser(u); setIsDeleteOpen(true); };

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.position?.toLowerCase().includes(q);
    }
    return true;
  });
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const inputCls = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm';

  const Avatar = ({ u }: { u: User }) => u.profilePicture?.trim() ? (
    <div className="relative h-9 w-9 rounded-full overflow-hidden border border-gray-200 shrink-0">
      <Image src={u.profilePicture} alt={u.name} fill style={{ objectFit: 'cover' }} />
    </div>
  ) : (
    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-blue-700">{u.name.charAt(0)}</span>
    </div>
  );

  if (loading) return <div className="py-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="space-y-3">
      <SectionToolbar
        view={view} onView={setView}
        rightSlot={
          <Button variant="primary" size="sm" icon={<PlusIcon className="h-4 w-4 mr-1" />}
            onClick={() => { setFormData({ username: '', name: '', position: '', role: 'user', showInRequesterList: true, profilePicture: '' }); setIsAddOpen(true); }}>
            เพิ่มผู้ใช้ใหม่
          </Button>
        }
      />

      {error && <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-sm text-red-600">{error}</div>}

      {/* Mobile layout */}
      <div className="sm:hidden space-y-2">
        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
            />
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`px-2.5 rounded-lg border transition-colors shrink-0 ${showFilter ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400'}`}
          >
            <FunnelIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Role filter chips */}
        {showFilter && (
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'admin', 'approve', 'driver', 'user'].map(r => (
              <button
                key={r}
                onClick={() => { setRoleFilter(r); setPage(1); }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                  roleFilter === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {r === 'all' ? 'ทั้งหมด' : translateRole(r)}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        {(search || roleFilter !== 'all') && (
          <p className="text-[11px] text-gray-400">พบ {filtered.length} รายการ</p>
        )}

        {paged.length > 0 ? paged.map(u => (
          <div key={u.id} className="p-3 bg-white rounded-xl border border-gray-100 active:bg-gray-50">
            <div className="flex items-center gap-3">
              <Avatar u={u} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{u.position}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><PencilIcon className="h-4 w-4" /></button>
                <button onClick={() => openDelete(u)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" disabled={u.role === 'admin'}><TrashIcon className={`h-4 w-4 ${u.role === 'admin' ? 'opacity-30' : ''}`} /></button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2 ml-12">
              {roleBadge(u.role)}
              <span className="text-[10px] text-gray-400">{u.username}</span>
            </div>
          </div>
        )) : <div className="text-center py-8 text-gray-400 text-sm">ไม่พบข้อมูลผู้ใช้</div>}
      </div>

      {/* Desktop filter bar */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="ค้นหา..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-44 pl-7 pr-2 h-7 text-xs rounded-md border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-7 text-xs rounded-md border border-gray-200 px-2 text-gray-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400">
          <option value="all">สิทธิ์ทั้งหมด</option>
          <option value="admin">{translateRole('admin')}</option>
          <option value="approve">{translateRole('approve')}</option>
          <option value="driver">{translateRole('driver')}</option>
          <option value="user">{translateRole('user')}</option>
        </select>
        {(search || roleFilter !== 'all') && (
          <span className="text-[11px] text-gray-400">{filtered.length} รายการ</span>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:block">
        {/* Card view */}
        {view === 'card' && (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {paged.length > 0 ? paged.map(u => (
              <Card key={u.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex justify-between items-center py-2.5 px-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar u={u} />
                    <div className="min-w-0"><p className="font-semibold text-sm truncate">{u.name}</p><p className="text-xs text-gray-500">{u.username}</p></div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => openDelete(u)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" disabled={u.role === 'admin'}><TrashIcon className={`h-4 w-4 ${u.role === 'admin' ? 'opacity-30' : ''}`} /></button>
                  </div>
                </CardHeader>
                <CardBody className="py-2 px-3">
                  <p className="text-xs text-gray-500 mb-1">{u.position}</p>
                  <div className="flex gap-1 flex-wrap">
                    {roleBadge(u.role)}
                    <span className={`px-2 py-0.5 text-xs rounded-full ${u.showInRequesterList ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{u.showInRequesterList ? 'แสดงในรายการ' : 'ซ่อน'}</span>
                  </div>
                </CardBody>
              </Card>
            )) : <div className="col-span-full text-center py-8 text-gray-400 text-sm">ไม่พบข้อมูลผู้ใช้</div>}
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-4 w-12" />
                  <th className="py-3 px-3 text-left text-sm font-semibold text-gray-600">ชื่อ</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">ตำแหน่ง</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">สิทธิ์</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 hidden md:table-cell">รายการผู้ขอ</th>
                  <th className="py-3 pr-4 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paged.length > 0 ? paged.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 pl-4"><Avatar u={u} /></td>
                    <td className="py-3 px-3"><p className="font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-500 mt-0.5">{u.username}</p></td>
                    <td className="py-3 px-4 text-gray-600">{u.position}</td>
                    <td className="py-3 px-4">{roleBadge(u.role)}</td>
                    <td className="py-3 px-4 hidden md:table-cell"><span className={`px-2.5 py-1 text-xs rounded-full font-medium ${u.showInRequesterList ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{u.showInRequesterList ? 'แสดง' : 'ซ่อน'}</span></td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => openDelete(u)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" disabled={u.role === 'admin'}><TrashIcon className={`h-4 w-4 ${u.role === 'admin' ? 'opacity-30' : ''}`} /></button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={6} className="py-10 text-center text-gray-400">ไม่พบข้อมูลผู้ใช้</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="เพิ่มผู้ใช้ใหม่">
        <div className="space-y-3 p-4">
          {error && isAddOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700">ชื่อผู้ใช้ *</label><input name="username" value={formData.username} onChange={handleChange} className={inputCls} placeholder="เช่น user123" disabled={isSubmitting} /></div>
          <div><label className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล *</label><input name="name" value={formData.name} onChange={handleChange} className={inputCls} disabled={isSubmitting} /></div>
          <div><label className="block text-sm font-medium text-gray-700">ตำแหน่ง *</label><input name="position" value={formData.position} onChange={handleChange} className={inputCls} disabled={isSubmitting} /></div>
          <div><label className="block text-sm font-medium text-gray-700">สิทธิ์</label>
            <select name="role" value={formData.role} onChange={handleChange} className={inputCls} disabled={isSubmitting}>
              <option value="user">ผู้ใช้ทั่วไป</option><option value="driver">พนักงานขับรถ</option><option value="approve">ผู้อนุมัติ</option><option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="showInRequesterList" checked={formData.showInRequesterList} onChange={handleCheck} className="h-4 w-4 rounded border-gray-300 text-primary-600" disabled={isSubmitting} />แสดงในรายการผู้ขอ</label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="primary" onClick={handleAdd} disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={async () => { await discardPendingUpload(); setIsEditOpen(false); }} title="แก้ไขข้อมูลผู้ใช้">
        <div className="space-y-3 p-4">
          {error && isEditOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700">ชื่อผู้ใช้</label><input value={formData.username} className={`${inputCls} bg-gray-100`} disabled /></div>
          <div><label className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล *</label><input name="name" value={formData.name} onChange={handleChange} className={inputCls} disabled={isSubmitting} /></div>
          <div><label className="block text-sm font-medium text-gray-700">ตำแหน่ง *</label><input name="position" value={formData.position} onChange={handleChange} className={inputCls} disabled={isSubmitting} /></div>
          <div><label className="block text-sm font-medium text-gray-700">สิทธิ์</label>
            <select name="role" value={formData.role} onChange={handleChange} className={inputCls} disabled={isSubmitting || selectedUser?.role === 'admin'}>
              <option value="user">ผู้ใช้ทั่วไป</option><option value="driver">พนักงานขับรถ</option><option value="approve">ผู้อนุมัติ</option><option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="showInRequesterList" checked={formData.showInRequesterList} onChange={handleCheck} className="h-4 w-4 rounded border-gray-300 text-primary-600" disabled={isSubmitting} />แสดงในรายการผู้ขอ</label>
          <ImageUploadField
            label="รูปโปรไฟล์"
            value={formData.profilePicture}
            onChange={url => setFormData(p => ({ ...p, profilePicture: url }))}
            onUploaded={url => { pendingUploadRef.current = url; setPendingUpload(url); }}
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={async () => { await discardPendingUpload(); setIsEditOpen(false); }} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="primary" onClick={handleEdit} disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="ยืนยันการลบผู้ใช้">
        <div className="space-y-3 p-4">
          {error && isDeleteOpen && <div className="bg-red-50 p-2 rounded text-red-600 text-sm">{error}</div>}
          <p className="text-sm">ต้องการลบผู้ใช้ <strong>{selectedUser?.name}</strong> ใช่หรือไม่?</p>
          <p className="text-xs text-red-500">ไม่สามารถลบผู้ใช้ที่มีการจองอยู่ในระบบได้</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>ยกเลิก</Button>
            <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? 'กำลังลบ...' : 'ยืนยันการลบ'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
