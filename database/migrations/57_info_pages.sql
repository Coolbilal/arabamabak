-- ============================================
-- Migration 57: Info Pages (Bilgi Bankası)
-- ============================================
-- Açık arttırma nasıl verilir, açık arttırmaya nasıl katılınır, vb.
-- Admin panelden yönetilir, frontend'de görüntülenir

CREATE TABLE IF NOT EXISTS info_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,                   -- Kapak görsel URL (opsiyonel)
  icon TEXT DEFAULT '📚',             -- Emoji ikon
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_info_pages_slug ON info_pages(slug);
CREATE INDEX IF NOT EXISTS idx_info_pages_published ON info_pages(is_published, sort_order);

-- RLS: herkes yayında olanları görebilir
ALTER TABLE info_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "info_pages_select_published" ON info_pages;
CREATE POLICY "info_pages_select_published" ON info_pages
  FOR SELECT USING (is_published = true);

-- Admin/staff yazabilir
DROP POLICY IF EXISTS "info_pages_admin_all" ON info_pages;
CREATE POLICY "info_pages_admin_all" ON info_pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

-- Örnek sayfalar
INSERT INTO info_pages (slug, title, excerpt, content, icon, sort_order) VALUES
  ('acik-arttirma-nasil-verilir',
   'Açık Arttırma İlanı Nasıl Verilir?',
   'Aracınızı açık arttırmaya çıkarmak için adım adım rehber.',
   '<h2>Açık Arttırma İlanı Nasıl Verilir?</h2>
<p>Aracınızı <strong>arabamabak</strong> platformunda açık arttırmaya çıkarmak çok kolay. Aşağıdaki adımları takip edin:</p>

<h3>1. Üye Olun veya Giriş Yapın</h3>
<p>Hesabınız yoksa ücretsiz kayıt olun. Giriş yaptıktan sonra sağ üstteki menüden <strong>İlan Ver</strong> butonuna tıklayın.</p>

<h3>2. Araç Bilgilerini Girin</h3>
<p>Marka, model, yıl, kilometre, yakıt tipi gibi bilgileri eksiksiz doldurun. Doğru bilgi, alıcı güvenini artırır.</p>

<h3>3. Fotoğraflar Yükleyin</h3>
<p>En az 8 fotoğraf öneriyoruz: ön, arka, yan, iç mekan, motor bölmesi, bagaj. Net ve aydınlık fotoğraflar ilanınızı öne çıkarır.</p>

<h3>4. Boya / Değişen Beyanı</h3>
<p>Aracınızın boya ve değişen durumunu diyagram üzerinden işaretleyin. Dürüst beyan yasal haklarınızı korur.</p>

<h3>5. İlan Türü Seçin</h3>
<p><strong>Açık Arttırma</strong> (200 TL) veya <strong>Premium Açık Arttırma</strong> (500 TL). Premium ilanlar öne çıkan listede gösterilir.</p>

<h3>6. Ödeme Yapın</h3>
<p>Cüzdan, kredi kartı veya banka havalesi ile ödeyin. Ödeme onaylandıktan sonra ilanınız yayına alınır.</p>

<h3>7. Teklifleri Takip Edin</h3>
<p>İlan sayfanızdan gelen teklifleri canlı takip edin. Yayın süresi dolduğunda en yüksek teklif kazanır.</p>

<h3>💡 İpuçları</h3>
<ul>
  <li>Başlıkta marka, model ve yıl mutlaka olsun</li>
  <li>Tramer kaydı olan araçlar daha güvenilir</li>
  <li>Detaylı açıklama yazın (bakım, ekspertiz, hasar geçmişi)</li>
  <li>Konum bilgisini doğru girin</li>
</ul>',
   '🏗',
   1),

  ('acik-arttirmaya-nasil-katilnir',
   'Açık Arttırmaya Nasıl Katılınır?',
   'Açık arttırmada teklif verme, kazanan teklif, ödeme ve teslimat süreci.',
   '<h2>Açık Arttırmaya Nasıl Katılınır?</h2>
<p>arabamabak platformunda açık arttırmalara katılmak için bilmeniz gereken her şey:</p>

<h3>1. Üye Olun</h3>
<p>Ücretsiz üye olun, kimlik ve telefon doğrulamanızı tamamlayın. Doğrulanmamış üyeler teklif veremez.</p>

<h3>2. İlanları İnceleyin</h3>
<p>Anasayfada <strong>Açık Arttırma</strong> sekmesine tıklayın. Detaylı ilan sayfasında:</p>
<ul>
  <li>Aracın tüm fotoğrafları</li>
  <li>Boya / değişen beyanı</li>
  <li>Tramer kaydı (varsa)</li>
  <li>Hasar geçmişi</li>
  <li>Mevcut en yüksek teklif</li>
  <li>Kalan süre</li>
</ul>

<h3>3. Teklif Verin</h3>
<p><strong>Teminat Bedeli</strong> (varsa) önce cüzdana yatırılır. Teklif tutarını girin ve onaylayın. Her teklif <strong>otomatik olarak</strong> cüzdandan bloke edilir.</p>

<h3>4. Outbid (Geçilme)</h3>
<p>Başka biri sizden yüksek teklif verirse:</p>
<ul>
  <li>Bloke edilen tutar <strong>serbest bırakılır</strong></li>
  <li>Bildirim alırsınız (opsiyonel)</li>
  <li>Yeni teklif verebilirsiniz</li>
</ul>

<h3>5. Kazanırsanız</h3>
<p>Açık arttırma süresi dolduğunda en yüksek teklifi veren kazanır:</p>
<ol>
  <li>Kazanan kullanıcıya <strong>24 saat</strong> içinde bildirim gider</li>
  <li>Ödeme 48 saat içinde tamamlanmalıdır</li>
  <li>Satıcı ile iletişim kurulur, araç teslimi planlanır</li>
  <li>Teslim sonrası <strong>kazanan</strong> onay verir, satıcı parayı çeker</li>
</ol>

<h3>6. Kaybederseniz</h3>
<p>Tüm bloke tutarlar cüzdana iade edilir. Başka ilanlara teklif verebilirsiniz.</p>

<h3>⚠️ Önemli Kurallar</h3>
<ul>
  <li>Sahte teklif vermek yasaktır, hesap askıya alınır</li>
  <li>Teminat bedeli iade edilmez (kazanırsanız satışa mahsup)</li>
  <li>Teslim almayan kazananın teminatı yanar</li>
</ul>',
   '🔨',
   2),

  ('iletisim-ve-destek',
   'İletişim ve Destek',
   'Sorularınız için bize nasıl ulaşabilirsiniz.',
   '<h2>İletişim ve Destek</h2>
<p>Her türlü soru, öneri ve şikayet için bize ulaşabilirsiniz.</p>

<h3>📧 E-posta</h3>
<p>destek@arabamabak.com</p>

<h3>📞 Telefon</h3>
<p>+90 850 123 45 67 (Hafta içi 09:00 - 18:00)</p>

<h3>💬 Canlı Destek</h3>
<p>Sağ alttaki baloncuk simgesine tıklayarak canlı destek ekibimize ulaşabilirsiniz.</p>

<h3>📍 Adres</h3>
<p>arabamabak A.Ş.<br>
Levent Mah. Büyükdere Cad. No: 123<br>
Şişli / İstanbul</p>

<h3>⏰ Çalışma Saatleri</h3>
<ul>
  <li>Pazartesi - Cuma: 09:00 - 18:00</li>
  <li>Cumartesi: 10:00 - 14:00</li>
  <li>Pazar: Kapalı</li>
</ul>',
   '📞',
   3),

  ('guvenli-alisveris',
   'Güvenli Alışveriş Rehberi',
   'Güvenli bir açık arttırma deneyimi için bilmeniz gerekenler.',
   '<h2>Güvenli Alışveriş Rehberi</h2>

<h3>🔒 Platform Güvenliği</h3>
<p>arabamabak tüm ödemeleri <strong>emanet hesap</strong> sistemiyle korur. Para, araç teslim edilene kadar platformda tutulur.</p>

<h3>✅ Satıcı Doğrulama</h3>
<p>Tüm satıcılar TC kimlik ve telefon doğrulamalıdır. Belgeler platform tarafından kontrol edilir.</p>

<h3>🛡️ Alıcı Koruması</h3>
<ul>
  <li>7 gün içinde <strong>cayma hakkı</strong></li>
  <li>Aracın ilana uygun olmaması durumunda iade</li>
  <li>Sahte ilan durumunda tam iade</li>
</ul>

<h3>⚠️ Dikkat Edilmesi Gerekenler</h3>
<ul>
  <li>Tramer kaydı olmayan araçlara dikkat edin</li>
  <li>Çok düşük başlangıç fiyatı olan ilanları sorgulayın</li>
  <li>Yeni açılan satıcı hesaplarına temkinli yaklaşın</li>
</ul>

<h3>📞 Sorun Bildirimi</h3>
<p>Herhangi bir sorun yaşarsanız 7 gün içinde destek ekibimizle iletişime geçin.</p>',
   '🛡️',
   4)
ON CONFLICT (slug) DO NOTHING;
