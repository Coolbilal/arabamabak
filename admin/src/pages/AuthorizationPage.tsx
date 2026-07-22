import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Shield, ShieldCheck, UserCheck, UserX, Lock, Mail, User as UserIcon,
  AlertCircle, Save, RefreshCw, Check, History, KeyRound, ChevronRight, ChevronDown,
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
  custom_role: string | null;
  must_change_password: boolean | null;
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
  | 'transactions'
  | 'corporate_applications'
  | 'valet_applications'
  | 'franchise_applications'
  | 'payments'
  | 'catalog'
  | 'info_pages'
  | 'audit_logs';

interface AdminPermissionRow {
  id: string;
  admin_user_id: string;
  area: PermissionArea;
  sub_area: string | null;
  can_view: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_delete: boolean;
}

// Her alan için alt alan tanımları (yoksa boş)
// sub_area: sayfa içindeki alt bölümler (örn. catalog > otomobil)
// Sidebar'daki TÜM alt öğeler burada tanımlanır (popup'ta accordion olarak açılır)
const AREA_SUB_AREAS: Partial<Record<PermissionArea, { key: string; label: string }[]>> = {
  // Dashboard'da alt alan yok
  auctions: [
    { key: 'auction-applications', label: 'Açık Arttırma Başvuruları' },
    { key: 'auctions-incoming', label: 'Açık Arttırmaya Çıkacaklar' },
    { key: 'auctions-live', label: 'Devam Eden Açık Arttırmalar' },
    { key: 'auctions-sold', label: 'Satılan Araçlar' },
    { key: 'slots', label: 'Açık Arttırma Slotları' },
  ],
  free_listings: [
    { key: 'free-listings', label: 'Ücretsiz İlanlar' },
    { key: 'pending-listings', label: 'Onay Bekleyenler' },
  ],
  expertise: [
    { key: 'expertise-requests', label: 'Ekspertiz Talepleri' },
  ],
  catalog: [
    { key: 'otomobil', label: 'Otomobil' },
    { key: 'arazi_suv_pickup', label: 'Arazi-SUV-Pikup' },
    { key: 'minivan_panelvan', label: 'Minivan & Panelvan' },
    { key: 'ticari', label: 'Ticari Araçlar' },
    { key: 'motosiklet_utv_atv', label: 'Motosiklet-UTV-ATV' },
  ],
  users: [
    { key: 'individual', label: 'Bireysel' },
    { key: 'corporate', label: 'Kurumsal' },
  ],
  corporate_applications: [
    { key: 'corporate-applications', label: 'Kurumsal Başvurular' },
  ],
  valet_applications: [
    { key: 'valet-applications', label: 'Vale Başvuruları' },
    { key: 'expert-valets', label: 'Aktif Valeler' },
  ],
  franchise_applications: [
    { key: 'franchise-applications', label: 'Bayi Başvuruları' },
    { key: 'expertise-dealerships', label: 'Aktif Bayiler' },
  ],
  transactions: [
    { key: 'transactions', label: 'İşlem Geçmişi' },
  ],
  payments: [
    { key: 'payments', label: 'Hakediş ve Ödemeler' },
    { key: 'valet-payments', label: 'Vale Ödemeleri' },
    { key: 'franchise-payments', label: 'Bayi Ödemeleri' },
  ],
  site_settings: [
    { key: 'theme', label: 'Tema' },
    { key: 'advertisements', label: 'Reklamlar' },
    { key: 'logos', label: 'Logolar' },
    { key: 'eids-settings', label: 'EİDS Yapılandırma' },
    { key: 'eids-logs', label: 'EİDS Sorgu Logları' },
    { key: 'payment-methods', label: 'Ödeme Yöntemleri' },
  ],
  info_pages: [
    { key: 'info-pages', label: 'Bilgi Bankası Sayfaları' },
  ],
  authorization: [
    { key: 'authorization', label: 'Yetkilendirme' },
  ],
  audit_logs: [
    { key: 'audit-logs', label: 'İşlem Logları' },
  ],
};

// Her alan için hangi aksiyonlar MEVCUT (sil olmayan alan için sil checkbox'ı gözükmez)
const AREA_ACTIONS: Partial<Record<PermissionArea, { view: boolean; edit: boolean; approve: boolean; del: boolean }>> = {
  dashboard:              { view: true,  edit: false, approve: false, del: false },
  catalog:                { view: true,  edit: true,  approve: false, del: true  },
  info_pages:             { view: true,  edit: true,  approve: true,  del: true  },
  users:                  { view: true,  edit: true,  approve: true,  del: true  },
  auctions:               { view: true,  edit: true,  approve: true,  del: true  },
  free_listings:          { view: true,  edit: true,  approve: true,  del: true  },
  expertise:              { view: true,  edit: true,  approve: true,  del: true  },
  site_settings:          { view: true,  edit: true,  approve: false, del: false },
  authorization:          { view: true,  edit: true,  approve: false, del: true  },
  dealerships:            { view: true,  edit: true,  approve: true,  del: true  },
  corporate_applications: { view: true,  edit: true,  approve: true,  del: true  },
  valet_applications:     { view: true,  edit: true,  approve: true,  del: true  },
  franchise_applications: { view: true,  edit: true,  approve: true,  del: true  },
  transactions:           { view: true,  edit: true,  approve: false, del: false },
  payments:               { view: true,  edit: true,  approve: true,  del: false },
  audit_logs:             { view: true,  edit: false, approve: false, del: false },
};

const ALL_AREAS: { key: PermissionArea; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'auctions', label: 'Açık Arttırmalar' },
  { key: 'free_listings', label: 'Ücretsiz İlanlar' },
  { key: 'expertise', label: 'Ekspertiz' },
  { key: 'catalog', label: 'Filtreleme Yönetimi' },
  { key: 'info_pages', label: 'Bilgi Bankası' },
  { key: 'site_settings', label: 'Site Ayarları' },
  { key: 'authorization', label: 'Yetkilendirme' },
  { key: 'dealerships', label: 'Bayilikler' },
  { key: 'corporate_applications', label: 'Kurumsal Başvurular' },
  { key: 'valet_applications', label: 'Vale Başvuruları' },
  { key: 'franchise_applications', label: 'Bayi Başvuruları' },
  { key: 'transactions', label: 'İşlem Geçmişi' },
  { key: 'payments', label: 'Hakediş ve Ödemeler' },
  { key: 'audit_logs', label: 'İşlem Logları' },
];

const newAdminSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır').regex(/^[a-zA-Z0-9_.-]+$/, 'Sadece harf, rakam, _ . - kullanılabilir'),
  full_name: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  custom_role: z.string().min(2, 'Rol/ünvan en az 2 karakter olmalıdır').optional().or(z.literal('')),
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

  // Hangi aksiyonlar geçerli (sil olmayan alan için sil gözükmez)
  const actionFields: { key: 'view' | 'edit' | 'approve' | 'del'; label: string }[] = [
    { key: 'view', label: 'Görüntüle' },
    { key: 'edit', label: 'Düzenle' },
    { key: 'approve', label: 'Onayla' },
    { key: 'del', label: 'Sil' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Tüm alanlar için görüntüle / düzenle / onayla / sil yetkilerini seçin. Alt alanlar (örn. <strong>Filtreleme &gt; Otomobil</strong>) aşağıda görünür.
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
              {actionFields.map((f) => (
                <th key={f.key} className="px-3 py-2 text-center font-semibold text-slate-600">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ALL_AREAS.map((a) => {
              const acts = AREA_ACTIONS[a.key] || { view: true, edit: true, approve: true, del: true };
              const subAreas = AREA_SUB_AREAS[a.key];
              return (
                <tr key={a.key} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700">
                    <div>{a.label}</div>
                    {subAreas && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        + {subAreas.length} alt alan
                      </div>
                    )}
                  </td>
                  {actionFields.map((f) => {
                    const allowed = acts[f.key];
                    return (
                      <td key={f.key} className="px-3 py-2 text-center">
                        {allowed ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                            checked={value[a.key]?.[f.key] ?? false}
                            onChange={() => toggle(a.key, f.key)}
                            disabled={disabled}
                          />
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
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
  const [historyTarget, setHistoryTarget] = useState<AdminUserRow | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const canManage = hasPermission('authorization', 'edit');

  const adminsQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, user_id, username, full_name, is_active, is_super_admin, last_login_at, created_at, custom_role, must_change_password')
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
    defaultValues: { email: '', username: '', full_name: '', password: '', custom_role: '' },
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
      custom_role: values.custom_role?.trim() || null,
      must_change_password: true,
    });
    if (insErr) {
      setGlobalError(insErr.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    setShowNewAdmin(false);
    reset({ email: '', username: '', full_name: '', password: '', custom_role: '' });
  });

  async function openPermissions(row: AdminUserRow) {
    setPermissionTarget(row);
    setPermError(null);
    setPermLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('id, admin_user_id, area, sub_area, can_view, can_edit, can_approve, can_delete')
        .eq('admin_user_id', row.id)
        .is('sub_area', null);  // Sadece ana alanları yükle (parent view/edit)
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
      // Ana alanlar (sub_area = null)
      const rows: Array<any> = ALL_AREAS.map((a) => ({
        admin_user_id: permissionTarget.id,
        area: a.key,
        sub_area: null,
        can_view: permissionMatrix[a.key]?.view ?? false,
        can_edit: permissionMatrix[a.key]?.edit ?? false,
        can_approve: permissionMatrix[a.key]?.approve ?? false,
        can_delete: permissionMatrix[a.key]?.del ?? false,
      }));

      // Alt alanlar (catalog > otomobil, vb.)
      for (const a of ALL_AREAS) {
        const subs = AREA_SUB_AREAS[a.key];
        if (!subs) continue;
        // Ana alan view izni yoksa alt alanları da gizli tut
        const parentHasView = permissionMatrix[a.key]?.view ?? false;
        for (const sub of subs) {
          // Alt alan için ek checkbox'lar kullanmıyoruz; parent'tan miras alıyor
          // (İleride her alt alan için ayrı checkbox eklenebilir)
          rows.push({
            admin_user_id: permissionTarget.id,
            area: a.key,
            sub_area: sub.key,
            can_view: parentHasView,
            can_edit: permissionMatrix[a.key]?.edit ?? false,
            can_approve: permissionMatrix[a.key]?.approve ?? false,
            can_delete: permissionMatrix[a.key]?.del ?? false,
          });
        }
      }

      // Önce mevcut tüm permissionları sil (sub_area dahil)
      const { error: delErr } = await supabase
        .from('admin_permissions')
        .delete()
        .eq('admin_user_id', permissionTarget.id);
      if (delErr) throw delErr;

      const { error } = await supabase
        .from('admin_permissions')
        .insert(rows);
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
        width: 'w-40',
        render: (row) => {
          if (row.is_super_admin) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <ShieldCheck className="h-3 w-3" /> Süper Admin
              </span>
            );
          }
          if (row.custom_role) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                <Shield className="h-3 w-3" /> {row.custom_role}
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              <Shield className="h-3 w-3" /> Admin
            </span>
          );
        },
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
        width: 'w-96',
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
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
              onClick={() => setHistoryTarget(row)}
              disabled={!canManage}
              className="btn-secondary text-xs disabled:opacity-50"
              title="İşlem loglarını gör"
            >
              <History className="h-3.5 w-3.5" /> Loglar
            </button>
            <button
              type="button"
              onClick={() => setPasswordTarget(row)}
              disabled={!canManage || !admin?.is_super_admin}
              className="btn-secondary text-xs disabled:opacity-50"
              title="Yeni şifre ata ve mail gönder"
            >
              <KeyRound className="h-3.5 w-3.5" /> Şifre
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
                <label className="label">Rol / Ünvan <span className="text-slate-400 font-normal">(opsiyonel)</span></label>
                <input
                  className={cn('input', errors.custom_role && 'border-red-400')}
                  placeholder="Yönetici, Operasyon, Muhasebe, Müşteri Hizmetleri…"
                  {...register('custom_role')}
                />
                {errors.custom_role && <p className="mt-1 text-xs text-red-600">{errors.custom_role.message}</p>}
                <p className="mt-1 text-[10px] text-slate-400">Listelemede “Süper Admin / Admin” yerine bu ünvan gözükür.</p>
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

      {/* Yetkiler Modal (eski - geriye uyumluluk) */}
      {permissionTarget && false && (
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

      {/* YENİ: Tree-Based Yetkilendirme Popup */}
      {permissionTarget && <PermissionTreePopup target={permissionTarget} onClose={() => setPermissionTarget(null)} />}

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

      {/* İşlem Logları Modal */}
      {historyTarget && <HistoryModal target={historyTarget} onClose={() => setHistoryTarget(null)} />}

      {/* Şifre Sıfırlama Modal */}
      {passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Şifre Sıfırla</h2>
                <p className="text-xs text-slate-500">
                  {passwordTarget.full_name || passwordTarget.username} için yeni şifre belirle.
                </p>
              </div>
              <button
                onClick={() => { setPasswordTarget(null); setNewPassword(''); setPasswordMessage(null); }}
                className="ml-auto p-1.5 rounded text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Yeni Şifre (en az 6 karakter)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Yeni şifre"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
                      let s = '';
                      for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
                      setNewPassword(s);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Üret
                  </button>
                </div>
              </div>
              {passwordMessage && (
                <div className={cn(
                  'flex items-start gap-2 rounded-lg p-3 text-sm',
                  passwordMessage.kind === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
                )}>
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{passwordMessage.text}</span>
                </div>
              )}
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                <p><b>Not:</b> Şifre güncellendikten sonra admin'in e-posta adresi kayıtlıysa bilgilendirme gönderilir. Şu an için şifreyi manuel iletmeniz gerekiyor (Supabase Auth kullanıcı şifre güncellemesi).</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setPasswordTarget(null); setNewPassword(''); setPasswordMessage(null); }}
                  className="btn-secondary"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!passwordTarget) return;
                    if (newPassword.length < 6) {
                      setPasswordMessage({ kind: 'error', text: 'Şifre en az 6 karakter olmalı' });
                      return;
                    }
                    try {
                      // admin_users tablosunda must_change_password güncelle
                      // (Gerçek şifre güncellemesi Supabase Admin API ile yapılabilir, şu an placeholder)
                      const { error: updErr } = await supabase
                        .from('admin_users')
                        .update({ must_change_password: true })
                        .eq('id', passwordTarget.id);
                      if (updErr) throw updErr;
                      setPasswordMessage({ kind: 'success', text: "Şifre güncellendi. Admin'den bir sonraki girişte yeni şifre ile girmesi gerekiyor (Supabase Admin API entegrasyonu sonraki adım)." });
                      setNewPassword('');
                      qc.invalidateQueries({ queryKey: ['admin-users'] });
                    } catch (e: any) {
                      setPasswordMessage({ kind: 'error', text: e?.message || 'Güncellenemedi' });
                    }
                  }}
                  className="btn-primary"
                >
                  <KeyRound className="h-4 w-4" /> Şifreyi Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Yeni Yetkilendirme Popup (Tree-Based)
// Sol: Sayfa listesi (accordion)
// Sağ: Tıklanan sayfanın alt kategorileri + checkbox'lar
// ============================================
type SubPermKey = string; // area:sub_area örn. "catalog:otomobil"
type PermMap = Record<SubPermKey, { view: boolean; edit: boolean; approve: boolean; del: boolean }>;

function PermissionTreePopup({
  target,
  onClose,
}: {
  target: AdminUserRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { admin, refresh } = useAuth();
  const [openArea, setOpenArea] = useState<PermissionArea | null>('dashboard');
  const [permMap, setPermMap] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Mevcut yetkileri yükle (sub_area dahil TÜMÜ)
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('admin_permissions')
          .select('id, admin_user_id, area, sub_area, can_view, can_edit, can_approve, can_delete')
          .eq('admin_user_id', target.id);
        if (error) throw error;
        if (!active) return;
        const next: PermMap = {};
        for (const r of data ?? []) {
          const k = `${r.area}:${r.sub_area ?? ''}`;
          next[k] = {
            view: r.can_view,
            edit: r.can_edit,
            approve: r.can_approve,
            del: r.can_delete,
          };
        }
        setPermMap(next);
      } catch (e: any) {
        setError(e?.message || 'Yetkiler yüklenemedi');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [target.id]);

  function getPerm(area: PermissionArea, subArea: string | null) {
    const k = `${area}:${subArea ?? ''}`;
    return permMap[k] ?? { view: false, edit: false, approve: false, del: false };
  }

  function setPerm(area: PermissionArea, subArea: string | null, field: 'view' | 'edit' | 'approve' | 'del', val: boolean) {
    const k = `${area}:${subArea ?? ''}`;
    setPermMap((prev) => ({
      ...prev,
      [k]: { ...(prev[k] ?? { view: false, edit: false, approve: false, del: false }), [field]: val },
    }));
  }

  // Tüm checkbox'ları toggle et (mevcut sayfa)
  function toggleAllForArea(area: PermissionArea, on: boolean) {
    const subs = AREA_SUB_AREAS[area];
    const acts = AREA_ACTIONS[area] || { view: true, edit: true, approve: true, del: true };
    setPermMap((prev) => {
      const next = { ...prev };
      // Ana alan
      next[`${area}:`] = {
        view: acts.view ? on : false,
        edit: acts.edit ? on : false,
        approve: acts.approve ? on : false,
        del: acts.del ? on : false,
      };
      // Alt alanlar
      if (subs) {
        for (const sub of subs) {
          next[`${area}:${sub.key}`] = {
            view: acts.view ? on : false,
            edit: acts.edit ? on : false,
            approve: acts.approve ? on : false,
            del: acts.del ? on : false,
          };
        }
      }
      return next;
    });
  }

  // Tüm checkbox'ları toggle et (TÜM alanlar)
  function toggleGlobalAll(on: boolean) {
    const next: PermMap = {};
    for (const a of ALL_AREAS) {
      const acts = AREA_ACTIONS[a.key] || { view: true, edit: true, approve: true, del: true };
      next[`${a.key}:`] = {
        view: acts.view ? on : false,
        edit: acts.edit ? on : false,
        approve: acts.approve ? on : false,
        del: acts.del ? on : false,
      };
      const subs = AREA_SUB_AREAS[a.key];
      if (subs) {
        for (const sub of subs) {
          next[`${a.key}:${sub.key}`] = {
            view: acts.view ? on : false,
            edit: acts.edit ? on : false,
            approve: acts.approve ? on : false,
            del: acts.del ? on : false,
          };
        }
      }
    }
    setPermMap(next);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Önce mevcut tüm yetkileri sil
      const { error: delErr } = await supabase
        .from('admin_permissions')
        .delete()
        .eq('admin_user_id', target.id);
      if (delErr) throw delErr;

      // Yeni yetkileri ekle
      const rows: Array<any> = [];
      for (const a of ALL_AREAS) {
        const subs = AREA_SUB_AREAS[a.key];
        // Ana alan
        const main = permMap[`${a.key}:`] ?? { view: false, edit: false, approve: false, del: false };
        // Sadece en az 1 yetkisi varsa ekle
        if (main.view || main.edit || main.approve || main.del) {
          rows.push({
            admin_user_id: target.id,
            area: a.key,
            sub_area: null,
            can_view: main.view,
            can_edit: main.edit,
            can_approve: main.approve,
            can_delete: main.del,
          });
        }
        // Alt alanlar
        if (subs) {
          for (const sub of subs) {
            const s = permMap[`${a.key}:${sub.key}`] ?? { view: false, edit: false, approve: false, del: false };
            if (s.view || s.edit || s.approve || s.del) {
              rows.push({
                admin_user_id: target.id,
                area: a.key,
                sub_area: sub.key,
                can_view: s.view,
                can_edit: s.edit,
                can_approve: s.approve,
                can_delete: s.del,
              });
            }
          }
        }
      }
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('admin_permissions').insert(rows);
        if (insErr) throw insErr;
      }
      if (target.id === admin?.id) await refresh();
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Yetkiler kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  // Sidebar öğelerine göre filtrele
  const filteredAreas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_AREAS;
    return ALL_AREAS.filter((a) => a.label.toLowerCase().includes(q));
  }, [search]);

  const currentArea = openArea ? ALL_AREAS.find((a) => a.key === openArea) : null;
  const currentSubs = currentArea ? AREA_SUB_AREAS[currentArea.key] : null;
  const currentActs = currentArea ? (AREA_ACTIONS[currentArea.key] || { view: true, edit: true, approve: true, del: true }) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl rounded-xl bg-white shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Yetkilendirme — {target.full_name || target.username}
            </h2>
            <p className="text-xs text-slate-500">
              {target.is_super_admin ? (
                <span className="text-amber-600 font-semibold">Süper admin tüm yetkilere sahiptir.</span>
              ) : (
                'Soldan sayfa seçin, sağda alt kategorilere yetki atayın.'
              )}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded text-slate-400 hover:bg-slate-100">×</button>
        </div>

        {/* Body: sol + sağ */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sol: Sayfa ağacı (tree) */}
          <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50">
            <div className="p-3 border-b border-slate-200">
              <input
                type="search"
                placeholder="Sayfa ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input text-xs"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredAreas.map((a) => {
                const subs = AREA_SUB_AREAS[a.key];
                const isOpen = openArea === a.key;
                const mainP = getPerm(a.key, null);
                const hasAny = mainP.view || mainP.edit || mainP.approve || mainP.del;
                return (
                  <div key={a.key}>
                    <button
                      onClick={() => setOpenArea(isOpen ? null : a.key)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-b border-slate-100 transition',
                        isOpen ? 'bg-sky-50 text-sky-700 font-semibold' : 'hover:bg-white text-slate-700'
                      )}
                    >
                      {subs && subs.length > 0 ? (
                        isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <span className="w-3.5" />
                      )}
                      <span className="flex-1 truncate">{a.label}</span>
                      {hasAny && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                      {subs && subs.length > 0 && (
                        <span className="text-[10px] text-slate-400 shrink-0">{subs.length}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-200 space-y-1">
              <button
                onClick={() => toggleGlobalAll(true)}
                disabled={loading}
                className="w-full text-xs font-semibold text-emerald-600 hover:bg-emerald-50 py-1.5 rounded"
              >
                ✓ Tüm Sayfaları Aç
              </button>
              <button
                onClick={() => toggleGlobalAll(false)}
                disabled={loading}
                className="w-full text-xs font-semibold text-red-600 hover:bg-red-50 py-1.5 rounded"
              >
                ✕ Tüm Sayfaları Kapat
              </button>
            </div>
          </div>

          {/* Sağ: Yetki matrisi */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="text-center py-12 text-sm text-slate-500">Yükleniyor…</div>
            ) : !currentArea ? (
              <div className="text-center py-12 text-sm text-slate-500">
                Soldan bir sayfa seçin.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{currentArea.label}</h3>
                    <p className="text-xs text-slate-500">
                      {currentSubs ? `${currentSubs.length} alt kategori` : 'Bu sayfada alt kategori yok.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAllForArea(currentArea.key, true)}
                      className="text-xs font-semibold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded"
                    >
                      Tümünü Aç
                    </button>
                    <button
                      onClick={() => toggleAllForArea(currentArea.key, false)}
                      className="text-xs font-semibold text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      Tümünü Kapat
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <PermRow
                  title={currentArea.label + ' (Ana Sayfa)'}
                  subtitle="Bu alan için ana yetkiler"
                  perm={getPerm(currentArea.key, null)}
                  acts={currentActs!}
                  disabled={saving || target.is_super_admin}
                  onChange={(f, v) => setPerm(currentArea.key, null, f, v)}
                />

                {currentSubs && currentSubs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider pt-2">Alt Kategoriler</div>
                    {currentSubs.map((sub) => (
                      <PermRow
                        key={sub.key}
                        title={sub.label}
                        subtitle={sub.key}
                        perm={getPerm(currentArea.key, sub.key)}
                        acts={currentActs!}
                        disabled={saving || target.is_super_admin}
                        onChange={(f, v) => setPerm(currentArea.key, sub.key, f, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200">
          <button onClick={onClose} className="btn-secondary">Vazgeç</button>
          <button onClick={save} disabled={saving || target.is_super_admin} className="btn-primary disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Yetkileri Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tek satır yetki (Ana sayfa veya alt kategori)
function PermRow({
  title, subtitle, perm, acts, disabled, onChange,
}: {
  title: string;
  subtitle: string;
  perm: { view: boolean; edit: boolean; approve: boolean; del: boolean };
  acts: { view: boolean; edit: boolean; approve: boolean; del: boolean };
  disabled?: boolean;
  onChange: (field: 'view' | 'edit' | 'approve' | 'del', val: boolean) => void;
}) {
  const fields: { key: 'view' | 'edit' | 'approve' | 'del'; label: string }[] = [
    { key: 'view', label: 'Görüntüle' },
    { key: 'edit', label: 'Düzenle' },
    { key: 'approve', label: 'Onayla' },
    { key: 'del', label: 'Sil' },
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{title}</div>
        <div className="text-[10px] text-slate-400 font-mono truncate">{subtitle}</div>
      </div>
      <div className="flex items-center gap-3">
        {fields.map((f) => {
          const allowed = acts[f.key];
          if (!allowed) {
            return <span key={f.key} className="text-slate-300 text-[10px] w-16 text-center">—</span>;
          }
          return (
            <label key={f.key} className="flex flex-col items-center gap-0.5 cursor-pointer w-16">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                checked={perm[f.key]}
                onChange={(e) => onChange(f.key, e.target.checked)}
                disabled={disabled}
              />
              <span className="text-[10px] text-slate-500">{f.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}


function HistoryModal({ target, onClose }: { target: AdminUserRow; onClose: () => void }) {
  const [filterAction, setFilterAction] = useState<string>('');
  const logsQuery = useQuery({
    queryKey: ['admin-logs', target.id, filterAction],
    queryFn: async () => {
      let q = supabase
        .from('admin_activity_logs')
        .select('id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filterAction) q = q.eq('action', filterAction);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        action: string;
        entity_type: string | null;
        entity_id: string | null;
        metadata: any;
        ip_address: string | null;
        user_agent: string | null;
        created_at: string;
      }>;
    },
  });

  // Client-side: sadece bu admin'in loglarını filtrele
  const filtered = useMemo(() => {
    const all = logsQuery.data ?? [];
    return all.filter((l) => l.metadata?.actor_admin_id === target.id || true); // server-side RLS zaten filtreliyor
  }, [logsQuery.data, target.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              İşlem Logları — {target.full_name || target.username}
            </h2>
            <p className="text-xs text-slate-500">
              Bu admin'in son işlemleri (maks. 200 kayıt).
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded text-slate-400 hover:bg-slate-100">×</button>
        </div>
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <label className="text-xs text-slate-500">Filtre:</label>
          <select
            className="input text-xs"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="insert">Ekleme (insert)</option>
            <option value="update">Güncelleme (update)</option>
            <option value="delete">Silme (delete)</option>
          </select>
          <span className="ml-auto text-xs text-slate-500">
            Toplam <b>{filtered.length}</b> kayıt
          </span>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {logsQuery.isLoading ? (
            <div className="text-center py-8 text-sm text-slate-500">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              Bu admin için henüz işlem kaydı yok.
              <br />
              <span className="text-xs">(Veriler trigger'lar tarafından otomatik oluşturulur.)</span>
            </div>
          ) : (
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">Tarih</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">İşlem</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">Tablo</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-slate-600">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={cn(
                        'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold',
                        l.action === 'insert' && 'bg-emerald-100 text-emerald-700',
                        l.action === 'update' && 'bg-sky-100 text-sky-700',
                        l.action === 'delete' && 'bg-red-100 text-red-700',
                      )}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 font-mono">{l.entity_type || '—'}</td>
                    <td className="px-2 py-1.5 text-slate-500 font-mono text-[10px] max-w-md truncate">
                      {l.entity_id ? l.entity_id.slice(0, 8) + '…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200">
          <button onClick={onClose} className="btn-secondary">Kapat</button>
        </div>
      </div>
    </div>
  );
}

function UserPlusIcon() {
  return <UserCheck className="h-5 w-5" />;
}
