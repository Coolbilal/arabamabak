import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DealershipLoginPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/franchise/dashboard`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Giriş linki gönderilemedi');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Bayi Giriş</h1>
              <p className="text-brand-100 text-sm">E-posta ile magic link</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {sent ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-4">Link gönderildi!</h2>
              <p className="text-slate-600 mt-2 text-sm">
                <strong>{email}</strong> adresine giriş linki gönderdik. E-postanızı kontrol edin.
              </p>
              <p className="text-xs text-slate-500 mt-4">
                Link 1 saat geçerlidir. Spam klasörünü de kontrol edin.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }} className="mt-4 text-sm text-brand-600 hover:underline">
                Farklı e-posta dene
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-posta Adresi</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="info@sirket.com"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Şifreye gerek yok. E-postanıza gelen link ile giriş yapabilirsiniz.
                </p>
              </div>

              <button
                type="submit"
                disabled={sending || !email}
                className="btn-primary w-full justify-center"
              >
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor…</> : <>Giriş Linki Gönder</>}
              </button>

              <div className="text-center text-sm text-slate-500 pt-2">
                Henüz başvurmadınız mı?{' '}
                <Link to="/ekspertiz-bayisi-basvuru" className="text-brand-600 hover:underline font-semibold">Bayi Başvurusu Yap</Link>
              </div>
            </form>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
