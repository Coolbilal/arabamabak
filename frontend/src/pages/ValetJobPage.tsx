import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle, Camera, FileText } from 'lucide-react';
import type { ExpertiseRequestV2 as ExpertiseRequest, ExpertiseResult } from '../lib/types';

const STAGES = [
  { key: 'valet_accepted_at', label: 'İş Kabul Edildi' },
  { key: 'vehicle_picked_up_at', label: 'Araç Alındı' },
  { key: 'at_dealership_at', label: 'Bayiye Teslim Edildi' },
  { key: 'valet_completed_at', label: 'Vale Görevini Tamamladı' },
];

export default function ValetJobPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [req, setReq] = useState<ExpertiseRequest | null>(null);
  const [result, setResult] = useState<ExpertiseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/vales/login'); return; }
    if (!id) return;
    load();
  }, [id, user]);

  async function load() {
    setLoading(true);
    const { data: reqData, error: reqErr } = await supabase
      .from('expertise_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (reqErr) { setError(reqErr.message); setLoading(false); return; }
    setReq(reqData as ExpertiseRequest);

    const { data: resData } = await supabase
      .from('expertise_results')
      .select('*')
      .eq('expertise_request_id', id)
      .maybeSingle();
    if (resData) {
      setResult(resData as ExpertiseResult);
      setNotes((resData as ExpertiseResult).valet_notes || '');
      setPhotoPreviews((resData as ExpertiseResult).valet_photo_urls || []);
    }
    setLoading(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 8) {
      alert('En fazla 8 fotoğraf yükleyebilirsiniz');
      return;
    }
    setPhotos(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photos.length === 0) return photoPreviews.filter(p => p.startsWith('http'));
    setUploading(true);
    const urls: string[] = photoPreviews.filter(p => p.startsWith('http')); // mevcut URL'ler
    for (const file of photos) {
      const ext = file.name.split('.').pop();
      const path = `valet/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('expertise-photos')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) { setUploading(false); throw new Error('Fotoğraf yüklenemedi: ' + upErr.message); }
      const { data: pub } = supabase.storage.from('expertise-photos').getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    setUploading(false);
    return urls;
  }

  async function updateStage(field: string) {
    if (!req) return;
    const updates: Record<string, unknown> = { [field]: new Date().toISOString() };
    if (field === 'vehicle_picked_up_at') updates.status = 'picked_up';
    if (field === 'at_dealership_at') updates.status = 'at_dealership';
    const { error } = await supabase.from('expertise_requests').update(updates).eq('id', req.id);
    if (error) { setError(error.message); return; }
    load();
  }

  async function handleSaveResult() {
    if (!req) return;
    if (!notes.trim()) { alert('Lütfen gözlem notlarınızı yazın'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const photoUrls = await uploadPhotos();
      const payload: Record<string, unknown> = {
        expertise_request_id: req.id,
        valet_notes: notes,
        valet_photo_urls: photoUrls,
        valet_uploaded_at: new Date().toISOString(),
        valet_uploaded_by: user?.id,
        status: result?.status === 'dealership_completed' ? 'fully_completed' : 'valet_completed',
        completed_at: result?.status === 'dealership_completed' ? new Date().toISOString() : (result?.completed_at || null),
      };
      if (result) {
        const { error } = await supabase.from('expertise_results').update(payload).eq('id', result.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expertise_results').insert(payload);
        if (error) throw error;
      }
      // valet_completed_at
      await supabase.from('expertise_requests').update({ valet_completed_at: new Date().toISOString(), status: 'valet_completed' }).eq('id', req.id);
      alert('✅ Sonuç kaydedildi!');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="inline h-6 w-6 animate-spin" /></div>;
  if (!req) return <div className="p-8 text-center text-slate-500">İş bulunamadı</div>;

  const currentStageIdx = STAGES.findIndex(s => !(req as unknown as Record<string, unknown>)[s.key]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/vales/dashboard" className="text-slate-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="font-extrabold text-slate-900">İş Detayı</div>
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

        {/* Süreç Adımları */}
        <div className="card p-5">
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Süreç Takibi</h3>
          <ol className="space-y-3">
            {STAGES.map((s, idx) => {
              const completed = !!(req as unknown as Record<string, unknown>)[s.key];
              const isCurrent = idx === currentStageIdx && !completed;
              return (
                <li key={s.key} className="flex items-start gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    completed ? 'bg-emerald-500 text-white' :
                    isCurrent ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {completed ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${completed ? 'text-emerald-700' : isCurrent ? 'text-amber-700' : 'text-slate-600'}`}>
                      {s.label}
                    </div>
                    {completed && (
                      <div className="text-xs text-slate-500">{new Date((req as unknown as Record<string, string>)[s.key]).toLocaleString('tr-TR')}</div>
                    )}
                    {isCurrent && (
                      <button onClick={() => updateStage(s.key)} className="mt-1 text-xs btn-secondary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Bu adımı tamamla
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Sonuç Formu */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Araç Gözlem Raporu
          </h3>

          <label className="block text-xs font-semibold text-slate-600 mb-1 mt-3">Gözlem Notları *</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[100px]"
            placeholder="Aracın genel durumu, gözle görülen sorunlar, ekspertiz noktasına teslim notu..."
          />

          <label className="block text-xs font-semibold text-slate-600 mb-1 mt-3">Fotoğraflar (Max 8)</label>
          <label className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition">
            <Camera className="h-8 w-8 text-slate-400" />
            <span className="text-sm text-slate-500 mt-1">Fotoğraf yükle</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
          </label>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="relative group">
                  <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSaveResult}
            disabled={submitting || uploading}
            className="btn-primary w-full justify-center mt-4"
          >
            {submitting || uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…</>
            ) : (
              <><Upload className="h-4 w-4" /> {result ? 'Sonucu Güncelle' : 'Sonucu Kaydet'}</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
