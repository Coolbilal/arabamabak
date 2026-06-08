import { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Search, Filter, X, Loader2, AlertCircle,
  UserPlus, RefreshCw, Upload, FileText, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, type AdminUser } from '../contexts/AuthContext';
import { formatDate, cn } from '../lib/utils';
import type { ExpertiseRequest, ExpertiseStatus } from '../lib/types';

type ExpRow = ExpertiseRequest & {
  user?: { full_name: string | null; email: string | null } | null;
  brand?: { name: string } | null;
  model?: { name: string } | null;
};

const STATUS_LABELS: Record<ExpertiseStatus, string> = {
  pending: 'Beklemede', assigned: 'Atandı', in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı', cancelled: 'İptal',
};
const STATUS_CLASS: Record<ExpertiseStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  assigned: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export default function ExpertisePage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [assignRow, setAssignRow] = useState<ExpRow | null>(null);
  const [reportRow, setReportRow] = useState<ExpRow | null>(null);

  const canEdit = hasPermission('expertise', 'edit');

  // ---- Expertise list ----
  const listQ = useQuery({
    queryKey: ['expertise', statusFilter, adminFilter, search],
    queryFn: async () => {
      let q = supabase
        .from('expertise_requests')
        .select('*, profiles:user_id(full_name,email), brand:vehicle_brands!expertise_requests_brand_id_fkey(name), model:vehicle_models(name)')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as ExpertiseStatus);
      if (adminFilter !== 'all') q = q.eq('assigned_admin_id', adminFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ExpRow[];
    },
  });

  // ---- Admin users (atama) ----
  const adminsQ = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id,user_id,username,full_name,is_active,is_super_admin')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  // Map admin id -> full_name (atanan uzman kolonu için)
  const adminMap = useMemo(() => {
    const m: Record<string, string> = {};
    (adminsQ.data ?? []).forEach((a) => {
      m[a.id] = a.full_name || a.username;
    });
    return m;
  }, [adminsQ.data]);

  const filtered = useMemo(() => {
    const rows = (listQ.data ?? []) as ExpRow[];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      (r.user?.full_name || '').toLowerCase().includes(s) ||
      (r.user?.email || '').toLowerCase().includes(s) ||
      (r.brand?.name || '').toLowerCase().includes(s) ||
      (r.model?.name || '').toLowerCase().includes(s) ||
      (r.plate || '').toLowerCase().includes(s)
    );
  }, [listQ.data, search]);

  // ---- Mutations ----
  const assignM = useMutation({
    mutationFn: async ({ id, adminId }: { id: string; adminId: string }) => {
      const { error } = await supabase
        .from('expertise_requests')
        .update({ assigned_admin_id: adminId, status: 'assigned' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expertise'] });
      setActionMsg({ kind: 'ok', text: 'Uzman atandı.' });
      setAssignRow(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Atama başarısız.' }),
  });

  const statusM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExpertiseStatus }) => {
      const payload: any = { status };
      if (status === 'completed') payload.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from('expertise_requests').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['expertise'] });
      setActionMsg({ kind: 'ok', text: `Durum güncellendi: ${STATUS_LABELS[vars.status]}` });
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Güncellenemedi.' }),
  });

  const reportM = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const path = `expertise-reports/${id}/report-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('expertise-reports')
        .upload(path, file, { contentType: file.type || 'application/pdf', upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from('expertise_requests')
        .update({ report_url: path, status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (dbErr) throw dbErr;
      return path;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expertise'] });
      setActionMsg({ kind: 'ok', text: 'Rapor yüklendi ve talep tamamlandı.' });
      setReportRow(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Yükleme başarısız.' }),
  });

  function clearFilters() {
    setStatusFilter('all');
    setAdminFilter('all');
    setSearch('');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-sky-600" /> Ekspertiz Talepleri
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Talepleri incele, uzmana ata, durum güncelle, ekspertiz raporu yükle.
          </p>
        </div>
        <button onClick={() => listQ.refetch()} className="btn-secondary">
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {actionMsg && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg p-3 text-sm',
          actionMsg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {actionMsg.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {actionMsg.text}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filtreler</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text" placeholder="Kullanıcı, plaka veya araç ara..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9"
            />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tüm Durumlar</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className="input" value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)}>
            <option value="all">Tüm Uzmanlar</option>
            {(adminsQ.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.full_name || a.username}{a.is_super_admin ? ' (Süper)' : ''}</option>
            ))}
          </select>
        </div>
        {(statusFilter !== 'all' || adminFilter !== 'all' || search) && (
          <button onClick={clearFilters} className="mt-3 text-xs text-sky-600 hover:underline inline-flex items-center gap-1">
            <X className="h-3 w-3" /> Filtreleri temizle
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {listQ.isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
          </div>
        ) : listQ.isError ? (
          <div className="p-6 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> Talepler yüklenemedi.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Talep bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Kullanıcı</th>
                  <th className="text-left px-4 py-3 font-medium">Araç</th>
                  <th className="text-left px-4 py-3 font-medium">Şehir</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                  <th className="text-left px-4 py-3 font-medium">Atanan Uzman</th>
                  <th className="text-left px-4 py-3 font-medium">Tarih</th>
                  <th className="text-right px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const vehicleLabel = row.brand?.name
                    ? `${row.brand.name} ${row.model?.name || ''} ${row.year || ''}`.trim()
                    : row.plate || '—';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.user?.full_name || '—'}</div>
                        <div className="text-xs text-slate-400">{row.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{vehicleLabel}</td>
                      <td className="px-4 py-3 text-slate-600">{row.city}</td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <div className="relative inline-block">
                            <select
                              value={row.status}
                              onChange={(e) => statusM.mutate({ id: row.id, status: e.target.value as ExpertiseStatus })}
                              className={cn(
                                'appearance-none rounded-full pl-3 pr-7 py-0.5 text-xs font-semibold cursor-pointer',
                                STATUS_CLASS[row.status],
                              )}
                            >
                              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                            <ChevronDown className="h-3 w-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        ) : (
                          <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_CLASS[row.status])}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.assigned_admin_id
                          ? (adminMap[row.assigned_admin_id] || '—')
                          : <span className="text-xs text-slate-400 italic">atanmamış</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setAssignRow(row)}
                            disabled={!canEdit}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Ata
                          </button>
                          <button
                            onClick={() => setReportRow(row)}
                            disabled={!canEdit}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Upload className="h-3.5 w-3.5" /> Rapor
                          </button>
                          {row.report_url && (
                            <a
                              href={`${(supabase as any).storage?.from?.('expertise-reports')?.getPublicUrl?.(row.report_url)?.data?.publicUrl || '#'}`}
                              target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <FileText className="h-3.5 w-3.5" /> Aç
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignRow && (
        <AssignModal
          row={assignRow}
          admins={(adminsQ.data ?? []) as AdminUser[]}
          busy={assignM.isPending}
          onClose={() => setAssignRow(null)}
          onAssign={(adminId) => assignM.mutate({ id: assignRow.id, adminId })}
        />
      )}

      {/* Report Upload Modal */}
      {reportRow && (
        <ReportModal
          row={reportRow}
          busy={reportM.isPending}
          onClose={() => setReportRow(null)}
          onUpload={(file) => reportM.mutate({ id: reportRow.id, file })}
        />
      )}
    </div>
  );
}

// ---------------- Assign Modal ----------------
function AssignModal({
  row, admins, busy, onClose, onAssign,
}: {
  row: ExpRow;
  admins: AdminUser[];
  busy: boolean;
  onClose: () => void;
  onAssign: (adminId: string) => void;
}) {
  const [picked, setPicked] = useState<string>(row.assigned_admin_id || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-sky-600" /> Uzman Ata
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">
            <strong>{row.user?.full_name || 'Kullanıcı'}</strong> talebine atanacak uzmanı seçin.
          </p>
          <select className="input" value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">— Seçiniz —</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name || a.username}{a.is_super_admin ? ' (Süper Admin)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Vazgeç</button>
          <button
            onClick={() => picked && onAssign(picked)}
            disabled={!picked || busy}
            className="btn-primary"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ata'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Report Upload Modal ----------------
function ReportModal({
  row, busy, onClose, onUpload,
}: {
  row: ExpRow;
  busy: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-600" /> Rapor Yükle
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{row.user?.full_name || 'Kullanıcı'}</strong> için ekspertiz raporu yükleyin.
            Yükleme sonrası talep otomatik olarak <em>tamamlandı</em> durumuna geçer.
          </p>
          <input
            ref={ref}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-700"
          />
          {file && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="truncate">{file.name}</span>
              <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Vazgeç</button>
          <button
            onClick={() => file && onUpload(file)}
            disabled={!file || busy}
            className="btn-primary"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yükle'}
          </button>
        </div>
      </div>
    </div>
  );
}
