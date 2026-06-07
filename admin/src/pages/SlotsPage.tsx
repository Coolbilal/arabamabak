import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Calendar, Clock, Hash, Edit, Trash2, Check, X,
  AlertCircle, RefreshCw, Save, Power,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate } from '../lib/utils';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';

interface SlotRow {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_items: number;
  is_active: boolean;
  created_at: string;
  assigned_count?: number;
}

const slotSchema = z
  .object({
    slot_date: z.string().min(1, 'Tarih zorunludur'),
    start_time: z.string().min(1, 'Başlangıç saati zorunludur'),
    end_time: z.string().min(1, 'Bitiş saati zorunludur'),
    max_items: z
      .number({ message: 'Maksimum ilan zorunludur' })
      .int('Tam sayı olmalıdır')
      .min(1, 'En az 1 olmalıdır')
      .max(500, 'En fazla 500 olabilir'),
  })
  .refine(
    (v) => v.start_time < v.end_time,
    { message: 'Bitiş saati başlangıç saatinden sonra olmalıdır', path: ['end_time'] },
  );

type SlotForm = z.infer<typeof slotSchema>;

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function formatTime12(t: string): string {
  if (!t) return '-';
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function SlotsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SlotRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SlotRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = hasPermission('auctions', 'view');
  const canEdit = hasPermission('auctions', 'edit');
  const canDelete = hasPermission('auctions', 'delete');

  const slotsQuery = useQuery({
    queryKey: ['auction-slots'],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_slots')
        .select('id, slot_date, start_time, end_time, max_items, is_active, created_at')
        .order('slot_date', { ascending: false })
        .order('start_time', { ascending: true })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as unknown as SlotRow[];

      // Her slot için atanmış ilan sayısı
      if (rows.length === 0) return rows;
      const ids = rows.map((r) => r.id);
      const { data: counts } = await supabase
        .from('auctions')
        .select('slot_id')
        .in('slot_id', ids);
      const map = new Map<string, number>();
      for (const a of (counts ?? []) as Array<{ slot_id: string | null }>) {
        if (!a.slot_id) continue;
        map.set(a.slot_id, (map.get(a.slot_id) ?? 0) + 1);
      }
      return rows.map((r) => ({ ...r, assigned_count: map.get(r.id) ?? 0 }));
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SlotForm>({
    resolver: zodResolver(slotSchema),
    defaultValues: { slot_date: '', start_time: '', end_time: '', max_items: 20 },
  });

  useEffect(() => {
    if (editing) {
      reset({
        slot_date: editing.slot_date,
        start_time: editing.start_time.slice(0, 5),
        end_time: editing.end_time.slice(0, 5),
        max_items: editing.max_items,
      });
    } else {
      reset({ slot_date: '', start_time: '10:00', end_time: '18:00', max_items: 20 });
    }
  }, [editing, reset]);

  const createMutation = useMutation({
    mutationFn: async (values: SlotForm) => {
      const { error } = await supabase.from('auction_slots').insert({
        slot_date: values.slot_date,
        start_time: values.start_time,
        end_time: values.end_time,
        max_items: values.max_items,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction-slots'] });
      setShowForm(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e?.message || 'Oluşturulamadı'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: SlotForm }) => {
      const { error } = await supabase
        .from('auction_slots')
        .update({
          slot_date: values.slot_date,
          start_time: values.start_time,
          end_time: values.end_time,
          max_items: values.max_items,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction-slots'] });
      setShowForm(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e?.message || 'Güncellenemedi'),
  });

  const toggleActive = useMutation({
    mutationFn: async (row: SlotRow) => {
      const { error } = await supabase
        .from('auction_slots')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auction-slots'] }),
    onError: (e: any) => setError(e?.message || 'Durum değiştirilemedi'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: SlotRow) => {
      // Önce bu slota bağlı auction'ların slot_id'sini null yap
      const { error: upErr } = await supabase
        .from('auctions')
        .update({ slot_id: null })
        .eq('slot_id', row.id);
      if (upErr) throw upErr;
      // Sonra slot'u sil
      const { error: delErr } = await supabase.from('auction_slots').delete().eq('id', row.id);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction-slots'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => setError(e?.message || 'Silinemedi'),
  });

  const onSubmit = handleSubmit((values) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, values });
    } else {
      createMutation.mutate(values);
    }
  });

  const totals = useMemo(() => {
    const list = slotsQuery.data ?? [];
    return {
      total: list.length,
      active: list.filter((s) => s.is_active).length,
      upcoming: list.filter((s) => new Date(s.slot_date).getTime() >= new Date(new Date().toDateString()).getTime()).length,
      capacity: list.reduce((acc, s) => acc + s.max_items, 0),
      assigned: list.reduce((acc, s) => acc + (s.assigned_count ?? 0), 0),
    };
  }, [slotsQuery.data]);

  const columns: DataTableColumn<SlotRow>[] = useMemo(
    () => [
      {
        key: 'slot_date',
        header: 'Tarih',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <div>
              <div className="font-medium text-slate-800">{formatDate(row.slot_date)}</div>
              <div className="text-[10px] text-slate-400">oluşturma: {formatDate(row.created_at)}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'start_time',
        header: 'Başlangıç',
        width: 'w-32',
        render: (row) => (
          <span className="inline-flex items-center gap-1 text-slate-700 text-sm">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {formatTime12(row.start_time)}
          </span>
        ),
      },
      {
        key: 'end_time',
        header: 'Bitiş',
        width: 'w-32',
        render: (row) => (
          <span className="inline-flex items-center gap-1 text-slate-700 text-sm">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {formatTime12(row.end_time)}
          </span>
        ),
      },
      {
        key: 'max_items',
        header: 'Maks. İlan',
        align: 'right',
        width: 'w-32',
        render: (row) => (
          <div className="text-right">
            <div className="font-semibold text-slate-800">{row.max_items}</div>
            <div className="text-[10px] text-slate-400">
              süre: {timeToMinutes(row.end_time) - timeToMinutes(row.start_time)} dk
            </div>
          </div>
        ),
      },
      {
        key: 'assigned_count',
        header: 'Atanmış',
        align: 'right',
        sortable: true,
        width: 'w-36',
        render: (row) => {
          const used = row.assigned_count ?? 0;
          const pct = row.max_items > 0 ? Math.min(100, Math.round((used / row.max_items) * 100)) : 0;
          return (
            <div className="text-right">
              <div className={cn('font-semibold', used >= row.max_items ? 'text-red-600' : 'text-slate-800')}>
                {used} / {row.max_items}
              </div>
              <div className="mt-1 h-1.5 w-20 ml-auto bg-slate-100 rounded overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'is_active',
        header: 'Aktif',
        width: 'w-24',
        render: (row) => (
          <button
            type="button"
            onClick={() => canEdit && toggleActive.mutate(row)}
            disabled={!canEdit || toggleActive.isPending}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition',
              row.is_active ? 'bg-emerald-500' : 'bg-slate-300',
              !canEdit && 'opacity-50 cursor-not-allowed',
            )}
            title={row.is_active ? 'Aktif - kapat' : 'Pasif - aç'}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition',
                row.is_active ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        ),
      },
      {
        key: 'id',
        header: 'İşlemler',
        align: 'right',
        width: 'w-44',
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(row);
                setShowForm(true);
              }}
              disabled={!canEdit}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              <Edit className="h-3.5 w-3.5" /> Düzenle
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              disabled={!canDelete}
              className="btn-secondary text-xs text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
          </div>
        ),
      },
    ],
    [canEdit, canDelete, toggleActive],
  );

  if (!canView) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Yetkiniz yok</h2>
        <p className="mt-1 text-sm text-slate-500">Bu sayfayı görüntülemek için auctions alanında yetki gerekir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Açık Arttırma Slotları</h1>
          <p className="text-sm text-slate-500 mt-1">
            Açık arttırma zaman dilimlerini tanımlayın, ilanları slotlara atayın.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => slotsQuery.refetch()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Yeni Slot
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Toplam Slot</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totals.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-emerald-600">Aktif</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{totals.active}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-sky-600">Yaklaşan</div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1">{totals.upcoming}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-amber-600">Slot Doluluk</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">
            {totals.assigned} / {totals.capacity}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={slotsQuery.data ?? []}
        rowKey={(r) => r.id}
        isLoading={slotsQuery.isLoading}
        emptyMessage="Henüz slot tanımlanmamış"
        pageSize={20}
      />

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !createMutation.isPending && !updateMutation.isPending) {
              setShowForm(false);
              setEditing(null);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                {editing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? 'Slot Düzenle' : 'Yeni Slot'}
                </h2>
                <p className="text-xs text-slate-500">
                  {editing ? 'Mevcut slot bilgilerini güncelleyin' : 'Açık arttırma için yeni bir zaman dilimi tanımlayın'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="ml-auto p-1.5 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Tarih</label>
                <div className="relative">
                  <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    className={cn('input pl-9', errors.slot_date && 'border-red-400')}
                    {...register('slot_date')}
                  />
                </div>
                {errors.slot_date && <p className="mt-1 text-xs text-red-600">{errors.slot_date.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç</label>
                  <div className="relative">
                    <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="time"
                      className={cn('input pl-9', errors.start_time && 'border-red-400')}
                      {...register('start_time')}
                    />
                  </div>
                  {errors.start_time && <p className="mt-1 text-xs text-red-600">{errors.start_time.message}</p>}
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <div className="relative">
                    <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="time"
                      className={cn('input pl-9', errors.end_time && 'border-red-400')}
                      {...register('end_time')}
                    />
                  </div>
                  {errors.end_time && <p className="mt-1 text-xs text-red-600">{errors.end_time.message}</p>}
                </div>
              </div>
              <div>
                <label className="label">Maksimum İlan</label>
                <div className="relative">
                  <Hash className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min={1}
                    max={500}
                    className={cn('input pl-9', errors.max_items && 'border-red-400')}
                    {...register('max_items', { valueAsNumber: true })}
                  />
                </div>
                {errors.max_items && <p className="mt-1 text-xs text-red-600">{errors.max_items.message}</p>}
              </div>

              <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-xs text-sky-800">
                <Power className="h-3.5 w-3.5 inline" /> Yeni slotlar otomatik olarak <b>aktif</b> oluşturulur. Aktif/pasif durumunu tablodaki anahtardan değiştirebilirsiniz.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-secondary"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  <Save className="h-4 w-4" />
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Kaydediliyor…'
                    : (
                      <>
                        <Check className="h-4 w-4" /> {editing ? 'Güncelle' : 'Oluştur'}
                      </>
                    )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Slot Sil"
        message={
          deleteTarget
            ? `${formatDate(deleteTarget.slot_date)} ${formatTime12(deleteTarget.start_time)}-${formatTime12(deleteTarget.end_time)} slotunu silmek istediğinize emin misiniz? Bu slota atanmış ${deleteTarget.assigned_count ?? 0} ilanın slot ataması kaldırılacaktir.`
            : ''
        }
        confirmText="Evet, Sil"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}
