import { useEffect, useRef, type ReactNode } from 'react';
import { Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  /** Optional busy state for the confirm button (e.g. while mutation is in flight). */
  loading?: boolean;
  /** Optional icon override when not in danger mode. */
  icon?: ReactNode;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  danger = false,
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // ESC kapatma
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, loading]);

  // body scroll kilidi
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // dışarı tıklama
  function onBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (loading) return;
    if (e.target === e.currentTarget) onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onMouseDown={onBackdropMouseDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 flex gap-4">
          <div
            className={cn(
              'h-11 w-11 shrink-0 rounded-full flex items-center justify-center',
              danger ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600',
            )}
          >
            {icon ?? (danger ? <Trash2 className="h-5 w-5" /> : null)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <div className="mt-2 text-sm text-slate-600">{message}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700',
            )}
          >
            {danger && <Trash2 className="h-4 w-4" />}
            {loading ? 'İşleniyor…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
