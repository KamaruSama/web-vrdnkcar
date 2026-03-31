'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PlusIcon,
  CircleStackIcon,
  PhotoIcon,
  ArrowPathIcon,
  CalendarIcon,
  XMarkIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface BackupFile {
  filename: string;
  relativePath: string;
  type: 'db' | 'uploads';
  source: 'auto' | 'manual';
  size: number;
  sizeText: string;
  date: string;
  createdAt: string;
}

interface Summary {
  total: number;
  dbCount: number;
  uploadsCount: number;
  totalSize: number;
  totalSizeText: string;
}

export default function BackupSection() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'db' | 'uploads'>('all');

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/backup', { cache: 'no-store' });
      const data = await r.json();
      setBackups(data.backups || []);
      setSummary(data.summary || null);
    } catch { setError('โหลดข้อมูลไม่ได้'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  // Split by source
  const manualBackups = useMemo(() => backups.filter(b => b.source === 'manual'), [backups]);
  const autoBackups = useMemo(() => backups.filter(b => b.source === 'auto'), [backups]);

  // Filtered (auto only — manual always shows all)
  const filtered = useMemo(() => {
    let result = autoBackups;
    if (typeFilter !== 'all') result = result.filter(b => b.type === typeFilter);
    if (dateFrom) result = result.filter(b => b.date >= dateFrom);
    if (dateTo) result = result.filter(b => b.date <= dateTo);
    return result;
  }, [autoBackups, typeFilter, dateFrom, dateTo]);

  const hasFilter = typeFilter !== 'all' || dateFrom || dateTo;

  // Group by date
  const grouped = filtered.reduce<Record<string, BackupFile[]>>((acc, b) => {
    const key = b.date || 'อื่นๆ';
    (acc[key] = acc[key] || []).push(b);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Available dates for quick select
  const allDates = useMemo(() =>
    Array.from(new Set(backups.map(b => b.date).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
  [backups]);

  const handleCreate = async () => {
    if (!confirm('สร้าง backup ใหม่ตอนนี้?')) return;
    setCreating(true); setError(null); setSuccessMsg(null);
    try {
      const r = await fetch('/api/backup', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSuccessMsg('สร้าง backup สำเร็จ');
      fetchBackups();
    } catch (err: any) { setError(err.message); }
    finally { setCreating(false); }
  };

  const handleUpload = async () => {
    // เลือกไฟล์ DB (.dump)
    const dbInput = document.createElement('input');
    dbInput.type = 'file';
    dbInput.accept = '.dump';
    dbInput.onchange = async () => {
      const dbFile = dbInput.files?.[0];
      if (!dbFile || !dbFile.name.endsWith('.dump')) {
        setError('ไฟล์ฐานข้อมูลต้องเป็น .dump');
        return;
      }
      // เลือกไฟล์ uploads (.tar.gz)
      const uploadsInput = document.createElement('input');
      uploadsInput.type = 'file';
      uploadsInput.accept = '.tar.gz,.gz';
      uploadsInput.onchange = async () => {
        const uploadsFile = uploadsInput.files?.[0];
        if (!uploadsFile || !uploadsFile.name.endsWith('.tar.gz')) {
          setError('ไฟล์รูปภาพต้องเป็น .tar.gz');
          return;
        }
        if (!confirm(`กู้คืนจากไฟล์ที่อัปโหลด?\n\nDB: ${dbFile.name}\nUploads: ${uploadsFile.name}\n\nข้อมูลปัจจุบันจะถูกแทนที่!`)) return;
        if (!confirm('ยืนยันอีกครั้ง — การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
        setUploading(true); setError(null); setSuccessMsg(null);
        try {
          const formData = new FormData();
          formData.append('dbFile', dbFile);
          formData.append('uploadsFile', uploadsFile);
          const r = await fetch('/api/backup', { method: 'PUT', body: formData });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          setSuccessMsg(data.message || 'กู้คืนสำเร็จทั้ง DB และรูปภาพ');
          fetchBackups();
        } catch (err: any) { setError(err.message); }
        finally { setUploading(false); }
      };
      uploadsInput.click();
    };
    dbInput.click();
  };

  const handleDelete = async (b: BackupFile) => {
    if (!confirm(`ลบ ${b.filename}?`)) return;
    setDeleting(b.relativePath); setError(null);
    try {
      const r = await fetch('/api/backup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath: b.relativePath }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      fetchBackups();
    } catch (err: any) { setError(err.message); }
    finally { setDeleting(null); }
  };

  const handleDownload = (b: BackupFile) => {
    window.open(`/api/backup?download=${encodeURIComponent(b.relativePath)}`, '_blank');
  };

  const handleRestore = async (b: BackupFile) => {
    const typeLabel = b.type === 'db' ? 'ฐานข้อมูล' : 'รูปภาพ';
    if (!confirm(`ดึงข้อมูล${typeLabel}จาก ${b.filename}?\n\nข้อมูลปัจจุบันจะถูกแทนที่!`)) return;
    if (!confirm(`ยืนยันอีกครั้ง — restore ${typeLabel} จาก ${b.date}`)) return;

    setRestoring(b.relativePath); setError(null); setSuccessMsg(null);
    try {
      const r = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath: b.relativePath }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSuccessMsg(`restore ${typeLabel}จาก ${b.filename} สำเร็จ`);
    } catch (err: any) { setError(err.message); }
    finally { setRestoring(null); }
  };

  const handleRestoreAll = async (date: string, files: BackupFile[]) => {
    const dbFile = files.find(f => f.type === 'db');
    const uploadsFile = files.find(f => f.type === 'uploads');
    const parts = [dbFile && 'ฐานข้อมูล', uploadsFile && 'รูปภาพ'].filter(Boolean).join(' + ');

    if (!confirm(`ดึงข้อมูลทั้งหมดจากวันที่ ${date}?\n\n${parts}\n\nข้อมูลปัจจุบันจะถูกแทนที่!`)) return;
    if (!confirm('ยืนยันอีกครั้ง — การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

    const paths = files.map(f => f.relativePath);
    setRestoring(date); setError(null); setSuccessMsg(null);
    try {
      const r = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePaths: paths }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const restored = (data.results as Array<{ type: string; filename: string }>)
        .map(r => r.type === 'db' ? 'DB' : 'uploads').join(' + ');
      setSuccessMsg(`restore ${restored} จากวันที่ ${date} สำเร็จ`);
    } catch (err: any) { setError(err.message); }
    finally { setRestoring(null); }
  };

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setTypeFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {summary && (
            <span className="text-xs text-gray-500">
              {summary.total} ไฟล์ · {summary.dbCount} DB · {summary.uploadsCount} uploads · {summary.totalSizeText}
            </span>
          )}
        </div>
        <button
          onClick={fetchBackups}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {/* ── Manual Backups ── */}
      <div className="rounded-lg border border-indigo-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-indigo-700">Backup ด้วยมือ</span>
            <span className="text-xs text-indigo-400">{manualBackups.length} ไฟล์ · ไม่ถูกลบอัตโนมัติ</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-indigo-200 text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              <ArrowUpTrayIcon className="w-3.5 h-3.5" />
              {uploading ? 'กำลังกู้คืน...' : 'อัปโหลด & กู้คืน'}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              {creating ? 'กำลังสร้าง...' : 'สร้าง backup'}
            </button>
          </div>
        </div>
        {manualBackups.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">ยังไม่มี — กดสร้าง backup หรืออัปโหลดไฟล์ .dump / .tar.gz</div>
        ) : (
          manualBackups.map(b => {
            const isRestoring = restoring === b.relativePath;
            const isDeleting = deleting === b.relativePath;
            return (
              <div key={b.relativePath} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                {b.type === 'db' ? (
                  <CircleStackIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                ) : (
                  <PhotoIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{b.filename}</p>
                  <p className="text-xs text-gray-400">{b.sizeText} · {b.type === 'db' ? 'ฐานข้อมูล' : 'รูปภาพ'} · {new Date(b.createdAt).toLocaleString('th-TH')}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleRestore(b)} disabled={isRestoring || !!restoring} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50 transition-colors" title="ดึงข้อมูลมาใช้">
                    <ArrowUpTrayIcon className={`w-4 h-4 ${isRestoring ? 'animate-pulse' : ''}`} />
                  </button>
                  <button onClick={() => handleDownload(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดาวน์โหลด">
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(b)} disabled={isDeleting} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors" title="ลบ">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Auto Backups ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">Backup อัตโนมัติ (01:00 ทุกวัน)</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FunnelIcon className="w-4 h-4 text-gray-400 shrink-0" />

          {/* ประเภท */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {(['all', 'db', 'uploads'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 font-medium transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                {t === 'all' ? 'ทั้งหมด' : t === 'db' ? 'DB' : 'Uploads'}
              </button>
            ))}
          </div>

          <span className="text-gray-300">|</span>

          {/* วันที่ */}
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              placeholder="จาก"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              placeholder="ถึง"
            />
          </div>

          {/* Quick date buttons */}
          {allDates.length > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <div className="flex gap-1 flex-wrap">
                {allDates.slice(0, 5).map(d => (
                  <button
                    key={d}
                    onClick={() => { setDateFrom(d); setDateTo(d); }}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${dateFrom === d && dateTo === d ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {d.slice(5)}
                  </button>
                ))}
              </div>
            </>
          )}

          {hasFilter && (
            <button onClick={clearFilters} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="ล้างตัวกรอง">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        {hasFilter && (
          <p className="text-[11px] text-gray-400 mt-1.5">พบ {filtered.length} จาก {backups.length} ไฟล์</p>
        )}
      </div>

      {/* Messages */}
      {error && <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-sm text-red-600">{error}</div>}
      {successMsg && <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded text-sm text-emerald-600">{successMsg}</div>}

      {/* Backup List */}
      {loading ? (
        <div className="py-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {backups.length === 0 ? 'ยังไม่มี backup' : 'ไม่พบ backup ตามเงื่อนไข'}
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map(date => (
            <div key={date} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{date}</span>
                  <span className="text-xs text-gray-400 ml-2">{grouped[date].length} ไฟล์</span>
                </div>
                <button
                  onClick={() => handleRestoreAll(date, grouped[date])}
                  disabled={!!restoring}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  title="ดึงข้อมูลทั้งหมดจากวันนี้"
                >
                  <ArrowUpTrayIcon className={`w-3.5 h-3.5 ${restoring === date ? 'animate-pulse' : ''}`} />
                  {restoring === date ? 'กำลัง restore...' : 'ดึงข้อมูลวันนี้'}
                </button>
              </div>
              {grouped[date].map(b => {
                const isRestoring = restoring === b.relativePath;
                const isDeleting = deleting === b.relativePath;
                return (
                  <div key={b.relativePath} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    {b.type === 'db' ? (
                      <CircleStackIcon className="w-4 h-4 text-blue-500 shrink-0" />
                    ) : (
                      <PhotoIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{b.filename}</p>
                      <p className="text-xs text-gray-400">{b.sizeText} · {b.type === 'db' ? 'ฐานข้อมูล' : 'รูปภาพ'}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleRestore(b)}
                        disabled={isRestoring || !!restoring}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50 transition-colors"
                        title="ดึงข้อมูลมาใช้ (restore)"
                      >
                        <ArrowUpTrayIcon className={`w-4 h-4 ${isRestoring ? 'animate-pulse' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDownload(b)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ดาวน์โหลด"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        disabled={isDeleting}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                        title="ลบ"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        Backup ด้วยมือ → เก็บใน manual/ ไม่ถูกลบอัตโนมัติ · Auto backup ทุกวัน 01:00 → เก็บแบบขั้นบันได (daily → weekly → monthly → archive)
      </p>
    </div>
  );
}
