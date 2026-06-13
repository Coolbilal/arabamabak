import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Car, Loader2, Search, Star, CheckCircle2, XCircle, Eye, X } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

interface ValetRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  district: string | null;
  license_number: string | null;
  license_class: string | null;
  is_active: boolean;
  total_tasks: number;
  total_completed_tasks: number;
  average_rating: number;
  total_ratings: number;
  created_at: string;
  profile?: { email: string } | null;
}

export default function ExpertValetsPage() {
  const [rows, setRows] = useState<ValetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ValetRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('expert_valets')
      .select(`
        id, user_id, full_name, phone, city, district, license_number, license_class,
        is_active, total_tasks, total_completed_tasks, average_rating, total_ratings,
        created_at,
        profile:profiles!user_id(email)
      `)
      .order('created_at', { ascending: false });

    if (error) { setError('Valeler yüklenemedi: ' + error.message); setLoading(false); return; }
    setRows((data || []) as unknown as ValetRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(v: ValetRow) {
    setActionLoading(true);
    const { error } = await supabase
      .from('expert_valets')
      .update({ is_active: !v.is_active })
      .eq('id', v.id);
    if (error) setError(error.message);
    else { load(); setSelected(null); }
    setActionLoading(false);
  }

  const filtered = rows
    .filter(r => {
      if (filter === 'active' && !r.is_active) return false;
      if (filter === 'inactive' && r.is_active) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.full_name.toLowerCase().includes(q) ||
        (r.profile?.email || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.city || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <Car className="h-7 w-7 text-brand-600" />
          Aktif Valeler
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Onaylanmış ve sistemde kayıtlı tüm valeler.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Ad, email, telefon, şehir ile ara…" className="input pl-10"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setFilter('all')} className={cn('px-3 py-2 text-sm rounded-lg', filter === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}>Tümü</button>
            <button onClick={() => setFilter('active')} className={cn('px-3 py-2 text-sm rounded-lg', filter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700')}>Aktif</button>
            <button onClick={() => setFilter('inactive')} className={cn('px-3 py-2 text-sm rounded-lg', filter === 'inactive' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700')}>Pasif</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Ad Soyad</th>
                <th className="px-4 py-3 text-left">İletişim</th>
                <th className="px-4 py-3 text-left">Konum</th>
                <th className="px-4 py-3 text-left">Ehliyet</th>
                <th className="px-4 py-3 text-center">Tamamlanan</th>
                <th className="px-4 py-3 text-center">Puan</th>
                <th className="px-4 py-3 text-center">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Kayıt bulunamadı</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{r.profile?.email}</div>
                    <div className="text-slate-500">{r.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.city}{r.district ? ` / ${r.district}` : ''}</td>
                  <td className="px-4 py-3 text-xs font-mono">{r.license_class} - {r.license_number}</td>
                  <td className="px-4 py-3 text-center font-bold">{r.total_completed_tasks}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {Number(r.average_rating).toFixed(1)}
                    </span>
                    <div className="text-xs text-slate-500">{r.total_ratings} değ.</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.is_active ? <span className="badge bg-emerald-100 text-emerald-700">Aktif</span> : <span className="badge bg-slate-200 text-slate-700">Pasif</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(r)} className="btn-ghost text-xs">
                      <Eye className="h-3.5 w-3.5" /> Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">{selected.full_name}</h2>
              <button onClick={() => setSelected(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-500">E-posta</div><div className="font-medium">{selected.profile?.email}</div></div>
                <div><div className="text-xs text-slate-500">Telefon</div><div className="font-medium">{selected.phone}</div></div>
                <div><div className="text-xs text-slate-500">Konum</div><div className="font-medium">{selected.city} {selected.district && `/ ${selected.district}`}</div></div>
                <div><div className="text-xs text-slate-500">Ehliyet</div><div className="font-medium font-mono">{selected.license_class} - {selected.license_number}</div></div>
                <div><div className="text-xs text-slate-500">Toplam İş</div><div className="font-bold text-2xl">{selected.total_tasks}</div></div>
                <div><div className="text-xs text-slate-500">Tamamlanan</div><div className="font-bold text-2xl text-emerald-600">{selected.total_completed_tasks}</div></div>
                <div><div className="text-xs text-slate-500">Ortalama Puan</div><div className="font-bold text-2xl text-amber-600">{Number(selected.average_rating).toFixed(1)} ⭐</div></div>
                <div><div className="text-xs text-slate-500">Değerlendirme Sayısı</div><div className="font-bold text-2xl">{selected.total_ratings}</div></div>
                <div className="col-span-2"><div className="text-xs text-slate-500">Kayıt Tarihi</div><div className="font-medium">{formatDate(selected.created_at)}</div></div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => toggleActive(selected)}
                disabled={actionLoading}
                className={cn('btn-primary', !selected.is_active ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')}
              >
                {selected.is_active ? <><XCircle className="h-4 w-4" /> Pasif Yap</> : <><CheckCircle2 className="h-4 w-4" /> Aktif Yap</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
