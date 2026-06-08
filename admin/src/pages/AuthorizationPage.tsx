import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Shield, ShieldCheck, UserCheck, UserX, Lock, Mail, User as UserIcon,
  AlertCircle, Save, RefreshCw, Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate } from '../lib/utils';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';

interface AdminUserRow {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at: string | null;
  created_at: string;
}

type PermissionArea =
  | 'dashboard'
  | 'users'
  | 'auctions'
  | 'free_listings'
  | 'expertise'
  | 'site_settings'
  | 'authorization'
  | 'dealerships'
  | 'transactions';

interface AdminPermissionRow {
  id: string;
  admin_user_id: string;
  area: PermissionArea;
  can_view: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_delete: boolean;
}

const ALL_AREAS: { key: PermissionArea; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'auctions', label: 'Açık Arttırmalar' },
  { key: 'free_listings', label: 'Ücretsiz İlanlar' },
  { key: 'expertise', label: 'Ekspertiz' },
  { key: 'site_settings', label: 'Site Ayarları' },
  { key: 'authorization', label: 'Yetkilendirme' },
  { key: 'dealerships', label: 'Bayilikler' },
  { key: 'transactions', label: 'İşlemler' },
];

const newAdminSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır').regex(/^[a-zA-Z0-9_.-]+$/, 'Sadece harf, rakam, _ . - kullanılabilir'),
  full_name: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

type NewAdminForm = z.infer<typeof newAdminSchema>;

function PermissionMatrix({
  value,
  onChange,
  disabled,
}: {
  value: Record<PermissionArea, { view: boolean; edit: boolean; approve: boolean; del: boolean }>;
  onChange: (next: Record<PermissionArea, { view: boolean; edit: boolean; approve: boolean; del: boolean }>) => void;
  disabled?: boolean;
}) {
  function toggle(area: PermissionArea, field: 'view' | 'edit' | 'approve' | 'del') {
    if (disabled) return;
    onChange({
      ...value,
      [area]: { ...value[area], [field]: !value[area][field] },
    });
  }
  function toggleAll(allOn: boolean) {
    if (disabled) return;
    const next = { ...value };
    for (const a of ALL_AREAS) {
      next[a.key] = { view: allOn, edit: allOn, approve: allOn, del: allOn };
    }
    onChange(next);
  }
  const allChecked = ALL_AREAS.every((a) => value[a.key]?.view && value[a.key]?.edit && value[a.key]?.approve && value[a.key]?.del);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Tüm alanlar için görüntüle / düzenle / onayla / sil yetkilerini seçin.
        </div>
        <button
          type="button"
          onClick={() => toggleAll(!allChecked)}
          disabled={disabled}
          className="text-xs font-semibold text-sky-600 hover:text-sky-800 disabled:opacity-50"
        >
          {allChecked ? 'Tümünü Kapat' : 'Tümünü Aç'}
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-slate-600">Alan</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Görüntüle</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Düzenle</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Onayla</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Sil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ALL_AREAS.map((a) => (
              <tr key={a.key} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">{a.label}</td>
                {(['view', 'edit', 'approve', 'del'] as const).map((f) => (
                  <td key={f} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                      checked={value[a.key]?.[f] ?? false}
                      onChange={() => toggle(a.key, f)}
                      disabled={disabled}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function emptyMatrix(): Record<PermissionArea, { view: boolean; edit: boolean; approve: boolean; del: boolean }> {
  const m: Record<string, { view: boolean; edit: boolean; approve: boolean; del: boolean }> = {};
  for (const a of ALL_AREAS) m[a.key] = { view: false, edit: false, approve: false, del: false };
  return m as Record<PermissionArea, { view: boolean; edit: boolean; approve: boolean; del: boolean }>;
}

function matrixFromRows(rows: AdminPermissionRow[]): Record<PermissionArea, { view: boolean; edit: boolean; approve: boolean; del: boolean }> {
  const m = emptyMatrix();
  for (const r of rows) {
    if (m[r.area]) {
      m[r.area] = {
        view: r.can_view,
        edit: r.can_edit,
        approve: r.can_approve,
        del: r.can_delete,
      };
    }
  }
  return m;
}

export default function AuthorizationPage() {
  const { admin, hasPermission, refresh } = useAuth();
  const qc = useQueryClient();
  const [showNewAdmin, setShowNewAdmin] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<AdminUserRow | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<Record<PermissionArea, { view: boolean; edit: boolean; approve: boolean; del: boolean }>>(emptyMatrix);
  const [permLoading, setPermLoading] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [search, setSearch] = useState('');

  const canManage = hasPermission('authorization', 'edit');

  const adminsQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, user_id, username, full_name, is_active, is_super_admin, last_login_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminUserRow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (row: AdminUserRow) => {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e: any) => setGlobalError(e?.message || 'Güncellenemedi'),
  });

  const deleteAdmin = useMutation({
    mutationFn: async (row: AdminUserRow) => {
      if (!admin?.is_super_admin) throw new Error('Sadece süper admin silebilir');
      if (row.id === admin.id) throw new Error('Kendi hesabınızı silemezsiniz');
      const { error } = await supabase.from('admin_users').delete().eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => setGlobalError(e?.message || 'Silinemedi'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewAdminForm>({
    resolver: zodResolver(newAdminSchema),
    defaultValues: { email: '', username: '', full_name: '', password: '' },
  });

  const onCreateAdmin = handleSubmit(async (values) => {
    setGlobalError(null);
    if (!admin?.is_super_admin) {
      setGlobalError('Sadece süper admin yeni admin oluşturabilir');
      return;
    }
    // 1) Supabase Auth signUp
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: { data: { full_name: values.full_name } },
    });
    if (signUpErr) {
      setGlobalError(signUpErr.message);
      return;
    }
    const newUserId = signUpData.user?.id;
    if (!newUserId) {
      setGlobalError('Kullanıcı oluşturulamadı (user id alınamadı)');
      return;
    }
    // 2) admin_users satırı
    const { error: insErr } = await supabase.from('admin_users').insert({
      user_id: newUserId,
      username: values.username.trim(),
      full_name: values.full_name.trim(),
      is_active: true,
      is_super_admin: false,
      created_by: admin.id,
    });
    if (insErr) {
      setGlobalError(insErr.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    setShowNewAdmin(false);
    reset();
  });

  async function openPermissions(row: AdminUserRow) {
    setPermissionTarget(row);
    setPermError(null);
    setPermLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('id, admin_user_id, area, can_view, can_edit, can_approve, can_delete')
        .eq('admin_user_id', row.id);
      if (error) throw error;
      setPermissionMatrix(matrixFromRows((data ?? []) as unknown as AdminPermissionRow[]));
    } catch (e: any) {
      setPermError(e?.message || 'Yetkiler yüklenemedi');
      setPermissionMatrix(emptyMatrix());
    } finally {
      setPermLoading(false);
    }
  }

  async function savePermissions() {
    if (!permissionTarget) return;
    if (!admin?.is_super_admin) {
      setPermError('Sadece süper admin yetki düzenleyebilir');
      return;
    }
    setPermLoading(true);
    setPermError(null);
    try {
      const rows = ALL_AREAS.map((a) => ({
        admin_user_id: permissionTarget.id,
        area: a.key,
        can_view: permissionMatrix[a.key]?.view ?? false,
        can_edit: permissionMatrix[a.key]?.edit ?? false,
        can_approve: permissionMatrix[a.key]?.approve ?? false,
        can_delete: permissionMatrix[a.key]?.del ?? false,
      }));
      const { error } = await supabase
        .from('admin_permissions')
        .upsert(rows, { onConflict: 'admin_user_id,area' });
      if (error) throw error;
      // Eğer düzenlenen admin biz isek, auth context'i yenile
      if (permissionTarget.id === admin.id) await refresh();
      setPermissionTarget(null);
    } catch (e: any) {
      setPermError(e?.message || 'Yetkiler kaydedilemedi');
    } finally {
      setPermLoading(false);
    }
  }

  const columns: DataTableColumn<AdminUserRow>[] = useMemo(
    () => [
      {
        key: 'full_name',
        header: 'Ad Soyad',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
              {(row.full_name || row.username).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-slate-800">{row.full_name || '—'}</div>
              <div className="text-xs text-slate-500">@{row.username}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'is_super_admin',
        header: 'Rol',
        width: 'w-32',
        render: (row) =>
          row.is_super_admin ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <ShieldCheck className="h-3 w-3" /> Süper Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              <Shield className="h-3 w-3" /> Admin
            </span>
          ),
      },
      {
        key: 'is_active',
        header: 'Durum',
        width: 'w-32',
        render: (row) =>
          row.is_active ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <UserCheck className="h-3 w-3" /> Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              <UserX className="h-3 w-3" /> Pasif
            </span>
          ),
      },
      {
        key: 'last_login_at',
        header: 'Son Giriş',
        sortable: true,
        width: 'w-40',
        render: (row) => (
          <span className="text-slate-500 text-xs">{row.last_login_at ? formatDate(row.last_login_at) : '—'}</span>
        ),
      },
      {
        key: 'created_at',
        header: 'Kayıt Tarihi',
        sortable: true,
        width: 'w-40',
        render: (row) => <span className="text-slate-500 text-xs">{formatDate(row.created_at)}</span>,
      },
      {
        key: 'id',
        header: 'İşlemler',
        align: 'right',
        width: 'w-72',
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => openPermissions(row)}
              disabled={!canManage}
              className="btn-secondary text-xs disabled:opacity-50"
              title="Yetkileri düzenle"
            >
              <Shield className="h-3.5 w-3.5" /> Yetkiler
            </button>
            <button
              type="button"
              onClick={() => toggleActive.mutate(row)}
              disabled={!canManage || toggleActive.isPending}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              {row.is_active ? 'Pasif Yap' : 'Aktif Yap'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              disabled={!canManage || !admin?.is_super_admin || row.id === admin?.id}
              className="btn-secondary text-xs text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-40"
              title={
                row.id === admin?.id
                  ? 'Kendi hesabınızı silemezsiniz'
                  : !admin?.is_super_admin
                    ? 'Sadece süper admin silebilir'
                    : 'Sil'
              }
            >
              Sil
            </button>
          </div>
        ),
      },
    ],
    [canManage, admin, toggleActive],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return adminsQuery.data ?? [];
    return (adminsQuery.data ?? []).filter(
      (r) =>
        r.username.toLowerCase().includes(q) ||
        (r.full_name ?? '').toLowerCase().includes(q),
    );
  }, [adminsQuery.data, search]);

  if (!canManage) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Yetkiniz yok</h2>
        <p className="mt-1 text-sm text-slate-500">
          Bu sayfayı görüntülemek için <b>authorization</b> alanında <b>düzenleme</b> yetkisi gerekir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yetkilendirme</h1>
          <p className="text-sm text-slate-500 mt-1">
            Yönetici hesaplarını ve alan bazlı yetkileri yönetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adminsQuery.refetch()}
            className="btn-secondary"
            title="Yenile"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {admin?.is_super_admin && (
            <button
              type="button"
              onClick={() => setShowNewAdmin(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Yeni Admin
            </button>
          )}
        </div>
      </div>

      {globalError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="card p-4 flex items-center gap-3">
        <input
          type="search"
          placeholder="Kullanıcı adı veya ad ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />
        <div className="text-xs text-slate-500">
          Toplam <b>{adminsQuery.data?.length ?? 0}</b> admin
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        isLoading={adminsQuery.isLoading}
        emptyMessage="Henüz admin kaydı yok"
      />

      {/* Yeni Admin Modal */}
      {showNewAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                <UserPlusIcon />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Yeni Admin Ekle</h2>
                <p className="text-xs text-slate-500">Yeni bir yönetici hesabı oluşturun.</p>
              </div>
              <button
                onClick={() => setShowNewAdmin(false)}
                className="ml-auto p-1.5 rounded text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <form onSubmit={onCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="label">E-posta</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" className={cn('input pl-9', errors.email && 'border-red-400')} {...register('email')} />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Kullanıcı Adı</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input className={cn('input pl-9', errors.username && 'border-red-400')} {...register('username')} />
                </div>
                {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
              </div>
              <div>
                <label className="label">Ad Soyad</label>
                <input className={cn('input', errors.full_name && 'border-red-400')} {...register('full_name')} />
                {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="label">Şifre</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    className={cn('input pl-9', errors.password && 'border-red-400')}
                    {...register('password')}
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewAdmin(false)} className="btn-secondary">Vazgeç</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Oluşturuluyor…' : (<><Check className="h-4 w-4" /> Oluştur</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yetkiler Modal */}
      {permissionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Yetkiler — {permissionTarget.full_name || permissionTarget.username}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Bu adminin erişebileceği alanları ve yapabileceği işlemleri seçin.
                {permissionTarget.is_super_admin && (
                  <span className="block mt-1 text-amber-600 font-semibold">
                    Süper admin tüm alanlara tam yetkilidir — yine de kaydedebilirsiniz.
                  </span>
                )}
              </p>
              <button
                onClick={() => setPermissionTarget(null)}
                className="absolute top-3 right-3 p-1.5 rounded text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {permError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{permError}</span>
                </div>
              )}
              <PermissionMatrix
                value={permissionMatrix}
                onChange={setPermissionMatrix}
                disabled={permLoading || !admin?.is_super_admin}
              />
            </div>
            <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPermissionTarget(null)}
                className="btn-secondary"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={savePermissions}
                disabled={permLoading || !admin?.is_super_admin}
                className="btn-primary disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {permLoading ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Admini Sil"
        message={
          deleteTarget
            ? `${deleteTarget.full_name || deleteTarget.username} adlı admini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
            : ''
        }
        confirmText="Evet, Sil"
        danger
        loading={deleteAdmin.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteAdmin.mutate(deleteTarget);
        }}
      />
    </div>
  );
}

function UserPlusIcon() {
  return <UserCheck className="h-5 w-5" />;
}
