import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Loader2, Search, Star, CheckCircle2, XCircle, Eye, X } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

interface DealershipRow {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  contact_person: string | null;
  status: string;
  total_expertise_count: number;
  average_rating: number;
  total_ratings: number;
  approved_at: string | null;
  service_areas: string[];
}

export default function ExpertiseDealershipsPage() {
  const [rows, setRows] = useState<DealershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DealershipRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('expertise_dealerships')
      .select('id, user_id, name, email, phone, city, district, contact_person, status, total_expertise_count, average_rating, total_ratings, approved_at, service_areas')
      .order('approved_at', { ascending: false, nullsFirst: false });

    if (error) { setError('Bayiler yüklenemedi: ' + error.message); setLoading(false); return; }
    setRows((data || []) as DealershipRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(d: DealershipRow) {
    const newStatus = d.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Bayiyi ${newStatus === 'active' ? 'aktif' : 'askıya alınmış'} yapmak istediğinize emin misiniz?`)) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('expertise_dealerships')
      .update({ status: newStatus })
      .eq('id', d.id);
    if (error) setError(error.message);
    else { load(); setSelected(null); }
    setActionLoading(false);
  }

  const filtered = rows
    .filter(r => {
      if (filter === 'active' && r.status !== 'active') return false;
      if (filter === 'suspended' && r.status !== 'suspended') return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.contact_person || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <Building2 className="h-7 w-7 text-brand-600" />
          Aktif Ekspertiz Bayileri
        </h1>
        <p className="mt-1 text-sm text-slate-500">Sistemde kayıtlı tüm onaylanmış bayiler.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Şirket, yetkili, şehir ile ara…" className="input pl-10"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setFilter('all')} className={cn('px-3 py-2 text-sm rounded-lg', filter === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}>Tümü</button>
            <button onClick={() => setFilter('active')} className={cn('px-3 py-2 text-sm rounded-lg', filter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700')}>Aktif</button>
            <button onClick={() => setFilter('suspended')} className={cn('px-3 py-2 text-sm rounded-lg', filter === 'suspended' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700')}>Askıda</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Şirket</th>
                <th className="px-4 py-3 text-left">Yetkili</th>
                <th className="px-4 py-3 text-left">Konum</th>
                <th className="px-4 py-3 text-center">Ekspertiz</th>
                <th className="px-4 py-3 text-center">Puan</th>
                <th className="px-4 py-3 text-center">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500"><Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Kayıt bulunamadı</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.contact_person || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.city}{r.district ? ` / ${r.district}` : ''}</td>
                  <td className="px-4 py-3 text-center font-bold">{r.total_expertise_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {Number(r.average_rating).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.status === 'active' ? <span className="badge bg-emerald-100 text-emerald-700">Aktif</span> : <span className="badge bg-amber-100 text-amber-700">Askıda</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(r)} className="btn-ghost text-xs"><Eye className="h-3.5 w-3.5" /> Detay</button>
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
              <h2 className="text-xl font-extrabold text-slate-900">{selected.name}</h2>
              <button onClick={() => setSelected(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-500">Yetkili</div><div className="font-medium">{selected.contact_person || '-'}</div></div>
                <div><div className="text-xs text-slate-500">Telefon</div><div className="font-medium">{selected.phone || '-'}</div></div>
                <div><div className="text-xs text-slate-500">E-posta</div><div className="font-medium">{selected.email || '-'}</div></div>
                <div><div className="text-xs text-slate-500">Konum</div><div className="font-medium">{selected.city || '-'} {selected.district && `/ ${selected.district}`}</div></div>
                <div><div className="text-xs text-slate-500">Toplam Ekspertiz</div><div className="font-bold text-2xl">{selected.total_expertise_count}</div></div>
                <div><div className="text-xs text-slate-500">Ortalama Puan</div><div className="font-bold text-2xl text-amber-600">{Number(selected.average_rating).toFixed(1)} ⭐</div></div>
                <div className="col-span-2"><div className="text-xs text-slate-500">Onay Tarihi</div><div className="font-medium">{selected.approved_at ? formatDate(selected.approved_at) : '-'}</div></div>
                {selected.service_areas && selected.service_areas.length > 0 && (
                  <div className="col-span-2">
                    <div className="text-xs text-slate-500">Hizmet Alanları</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selected.service_areas.map(a => <span key={a} className="badge bg-slate-100 text-slate-700">{a}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => toggleStatus(selected)}
                disabled={actionLoading}
                className={cn('btn-primary', selected.status === 'active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700')}
              >
                {selected.status === 'active' ? <><XCircle className="h-4 w-4" /> Askıya Al</> : <><CheckCircle2 className="h-4 w-4" /> Aktif Et</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
