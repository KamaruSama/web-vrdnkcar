'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

type CheckStatus = 'ok' | 'error' | 'warn';

// ── Doctor types ──────────────────────────────────────────
interface DoctorCheck {
  status: CheckStatus;
  label: string;
  note?: string;
  fixable?: boolean;
  command?: string;
}

interface CategoryResult {
  status: CheckStatus;
  mode?: string;
  checks: Record<string, DoctorCheck>;
  fixable: boolean;
}

interface DoctorData {
  status: 'ok' | 'warn' | 'error';
  categories: Record<string, CategoryResult>;
}

// ── Health types ──────────────────────────────────────────
interface HealthCheck {
  status: CheckStatus;
  value?: string;
  note?: string;
  ms?: number;
}

interface HealthCategory {
  status: CheckStatus;
  checks: Record<string, HealthCheck>;
}

interface HealthData {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  totalMs: number;
  categories: Record<string, HealthCategory>;
}

interface EndpointResult {
  url: string;
  label: string;
  status: 'ok' | 'error' | 'pending';
  httpStatus?: number;
  ms?: number;
}

// ── Constants ─────────────────────────────────────────────
const DOCTOR_CATEGORY_LABELS: Record<string, string> = {
  deployment: 'การ Deploy',
  backup: 'ระบบ Backup',
  storage: 'ที่เก็บไฟล์',
  scripts: 'Script Permissions',
  auth: 'Auth Protection',
};

const DOCTOR_CATEGORY_COLORS: Record<string, { color: string; dot: string; bg: string; border: string; badgeBg: string; badgeText: string }> = {
  deployment: { color: 'text-purple-600', dot: 'bg-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  backup:     { color: 'text-indigo-600', dot: 'bg-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700' },
  storage:    { color: 'text-teal-600',   dot: 'bg-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-100',   badgeBg: 'bg-teal-100',   badgeText: 'text-teal-700' },
  scripts:    { color: 'text-orange-600', dot: 'bg-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' },
};

const HEALTH_CATEGORY_LABELS: Record<string, string> = {
  auth: 'Auth',
  database: 'Database',
  bookings: 'Bookings',
  fleet: 'Fleet',
  users: 'Users',
  environment: 'Environment',
};

// Health categories handled by Doctor — skip duplicates
const SKIP_HEALTH_CATEGORIES = new Set(['storage', 'backup']);

const ENDPOINTS = [
  { url: '/api/bookings', label: 'Bookings' },
  { url: '/api/car',      label: 'Cars' },
  { url: '/api/drivers',  label: 'Drivers' },
  { url: '/api/users',    label: 'Users' },
  { url: '/api/auth/me',  label: 'Auth Me' },
];



// ── Shared UI components ───────────────────────────────────
function StatusDot({ status }: { status: CheckStatus | 'pending' }) {
  const cls =
    status === 'ok'      ? 'bg-emerald-500' :
    status === 'error'   ? 'bg-red-500' :
    status === 'warn'    ? 'bg-amber-400' :
    'bg-gray-300 animate-pulse';
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

function StatusBadge({ status }: { status: CheckStatus | 'pending' | 'degraded' }) {
  const map = {
    ok:       { cls: 'bg-emerald-100 text-emerald-700', label: 'ปกติ' },
    error:    { cls: 'bg-red-100 text-red-700',         label: 'ผิดพลาด' },
    warn:     { cls: 'bg-amber-100 text-amber-700',     label: 'เตือน' },
    degraded: { cls: 'bg-amber-100 text-amber-700',     label: 'บางส่วน' },
    pending:  { cls: 'bg-gray-100 text-gray-500',       label: 'รอ...' },
  };
  const { cls, label } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <StatusDot status={status === 'degraded' ? 'warn' : status as CheckStatus} />
      {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="คัดลอก">
      {copied
        ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
        : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
    </button>
  );
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}วัน ${h}ชม.`;
  if (h > 0) return `${h}ชม. ${m}นาที`;
  return `${m}นาที`;
}

// ── Main component ─────────────────────────────────────────
export default function DoctorSection() {
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointResult[]>(ENDPOINTS.map(e => ({ ...e, status: 'pending' })));
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [fixingCategory, setFixingCategory] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{ category: string; fixed: string[]; failed: string[]; message: string } | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setDoctorData(null);
    setHealthData(null);
    setFixResult(null);
    setEndpoints(ENDPOINTS.map(e => ({ ...e, status: 'pending' })));

    const [doctorRes, healthRes, epResults] = await Promise.all([
      fetch('/api/doctor', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch('/api/health', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      Promise.all(ENDPOINTS.map(async ep => {
        const t0 = Date.now();
        try {
          const r = await fetch(ep.url, { cache: 'no-store' });
          return { ...ep, status: r.ok ? 'ok' : 'error', httpStatus: r.status, ms: Date.now() - t0 } as EndpointResult;
        } catch {
          return { ...ep, status: 'error', ms: Date.now() - t0 } as EndpointResult;
        }
      })),
    ]);

    setDoctorData(doctorRes);
    setHealthData(healthRes);
    setEndpoints(epResults);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { check(); }, [check]);

  const handleFix = async (category: string) => {
    setFixingCategory(category);
    setFixResult(null);
    try {
      const res = await fetch('/api/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      const result = await res.json();
      setFixResult({ category, fixed: result.fixed || [], failed: result.failed || [], message: result.message });
      check();
    } catch {
      setFixResult({ category, fixed: [], failed: ['Request failed'], message: 'Error fixing' });
    } finally {
      setFixingCategory(null);
    }
  };

  const handleCleanOrphans = async () => {
    if (!confirm('ลบเฉพาะไฟล์ที่ไม่มีใน DB? (ไฟล์ที่ใช้อยู่จะไม่ถูกลบ)')) return;
    setCleanupLoading(true); setCleanupMsg(null);
    try {
      const r = await fetch('/api/upload/cleanup', { method: 'POST' });
      const data = await r.json();
      setCleanupMsg(`ลบ ${data.deleted.display} ไฟล์แสดงผล, ${data.deleted.originals} ต้นฉบับ · เก็บไว้ ${data.kept} ไฟล์`);
      check();
    } catch { setCleanupMsg('เกิดข้อผิดพลาด'); }
    finally { setCleanupLoading(false); }
  };

  const handleResetAll = async () => {
    if (!confirm('ลบรูปภาพทั้งหมด + ล้าง DB references?\n\nรูปโปรไฟล์ผู้ใช้ รูปคนขับ รูปรถ จะหายหมด!')) return;
    if (!confirm('ยืนยันอีกครั้ง — การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    setCleanupLoading(true); setCleanupMsg(null);
    try {
      const r = await fetch('/api/upload/cleanup', { method: 'DELETE' });
      const data = await r.json();
      setCleanupMsg(`ลบ ${data.deleted.display + data.deleted.originals} ไฟล์ + ล้าง DB เรียบร้อย`);
      check();
    } catch { setCleanupMsg('เกิดข้อผิดพลาด'); }
    finally { setCleanupLoading(false); }
  };

  // Determine worst overall status
  const worstStatus = (() => {
    const statuses = [doctorData?.status, healthData?.status === 'degraded' ? 'warn' : healthData?.status];
    if (statuses.some(s => s === 'error')) return 'error';
    if (statuses.some(s => s === 'warn')) return 'warn';
    if (loading) return 'pending' as const;
    return 'ok';
  })();

  const skeletonRows = (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-lg border border-gray-100 overflow-hidden animate-pulse">
          <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <div className="w-24 h-3.5 bg-gray-200 rounded" />
          </div>
          {[1, 2].map(j => (
            <div key={j} className="px-4 py-3 flex items-center gap-3 border-t border-gray-100">
              <div className="w-2 h-2 rounded-full bg-gray-100" />
              <div className="flex-1 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={worstStatus} />
          {healthData && (
            <span className="text-xs text-gray-500">
              {healthData.totalMs}ms · Uptime {formatUptime(healthData.uptime)}
            </span>
          )}
          {lastChecked && (
            <span className="text-xs text-gray-400">{lastChecked.toLocaleTimeString('th-TH')}</span>
          )}
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          ตรวจสอบ
        </button>
      </div>

      {/* Doctor categories (deployment, backup, storage, scripts) */}
      {loading && !doctorData ? skeletonRows : doctorData?.categories ? (
        <div className="space-y-3">
          {Object.entries(doctorData.categories).map(([catKey, cat]) => {
            const colors = DOCTOR_CATEGORY_COLORS[catKey] || DOCTOR_CATEGORY_COLORS.storage;
            const modeLabel = cat.mode ? (cat.mode === 'k3s' ? 'k3s' : 'Docker') : undefined;

            return (
              <div key={catKey} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-wrap">
                  <StatusDot status={cat.status} />
                  <span className="text-sm font-semibold text-gray-700">
                    {DOCTOR_CATEGORY_LABELS[catKey] ?? catKey}
                  </span>
                  <StatusBadge status={cat.status} />
                  {modeLabel && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}>
                      {modeLabel}
                    </span>
                  )}
                </div>

                {Object.entries(cat.checks).map(([checkKey, chk]) => (
                  <div key={checkKey} className="px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <StatusDot status={chk.status} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700">{chk.label}</span>
                        {chk.note && (
                          <p className="text-xs text-gray-400 mt-0.5">{chk.note}</p>
                        )}
                      </div>
                    </div>
                    {chk.command && (
                      <div className="group mt-2 ml-5 flex items-center gap-1.5 bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
                        <span className="text-gray-500 text-xs font-mono select-none">$</span>
                        <code className="flex-1 text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all">{chk.command}</code>
                        <CopyButton text={chk.command} />
                      </div>
                    )}
                  </div>
                ))}

                {/* Fix button + storage cleanup */}
                {(cat.fixable || catKey === 'storage') && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 space-y-2.5">
                    {cat.fixable && (
                      <button
                        onClick={() => handleFix(catKey)}
                        disabled={fixingCategory === catKey}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {fixingCategory === catKey ? 'กำลังแก้ไข...' : 'แก้ไขอัตโนมัติ'}
                      </button>
                    )}

                    {catKey === 'storage' && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleCleanOrphans}
                            disabled={cleanupLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            {cleanupLoading ? 'กำลังลบ...' : 'ลบไฟล์ไม่ใช้'}
                          </button>
                          <button
                            onClick={handleResetAll}
                            disabled={cleanupLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            {cleanupLoading ? 'กำลังลบ...' : 'รีเซ็ตรูปทั้งหมด'}
                          </button>
                        </div>
                        {cleanupMsg && (
                          <p className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">{cleanupMsg}</p>
                        )}
                        <p className="text-[11px] text-gray-400">ลบไฟล์ไม่ใช้ = orphaned files เท่านั้น · รีเซ็ต = ลบทุกรูป + ล้างลิงก์ DB</p>
                      </>
                    )}

                    {fixResult?.category === catKey && (
                      <div className="space-y-2">
                        {fixResult.fixed.length > 0 && (
                          <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-700">
                            <span className="font-medium">แก้ไขสำเร็จ:</span> {fixResult.fixed.join(', ')}
                          </div>
                        )}
                        {fixResult.failed.length > 0 && (
                          <div className="text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
                            <span className="font-medium">ล้มเหลว:</span> {fixResult.failed.join(', ')}
                          </div>
                        )}
                        {catKey === 'deployment' && fixResult.failed.some(f => f.includes('k3s')) && (
                          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
                            โปรดเรียกใช้ deploy-k3s.sh ด้วยมือเพื่อติดตั้ง k3s
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Divider */}
      {(doctorData || healthData) && (
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">สถานะระบบ</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {/* Health categories (auth, database, bookings, fleet, users, environment) */}
      {loading && !healthData ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-lg border border-gray-100 overflow-hidden animate-pulse">
              <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-200" />
                <div className="w-24 h-3.5 bg-gray-200 rounded" />
              </div>
              {[1, 2].map(j => (
                <div key={j} className="px-4 py-3 flex items-center gap-3 border-t border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-gray-100" />
                  <div className="flex-1 h-3 bg-gray-100 rounded" />
                  <div className="w-16 h-3 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : healthData?.categories ? (
        <div className="space-y-3">
          {Object.entries(healthData.categories)
            .filter(([catKey]) => !SKIP_HEALTH_CATEGORIES.has(catKey))
            .map(([catKey, cat]) => (
              <div key={catKey} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <StatusDot status={cat.status} />
                  <span className="text-sm font-semibold text-gray-700">
                    {HEALTH_CATEGORY_LABELS[catKey] ?? catKey}
                  </span>
                  <StatusBadge status={cat.status} />
                </div>
                {Object.entries(cat.checks).map(([checkKey, chk]) => (
                  <div key={checkKey} className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <StatusDot status={chk.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-700">{checkKey}</span>
                        {chk.value && (
                          <span className={`text-sm ${chk.status === 'error' ? 'text-red-600' : chk.status === 'warn' ? 'text-amber-600' : 'text-gray-600'}`}>
                            {chk.value}
                          </span>
                        )}
                      </div>
                      {chk.note && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{chk.note}</p>
                      )}
                    </div>
                    {chk.ms !== undefined && (
                      <span className="text-xs text-gray-400 font-mono shrink-0">{chk.ms}ms</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </div>
      ) : null}

      {/* API Endpoints */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-700">API Endpoints</span>
          <span className="text-xs text-gray-400">
            {endpoints.filter(e => e.status === 'ok').length}/{endpoints.length} ตอบสนอง
          </span>
        </div>
        {endpoints.map(ep => (
          <div key={ep.url} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
            <StatusDot status={ep.status} />
            <span className="text-sm font-medium text-gray-700 w-20 shrink-0">{ep.label}</span>
            <code className="text-xs text-gray-400 font-mono flex-1">{ep.url}</code>
            {ep.ms !== undefined && (
              <span className="text-xs text-gray-400 font-mono">{ep.ms}ms</span>
            )}
            {ep.httpStatus !== undefined && (
              <code className={`text-xs px-1.5 py-0.5 rounded font-mono ${ep.httpStatus < 400 ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                {ep.httpStatus}
              </code>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
