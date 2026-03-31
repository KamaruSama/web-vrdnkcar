'use client';

import { Squares2X2Icon, ListBulletIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export type ViewMode = 'card' | 'list';

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
  perPageOptions?: number[];
}

interface SectionToolbarProps {
  view: ViewMode;
  onView: (v: ViewMode) => void;
  rightSlot?: React.ReactNode;
}

/** Top toolbar: view toggle + custom right slot (e.g. add button) */
export function SectionToolbar({ view, onView, rightSlot }: SectionToolbarProps) {
  return (
    <>
      {/* Mobile: only show right slot (add button) */}
      {rightSlot && <div className="sm:hidden flex justify-end">{rightSlot}</div>}
      {/* Desktop: full toolbar */}
      <div className="hidden sm:flex items-center justify-between gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => onView('card')}
            className={`p-1.5 transition-colors ${view === 'card' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="มุมมองการ์ด"
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onView('list')}
            className={`p-1.5 transition-colors ${view === 'list' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="มุมมองรายการ"
          >
            <ListBulletIcon className="w-4 h-4" />
          </button>
        </div>
        {rightSlot}
      </div>
    </>
  );
}

/** Bottom pagination bar */
export function Pagination({ total, page, perPage, onPage, onPerPage, perPageOptions = [10, 25, 50] }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
      {/* Per-page selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">แสดง</span>
        <div className="flex gap-1">
          {perPageOptions.map(n => (
            <button
              key={n}
              onClick={() => { onPerPage(n); onPage(1); }}
              className={`px-2 h-6 rounded text-xs font-medium transition-colors ${perPage === n ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">รายการ</span>
      </div>

      {/* Page info + nav */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400">{from}–{to} จาก {total}</span>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-xs text-gray-700 font-medium min-w-[3rem] text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
