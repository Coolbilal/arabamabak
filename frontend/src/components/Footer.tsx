import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SiteSettings } from '../lib/types';
import { Building2, Phone, Mail, ShieldCheck, FileText, TrendingUp } from 'lucide-react';

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as unknown as SiteSettings);
    });
  }, []);

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
      <div className="border-t border-slate-800 py-4">
        <div className="mx-auto max-w-7xl px-4 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {settings?.site_name ?? 'arabamabak'}. Tüm hakları saklıdır.</span>
          <span>Powered by MiniMax Agent</span>
        </div>
      </div>
    </footer>
  );
}
