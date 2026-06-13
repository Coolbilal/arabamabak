import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Wallet, Loader2, CheckCircle2, Clock, Download, Calendar } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export default function FranchiseEarningsPage() {
 const { user } = useAuth();
 const [payments, setPayments] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

 useEffect(() => {
 if (!user) { return; }
 load();
 }, [user]);

 async function load() {
 setLoading(true);
 const { data: deal } = await supabase
 .from('expertise_dealerships')
 .select('id')
 .eq('user_id', user?.id)
 .maybeSingle();
 if (!deal) { setLoading(false); return; }

 const { data, error } = await supabase
 .from('payment_records')
 .select('id, amount, status, period_year, period_month, paid_at, receipt_url, created_at')
 .eq('recipient_type', 'franchise')
 .eq('recipient_id', deal.id)
 .is('deleted_at', null)
 .order('created_at', { ascending: false });

 if (!error) setPayments(data || []);
 setLoading(false);
 }

 const total = payments.reduce((s, p) => s + Number(p.amount), 0);
 const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
 const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

 const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
 const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

 return (
 <div className="min-h-screen bg-slate-50">
 <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
 <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
 <Link to="/franchise/dashboard" className="text-slate-600"><ArrowLeft className="h-5 w-5" /></Link>
 <h1 className="font-extrabold text-slate-900">Kazançlarım</h1>
 </div>
 </header>

 <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
 <div className="grid grid-cols-3 gap-3">
 <div className="card p-4">
 <div className="text-xs text-slate-500">Toplam</div>
 <div className="text-lg font-extrabold text-slate-900">{total.toLocaleString('tr-TR')} ₺</div>
 </div>
 <div className="card p-4">
 <div className="text-xs text-amber-600 font-semibold">Bekleyen</div>
 <div className="text-lg font-extrabold text-amber-600">{pending.toLocaleString('tr-TR')} ₺</div>
 </div>
 <div className="card p-4">
 <div className="text-xs text-emerald-600 font-semibold">Ödenmiş</div>
 <div className="text-lg font-extrabold text-emerald-600">{paid.toLocaleString('tr-TR')} ₺</div>
 </div>
 </div>

 <div className="card overflow-hidden">
 <div className="border-b border-slate-200 flex">
 {(['all', 'pending', 'paid'] as const).map(f => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`px-4 py-2.5 text-sm font-medium border-b-2 ${filter === f ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600'}`}
 >
 {f === 'all' ? 'Tümü' : f === 'pending' ? 'Bekleyen' : 'Ödenmiş'}
 </button>
 ))}
 </div>

 {loading ? (
 <div className="p-12 text-center text-slate-500"><Loader2 className="inline h-5 w-5 animate-spin mr-2" />Yükleniyor…</div>
 ) : filtered.length === 0 ? (
 <div className="p-12 text-center text-slate-500"><Wallet className="h-12 w-12 mx-auto text-slate-300" /><p className="mt-2">Henüz kazanç kaydı yok</p></div>
 ) : (
 <div className="divide-y divide-slate-100">
 {filtered.map(p => (
 <div key={p.id} className="p-4 flex items-center gap-3">
 <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
 p.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
 }`}>
 {p.status === 'paid' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
 </div>
 <div className="flex-1">
 <div className="font-bold text-slate-900">{months[p.period_month - 1]} {p.period_year}</div>
 <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
 <Calendar className="h-3 w-3" /> {formatDateTime(p.created_at)}
 {p.paid_at && <span>• Ödeme: {formatDateTime(p.paid_at)}</span>}
 </div>
 </div>
 <div className="text-right">
 <div className="font-extrabold text-slate-900">{Number(p.amount).toLocaleString('tr-TR')} ₺</div>
 {p.receipt_url && (
 <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 mt-0.5">
 <Download className="h-3 w-3" /> Dekont
 </a>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </main>
 </div>
 );
}
