'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ActivityLog } from '@/types';
import { ArrowPathIcon, FunnelIcon, MagnifyingGlassIcon, ClockIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Pagination } from './SectionToolbar';

const actionBadge = (action: string) => {
  const s = action.includes('เข้าสู่ระบบ') ? 'bg-green-100 text-green-800' : action.includes('ออกจากระบบ') ? 'bg-yellow-100 text-yellow-800' : action.includes('สร้าง') ? 'bg-blue-100 text-blue-800' : action.includes('แก้ไข') ? 'bg-purple-100 text-purple-800' : action.includes('ลบ') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s}`}>{action}</span>;
};

export default function LogsSection() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filtered, setFiltered] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const fetchLogs = async () => {
    try { setLoading(true); setError(null); const r = await axios.get('/api/logs'); setLogs(r.data.logs || []); }
    catch { setError('ไม่สามารถโหลดข้อมูลกิจกรรมได้'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchLogs(); }, []);

  useEffect(() => {
    let result = [...logs];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => l.userName?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q));
    }
    if (actionFilter !== 'all') result = result.filter(l => l.action === actionFilter);
    if (dateFilter !== 'all') {
      const now = new Date(); let from = new Date();
      if (dateFilter === 'today') { from.setHours(0, 0, 0, 0); result = result.filter(l => new Date(l.createdAt) >= from); }
      else if (dateFilter === 'yesterday') {
        from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
        const end = new Date(from); end.setHours(23, 59, 59, 999);
        result = result.filter(l => { const d = new Date(l.createdAt); return d >= from && d <= end; });
      } else if (dateFilter === 'last7days') { from.setDate(now.getDate() - 7); result = result.filter(l => new Date(l.createdAt) >= from); }
      else if (dateFilter === 'last30days') { from.setDate(now.getDate() - 30); result = result.filter(l => new Date(l.createdAt) >= from); }
    }
    setFiltered(result);
    setPage(1);
  }, [logs, search, actionFilter, dateFilter]);

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const fmt = (s: string) => new Date(s).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="py-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
        </div>
        <button onClick={() => setFilterOpen(!filterOpen)} className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-md text-xs transition-colors ${filterOpen ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
          <FunnelIcon className="h-3.5 w-3.5" />กรอง
        </button>
        <button onClick={fetchLogs} className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50">
          <ArrowPathIcon className="h-3.5 w-3.5" />รีเฟรช
        </button>
      </div>

      {filterOpen && (
        <div className="p-3 bg-white rounded-lg border border-blue-100 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทกิจกรรม</label>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm text-xs">
              <option value="all">ทั้งหมด</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ช่วงเวลา</label>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm text-xs">
              <option value="all">ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="yesterday">เมื่อวาน</option>
              <option value="last7days">7 วันที่ผ่านมา</option>
              <option value="last30days">30 วันที่ผ่านมา</option>
            </select>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-sm text-red-600">{error}</div>}

      {paged.length > 0 ? (
        <>
          {/* Mobile card view */}
          <div className="space-y-2 sm:hidden">
            {paged.map(log => (
              <div key={log.id} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><UserIcon className="h-4 w-4 text-blue-600" /></div>
                    <span className="text-sm font-medium text-gray-900">{log.userName}</span>
                  </div>
                  {actionBadge(log.action)}
                </div>
                {log.details && <p className="text-xs text-gray-500 mb-1.5 line-clamp-2">{log.details}</p>}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <ClockIcon className="h-3.5 w-3.5 shrink-0" />{fmt(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="rounded-lg border border-gray-200 overflow-hidden hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-4 text-left text-sm font-semibold text-gray-600">ผู้ใช้</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">กิจกรรม</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 hidden md:table-cell">รายละเอียด</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">เวลา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paged.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><UserIcon className="h-4 w-4 text-blue-600" /></div>
                        <span className="text-sm font-medium text-gray-900">{log.userName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{actionBadge(log.action)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600"><DocumentTextIcon className="h-4 w-4 text-gray-400 shrink-0" />{log.details || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500"><ClockIcon className="h-4 w-4 shrink-0" />{fmt(log.createdAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center py-10 text-gray-400">
          <DocumentTextIcon className="h-10 w-10 mx-auto mb-2" />
          <p className="text-sm">{search || actionFilter !== 'all' || dateFilter !== 'all' ? 'ไม่พบผลลัพธ์ที่ตรงกัน' : 'ยังไม่มีกิจกรรมที่บันทึก'}</p>
        </div>
      )}

      <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} perPageOptions={[10, 25, 50, 100]} />
    </div>
  );
}
