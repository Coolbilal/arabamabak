import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ChevronUp, Inbox } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DataTableColumn<T> {
  /** Key — can be a path using dot notation (e.g. "profile.full_name") or any T property. */
  key: string;
  header: ReactNode;
  /** Custom render. Receives row and rowIndex. */
  render?: (row: T, rowIndex: number) => ReactNode;
  /** Allow toggling sort by clicking header. */
  sortable?: boolean;
  /** Tailwind width class. e.g. "w-32", "w-1/4". */
  width?: string;
  /** Tailwind text-align class. e.g. "text-right", "text-center". */
  align?: 'left' | 'right' | 'center';
  /** Extra class for cells. */
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  onRowClick?: (row: T, rowIndex: number) => void;
  pageSize?: number;
  emptyMessage?: ReactNode;
  rowKey?: (row: T, rowIndex: number) => string;
  isLoading?: boolean;
  /** Optional className for the wrapping container. */
  className?: string;
  /** Compact padding for cells. */
  dense?: boolean;
}

function getByPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (path.indexOf('.') === -1) return (obj as Record<string, unknown>)[path];
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[segment];
  }, obj);
}

type SortDir = 'asc' | 'desc' | null;

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  const aStr = String(a);
  const bStr = String(b);
  // ISO date strings sort correctly with string compare
  return aStr.localeCompare(bStr, 'tr', { numeric: true, sensitivity: 'base' });
}

export default function DataTable<T>({
  columns,
  data,
  onRowClick,
  pageSize = 20,
  emptyMessage = 'Kayıt bulunamadı',
  rowKey,
  isLoading = false,
  className,
  dense = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  // Reset to first page when data changes drastically
  useEffect(() => {
    setPage(1);
  }, [data.length]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = getByPath(a, sortKey);
      const bv = getByPath(b, sortKey);
      const cmp = compareValues(av, bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(startIdx, startIdx + pageSize);

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir('asc');
      return;
    }
    setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
    if (sortDir === 'desc') setSortKey(null);
  }

  const cellPad = dense ? 'px-3 py-2' : 'px-4 py-3';
  const alignClass = (align?: 'left' | 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'font-semibold text-slate-600 select-none whitespace-nowrap',
                      cellPad,
                      alignClass(col.align),
                      col.width,
                      col.sortable && 'cursor-pointer hover:text-slate-900',
                    )}
                    onClick={() => toggleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span className="inline-flex flex-col leading-none">
                          <ChevronUp
                            className={cn(
                              'h-3 w-3 -mb-0.5',
                              isSorted && sortDir === 'asc' ? 'text-slate-900' : 'text-slate-300',
                            )}
                          />
                          <ChevronDown
                            className={cn(
                              'h-3 w-3',
                              isSorted && sortDir === 'desc' ? 'text-slate-900' : 'text-slate-300',
                            )}
                          />
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className={cn(cellPad, alignClass(col.align), col.width)}>
                      <div className="h-3 w-full max-w-[120px] rounded bg-slate-200 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cn(cellPad, 'text-center text-slate-500 py-12')}>
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Inbox className="h-8 w-8" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIndex) => {
                const key = rowKey ? rowKey(row, rowIndex) : String((row as { id?: string | number })?.id ?? rowIndex);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                    className={cn(onRowClick && 'cursor-pointer hover:bg-slate-50 transition-colors')}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          cellPad,
                          alignClass(col.align),
                          col.width,
                          col.cellClassName,
                          'text-slate-700',
                        )}
                      >
                        {col.render ? col.render(row, rowIndex) : (getByPath(row, col.key) as ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
          <div>
            <span className="font-medium">{sorted.length}</span> kayıttan{' '}
            <span className="font-medium">{startIdx + 1}</span>–
            <span className="font-medium">{Math.min(startIdx + pageSize, sorted.length)}</span> arası
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="İlk sayfa"
            >
              <ChevronFirst className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Önceki"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-xs font-medium">
              Sayfa {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Sonraki"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Son sayfa"
            >
              <ChevronLast className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
