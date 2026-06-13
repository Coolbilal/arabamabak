import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { cn, formatDate } from '../lib/utils';
import {
  AlertCircle, Car, CheckCircle2, ChevronRight, Eye, Loader2,
  Search, X, XCircle,
} from 'lucide-react';
import type { ExpertValetApplication } from '../lib/types';

interface ValetAppRow extends ExpertValetApplication {
  city?: { name: string } | null;
  district?: { name: string } | null;
}

type Tab = 'pending' | 'approved' | 'rejected';

export default function ExpertValetApplicationsPage() {
  const { admin } = useAuth();
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ValetAppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ValetAppRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('expert_valet_applications')
      .select(`
        id, first_name, last_name, tc_id_number, email, phone,
        city_id, district_id, neighborhood, license_number, license_class, vehicle_info,
        contract_accepted_at, status, rejection_reason,
        created_at, reviewed_at, created_user_id, updated_at,
        city:city_id(name),
        district:district_id(name)
      `)
      .eq('status', tab)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) { setError('Başvurular yüklenemedi: ' + error.message); setLoading(false); return; }
    setRows((data || []) as unknown as ValetAppRow[]);
    setLoading(false);
  }

  async function loadCounts() {
    const { data } = await supabase
      .from('expert_valet_applications')
      .select('status', { count: 'exact' })
      .is('deleted_at', null);
    if (data) {
      const c = { pending: 0, approved: 0, rejected: 0 };
      data.forEach((r: { status: Tab }) => { c[r.status] = (c[r.status] || 0) + 1; });
      setCounts(c);
    }
  }

  useEffect(() => { load(); loadCounts(); }, [tab]);

  async function handleApprove(row: ValetAppRow) {
    if (!confirm(`${row.first_name} ${row.last_name} için vale hesabı açılsın mı?\n\nE-posta: ${row.email}\nŞifre: ${row.password_temp}`)) return;
    setActionLoading(true);
    setError(null);
    try {
      // 1) Supabase Auth'ta user oluştur
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: row.email,
        password: row.password_temp || 'Valet2026!',
        email_confirm: true,
        user_metadata: {
          full_name: `${row.first_name} ${row.last_name}`,
          phone: row.phone,
        },
      });
      if (authErr) throw new Error('Auth user oluşturulamadı: ' + authErr.message);
      const newUserId = authData.user.id;

      // 2) profiles
      const { error: profErr } = await supabaseAdmin.from('profiles').insert({
        id: newUserId,
        email: row.email,
        full_name: `${row.first_name} ${row.last_name}`,
        phone: row.phone,
        city: row.city?.name,
        district: row.district?.name,
        role: 'valet',
        account_type: 'individual',
        email_verified_at: new Date().toISOString(),
        is_phone_verified: false,
        wallet_balance: 0,
        locale: 'tr',
      });
      if (profErr) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw new Error('Profile oluşturulamadı: ' + profErr.message);
      }

      // 3) expert_valets
      const { error: valetErr } = await supabaseAdmin.from('expert_valets').insert({
        user_id: newUserId,
        full_name: `${row.first_name} ${row.last_name}`,
        phone: row.phone,
        city: row.city?.name,
        district: row.district?.name,
        license_number: row.license_number,
        license_class: row.license_class,
        is_active: true,
        average_rating: 0,
        total_tasks: 0,
        total_ratings: 0,
        total_completed_tasks: 0,
      });
      if (valetErr) {
        await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw new Error('Vale kaydı oluşturulamadı: ' + valetErr.message);
      }

      // 4) Başvuruyu onaylandı olarak güncelle
      const { error: updErr } = await supabaseAdmin
        .from('expert_valet_applications')
        .update({
          status: 'approved',
          reviewed_by: admin?.user_id,
          reviewed_at: new Date().toISOString(),
          created_user_id: newUserId,
          password_temp: null,
        })
        .eq('id', row.id);
      if (updErr) throw new Error('Başvuru güncellenemedi: ' + updErr.message);

      alert(`✅ Vale hesabı açıldı!\n\nE-posta: ${row.email}\nŞifre: ${row.password_temp}\n\nBu bilgiler mail ile gönderilebilir.`);
      setSelected(null);
      load();
      loadCounts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    if (!rejectReason.trim()) {
      alert('Lütfen red sebebini yazın.');
      return;
    }
    if (!confirm('Başvuruyu reddetmek istediğinize emin misiniz?')) return;
    setActionLoading(true);
    setError(null);
    try {
      const { error } = await supabaseAdmin
        .from('expert_valet_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason.trim(),
          reviewed_by: admin?.user_id,
          reviewed_at: new Date().toISOString(),
          password_temp: null,
        })
        .eq('id', selected.id);
      if (error) throw error;
      alert('Başvuru reddedildi.');
      setShowRejectModal(false);
      setRejectReason('');
      setSelected(null);
      load();
      loadCounts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.tc_id_number.includes(q) ||
      r.license_number.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <Car className="h-7 w-7 text-brand-600" />
          Eksper Vale Başvuruları
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sürücü/vale olarak başvuran kullanıcılar. Onay sonrası vale paneline giriş yapabilir.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex">
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')} count={counts.pending} color="amber">Bekleyenler</TabButton>
          <TabButton active={tab === 'approved'} onClick={() => setTab('approved')} count={counts.approved} color="emerald">Onaylananlar</TabButton>
          <TabButton active={tab === 'rejected'} onClick={() => setTab('rejected')} count={counts.rejected} color="red">Reddedilenler</TabButton>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Ad, email, TC veya ehliyet no ile ara…"
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Tarih</th>
                <th className="px-4 py-3 text-left">Ad Soyad</th>
                <th className="px-4 py-3 text-left">TC / Ehliyet</th>
                <th className="px-4 py-3 text-left">Telefon</th>
                <th className="px-4 py-3 text-left">Şehir</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {tab === 'pending' ? 'Bekleyen başvuru yok' : tab === 'approved' ? 'Henüz onaylanmış yok' : 'Reddedilmiş başvuru yok'}
                </td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.first_name} {r.last_name}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-mono">{r.tc_id_number}</div>
                      <div className="text-slate-500">{r.license_class} - {r.license_number}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{r.city?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(r)} className="btn-ghost text-xs">
                        <Eye className="h-3.5 w-3.5" /> İncele <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Vale Başvuru Detayı</h2>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(selected.created_at)} • {selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
                </div>
              )}

              <DetailSection title="Kişisel Bilgiler">
                <DetailRow label="Ad" value={selected.first_name} />
                <DetailRow label="Soyad" value={selected.last_name} />
                <DetailRow label="TC Kimlik No" value={selected.tc_id_number} mono />
                <DetailRow label="E-posta" value={selected.email} />
                <DetailRow label="Telefon" value={selected.phone} />
              </DetailSection>

              <DetailSection title="Ehliyet">
                <DetailRow label="Ehliyet No" value={selected.license_number} mono />
                <DetailRow label="Sınıf" value={selected.license_class} />
              </DetailSection>

              <DetailSection title="Konum">
                <DetailRow label="İl" value={selected.city?.name || '-'} />
                <DetailRow label="İlçe" value={selected.district?.name || '-'} />
                {selected.neighborhood && <DetailRow label="Mahalle" value={selected.neighborhood} />}
              </DetailSection>

              {selected.vehicle_info && (
                <DetailSection title="Araç Bilgisi">
                  <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selected.vehicle_info}</div>
                </DetailSection>
              )}

              {selected.status === 'rejected' && selected.rejection_reason && (
                <DetailSection title="Red Sebebi">
                  <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{selected.rejection_reason}</div>
                </DetailSection>
              )}
            </div>

            {selected.status === 'pending' && (
              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="btn-ghost text-red-600 hover:bg-red-50 justify-center"
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4" /> Reddet
                </button>
                <button
                  onClick={() => handleApprove(selected)}
                  className="btn-primary justify-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> İşleniyor…</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Hesabı Aç ve Onayla</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRejectModal && selected && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Başvuruyu Reddet</h3>
            <p className="text-sm text-slate-500 mt-1">Red sebebini yazın (opsiyonel ama önerilir).</p>
            <textarea
              className="input mt-4 min-h-[100px]"
              placeholder="Örn: Belgeler eksik, ehliyet sınıfı uyumsuz, vb."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="btn-ghost">İptal</button>
              <button onClick={handleReject} className="btn-primary bg-red-600 hover:bg-red-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, count, color, children }: {
  active: boolean; onClick: () => void; count: number; color: 'amber' | 'emerald' | 'red'; children: React.ReactNode;
}) {
  const colorMap = {
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition',
        active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900'
      )}
    >
      {children}
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', colorMap[color])}>{count}</span>
    </button>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 border-b border-slate-200 pb-1">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn('text-sm font-medium text-slate-900', mono && 'font-mono')}>{value}</div>
    </div>
  );
}
