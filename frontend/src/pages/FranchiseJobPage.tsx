import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Building2, MapPin, Calendar, Upload, Loader2, AlertCircle, FileText, CheckCircle2, Download } from 'lucide-react';
import type { ExpertiseRequest, ExpertiseResult } from '../lib/types';

const CHECKLIST_ITEMS = [
  'Kaporta/Boya Kontrolü', 'Motor/Mekanik', 'Fren Sistemi', 'Lastik/Jant',
  'Elektrik/Elektronik', 'İç Trim', 'Yol Testi', 'Alt Takım',
  'Şanzıman', 'Klima', 'Egzoz', 'Süspansiyon',
];

const STATUS_OPTIONS = ['Çok İyi', 'İyi', 'Orta', 'Kötü', 'Çok Kötü', 'Kontrol Gerekli'];

export default function FranchiseJobPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [req, setReq] = useState<ExpertiseRequest | null>(null);
  const [result, setResult] = useState<ExpertiseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/franchise/login'); return; }
    if (!id) return;
    load();
  }, [id, user]);

  async function load() {
    setLoading(true);
    const { data: reqData } = await supabase
      .from('expertise_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setReq(reqData as ExpertiseRequest);

    const { data: resData } = await supabase
      .from('expertise_results')
      .select('*')
      .eq('expertise_request_id', id)
      .maybeSingle();
    if (resData) {
      const r = resData as ExpertiseResult;
      setResult(r);
      setChecklist(r.dealership_checklist || {});
      setNotes(r.dealership_notes || '');
      setReportUrl(r.dealership_report_url);
    }
    setLoading(false);
  }

  async function uploadReport(): Promise<string> {
    if (!reportFile) return reportUrl || '';
    setUploading(true);
    const ext = reportFile.name.split('.').pop();
    const path = `dealership/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('expertise-reports')
      .upload(path, reportFile, { contentType: reportFile.type, upsert: false });
    if (upErr) { setUploading(false); throw new Error('Rapor yüklenemedi: ' + upErr.message); }
    const { data: pub } = supabase.storage.from('expertise-reports').getPublicUrl(path);
    setUploading(false);
    return pub.publicUrl;
  }

  async function handleSaveResult() {
    if (!req) return;
    if (Object.keys(checklist).length === 0) { alert('En az 1 kontrol noktası doldurun'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const uploadedUrl = await uploadReport();
      const payload: Record<string, unknown> = {
        expertise_request_id: req.id,
        dealership_checklist: checklist,
        dealership_notes: notes,
        dealership_report_url: uploadedUrl || reportUrl,
        dealership_uploaded_at: new Date().toISOString(),
        dealership_uploaded_by: user?.id,
        status: result?.status === 'valet_completed' ? 'fully_completed' : 'dealership_completed',
        completed_at: result?.status === 'valet_completed' ? new Date().toISOString() : (result?.completed_at || null),
      };
      if (result) {
        const { error } = await supabase.from('expertise_results').update(payload).eq('id', result.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expertise_results').insert(payload);
        if (error) throw error;
      }
      await supabase.from('expertise_requests').update({ results_uploaded_at: new Date().toISOString(), status: 'dealership_completed' }).eq('id', req.id);
      alert('✅ Ekspertiz raporu kaydedildi!');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="inline h-6 w-6 animate-spin" /></div>;
  if (!req) return <div className="p-8 text-center text-slate-500">İş bulunamadı</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/franchise/dashboard" className="text-slate-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="font-extrabold text-slate-900">Ekspertiz Detayı</div>
            <div className="text-xs text-slate-500 font-mono">{req.plate}</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
          </div>
        )}

        {/* Talep Özeti */}
        <div className="card p-5">
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Talep Bilgileri</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-slate-500">Plaka</div><div className="font-bold font-mono">{req.plate}</div></div>
            <div><div className="text-xs text-slate-500">Şehir</div><div className="font-medium">{req.city || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Ekspertiz Tipi</div><div className="font-medium">{req.expertise_type || '-'}</div></div>
            <div><div className="text-xs text-slate-500">Tarih</div><div className="font-medium">{new Date(req.created_at).toLocaleString('tr-TR')}</div></div>
          </div>
        </div>

        {/* Vale Raporu (read-only) */}
        {result?.valet_notes && (
          <div className="card p-5 bg-slate-50">
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Vale Gözlem Notu</h3>
            <p className="text-sm text-slate-700 whitespace-pre-line">{result.valet_notes}</p>
            {result.valet_photo_urls && result.valet_photo_urls.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {result.valet_photo_urls.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`Vale foto ${idx + 1}`} className="w-full h-16 object-cover rounded" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kontrol Listesi */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Ekspertiz Kontrol Listesi
          </h3>

          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
              <div key={item} className="grid grid-cols-3 gap-2 items-center text-sm">
                <div className="font-medium text-slate-700">{item}</div>
                <select
                  value={checklist[item] || ''}
                  onChange={(e) => setChecklist(prev => ({ ...prev, [item]: e.target.value }))}
                  className="input col-span-2 text-sm"
                >
                  <option value="">- Seçiniz -</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>

          <label className="block text-xs font-semibold text-slate-600 mb-1 mt-4">Bayi Notları</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[100px]"
            placeholder="Ekspertiz detayları, ölçüm değerleri, öneriler..."
          />

          <label className="block text-xs font-semibold text-slate-600 mb-1 mt-3">Ekspertiz Raporu (PDF)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setReportFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
          {reportUrl && !reportFile && (
            <a href={reportUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
              <Download className="h-3 w-3" /> Mevcut raporu gör
            </a>
          )}
          {reportFile && <div className="mt-2 text-sm text-slate-700">📎 {reportFile.name}</div>}

          <button
            onClick={handleSaveResult}
            disabled={submitting || uploading}
            className="btn-primary w-full justify-center mt-4"
          >
            {submitting || uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> {result ? 'Raporu Güncelle' : 'Raporu Kaydet'}</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
