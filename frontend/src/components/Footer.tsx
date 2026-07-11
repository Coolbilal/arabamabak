import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SiteSettings } from '../lib/types';
import { Building2, Phone, Mail, Search, ShieldCheck, FileText, TrendingUp, Car } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [searchNo, setSearchNo] = useState('');
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as unknown as SiteSettings);
    });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchErr(null);
    const q = searchNo.trim().toUpperCase();
    if (!q) {
      setSearchErr('İlan no girin');
      return;
    }
    setSearching(true);
    try {
      // Sadece aktif ilanlar arasında ara
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, listing_no, status')
        .eq('listing_no', q)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setSearchErr('İlan bulunamadı veya pasif durumda');
        return;
      }
      navigate(`/ilan/${data.id}`);
      setSearchNo('');
    } catch (err: any) {
      setSearchErr(err?.message ?? 'Arama hatası');
    } finally {
      setSearching(false);
    }
  };

  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <div className="text-2xl font-extrabold text-white mb-3">{settings?.site_name ?? 'arabamabak'}</div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md">
            Türkiye'nin yeni nesil açık arttırma ve ilan platformu. Araç alıp satmak, ekspertiz yaptırmak ve güvenli ticaret için tek adres.
          </p>
          {settings?.footer_html && (
            <div
              className="mt-4 prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: settings.footer_html }}
            />
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Hızlı Bağlantılar</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/kategori/live" className="hover:text-white">Devam Eden Açık Arttırmalar</Link></li>
            <li><Link to="/kategori/upcoming" className="hover:text-white">Yaklaşan Açık Arttırmalar</Link></li>
            <li><Link to="/kategori/sold" className="hover:text-white">Satılan Araçlar</Link></li>
            <li><Link to="/kategori/free" className="hover:text-white">Ücretsiz İlanlar</Link></li>
            <li><Link to="/ilan-ver" className="hover:text-white">İlan Ver</Link></li>
            <li><Link to="/ekspertiz" className="hover:text-white">Ekspertiz Yaptır</Link></li>
            <li>
              <Link to="/arac-deger" className="hover:text-white flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Aracın Değerini Öğren
              </Link>
            </li>
            <li>
              <Link to="/bayi-basvurusu" className="hover:text-white flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Kurumsal Hesap Başvurusu
              </Link>
            </li>
            <li>
              <Link to="/vale-basvuru" className="hover:text-white flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" /> Eksper Vale Olmak İstiyorum
              </Link>
            </li>
            <li>
              <Link to="/ekspertiz-bayisi-basvuru" className="hover:text-white flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Ekspertiz Bayisi Olmak İstiyorum
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Yasal</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Güvenli Alışveriş</li>
            <li className="flex items-center gap-2"><FileText className="h-4 w-4" /> Kullanıcı Sözleşmesi</li>
            <li className="flex items-center gap-2"><FileText className="h-4 w-4" /> Gizlilik Politikası</li>
            <li className="flex items-center gap-2"><FileText className="h-4 w-4" /> KVKK Aydınlatma</li>
          </ul>
          <div className="mt-4 space-y-1.5 text-sm">
            {settings?.contact_email && (
              <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 hover:text-white">
                <Mail className="h-4 w-4" /> {settings.contact_email}
              </a>
            )}
            {settings?.contact_phone && (
              <a href={`tel:${settings.contact_phone}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4" /> {settings.contact_phone}
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-6">
        <div className="mx-auto max-w-7xl px-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label className="text-sm font-semibold text-white whitespace-nowrap flex items-center gap-2">
              <Search className="h-4 w-4" /> İlan No ile Ara:
            </label>
            <input
              type="text"
              value={searchNo}
              onChange={(e) => { setSearchNo(e.target.value); setSearchErr(null); }}
              placeholder="ARB-2026-000001"
              className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {searching ? 'Aranıyor...' : 'Ara'}
            </button>
            {searchErr && (
              <span className="text-xs text-rose-400 sm:ml-2">{searchErr}</span>
            )}
          </form>
          <p className="mt-2 text-[11px] text-slate-500">
            Sadece aktif ilanlar aranır. Pasif/biten ilanlar görüntülenmez.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4">
        <div className="mx-auto max-w-7xl px-4 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {settings?.site_name ?? 'arabamabak'}. Tüm hakları saklıdır.</span>
          <span>Powered by MiniMax Agent</span>
        </div>
      </div>
    </footer>
  );
}
