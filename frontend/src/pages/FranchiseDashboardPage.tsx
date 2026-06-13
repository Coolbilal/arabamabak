import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Loader2, LogOut, Calendar, ChevronRight, CheckCircle2, Clock, Inbox, Wallet, Eye, MapPin } from 'lucide-react';
import type { ExpertiseRequest } from '../lib/types';

export default function FranchiseDashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ExpertiseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<{ total: number; pending: number; paid: number }>({ total: 0, pending: 0, paid: 0 });

  useEffect(() => {
    if (!user) { navigate('/franchise/login'); return; }
    loadJobs();
    loadEarnings();
  }, [user]);

  async function loadJobs() {
    setLoading(true);
    const { data: deal } = await supabase
      .from('expertise_dealerships')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();
    if (!deal) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('expertise_requests')
      .select('*')
      .or(`dealership_id.eq.${deal.id},and(dealership_id.is.null,at_dealership_at.not.is.null)`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) setRequests((data || []) as ExpertiseRequest[]);
    setLoading(false);
  }

  async function loadEarnings() {
    const { data } = await supabase
      .from('payment_records')
      .select('amount, status')
      .eq('recipient_type', 'franchise')
      .is('deleted_at', null);
    if (data) {
      const stats = { total: 0, pending: 0, paid: 0 };
      data.forEach((p: { amount: number; status: string }) => {
        stats.total += Number(p.amount);
        if (p.status === 'pending') stats.pending += Number(p.amount);
        if (p.status === 'paid') stats.paid += Number(p.amount);
      });
      setEarnings(stats);
    }
  }

  async function handleAccept(req: ExpertiseRequest) {
    if (!user) return;
    if (!confirm('Bu işi kabul ediyor musunuz?')) return;
    const { data: deal } = await supabase.from('expertise_dealerships').select('id').eq('user_id', user.id).maybeSingle();
    if (!deal) return;
    const { error } = await supabase
      .from('expertise_requests')
      .update({
        dealership_id: req.dealership_id || deal.id,
        dealership_accepted_at: new Date().toISOString(),
        status: 'dealership_accepted',
      })
      .eq('id', req.id);
    if (error) { alert('Hata: ' + error.message); return; }
    loadJobs();
  }

  async function handleSignOut() {
    await signOut();
    navigate('/franchise/login');
  }

  const active = requests.filter(r => !['fully_completed', 'cancelled'].includes(r.status));
  const completed = requests.filter(r => ['fully_completed'].includes(r.status));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900">Bayi Paneli</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/franchise/earnings" className="btn-secondary text-xs">
              <Wallet className="h-3.5 w-3.5" /> Kazançlarım
            </Link>
            <button onClick={handleSignOut} className="btn-ghost text-xs">
              <LogOut className="h-3.5 w-3.5" /> Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="text-xs text-slate-500">Toplam</div>
            <div className="text-xl font-extrabold text-slate-900">{earnings.total.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-amber-600 font-semibold">Bekleyen</div>
            <div className="text-xl font-extrabold text-amber-600">{earnings.pending.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-emerald-600 font-semibold">Ödenmiş</div>
            <div className="text-xl font-extrabold text-emerald-600">{earnings.paid.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" /> Aktif İşler ({active.length})
          </h2>

          {loading ? (
            <div className="card p-12 text-center text-slate-500">
              <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
            </div>
          ) : active.length === 0 ? (
            <div className="card p-12 text-center text-slate-500">
              <Inbox className="h-12 w-12 mx-auto text-slate-300" />
              <p className="mt-2">Şu an aktif iş yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {active.map(req => (
                <div key={req.id} className="card p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900">{req.plate}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      {req.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.city}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(req.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <span className={`badge text-xs ${
                    req.status === 'at_dealership' ? 'bg-blue-100 text-blue-700' :
                    req.status === 'dealership_accepted' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {req.status === 'at_dealership' ? 'Ekspertiz Bekliyor' : req.status === 'dealership_accepted' ? 'Kabul Edildi' : req.status}
                  </span>
                  {!req.dealership_id && (
                    <button onClick={() => handleAccept(req)} className="btn-primary text-xs">
                      Kabul Et
                    </button>
                  )}
                  <Link to={`/franchise/job/${req.id}`} className="btn-ghost text-xs">
                    <Eye className="h-3.5 w-3.5" /> Aç
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {completed.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Tamamlanan ({completed.length})
            </h2>
            <div className="space-y-2">
              {completed.map(req => (
                <Link
                  key={req.id}
                  to={`/franchise/job/${req.id}`}
                  className="card p-3 flex items-center gap-3 hover:shadow-md transition"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700">{req.plate}</div>
                    <div className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('tr-TR')}</div>
                  </div>
                  <Eye className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
