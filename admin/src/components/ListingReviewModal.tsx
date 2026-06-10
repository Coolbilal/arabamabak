import { useState } from 'react';
import {
  Eye, X, Loader2, CheckCircle2, XCircle, ImageOff,
  Calendar, Gauge, Fuel, Settings2, MapPin, Tag, Hash, Sparkles,
  FileText, User, AlertTriangle, Gavel,
} from 'lucide-react';
import { formatPrice, formatDate, cn } from '../lib/utils';
import type { Vehicle, VehicleImage, ListingStatus, Auction } from '../lib/types';

export type ReviewRow = Vehicle & {
  brand?: { name: string; logo_url: string | null } | null;
  model?: { name: string } | null;
  engine_size?: { displacement: string } | null;
  images?: VehicleImage[];
  seller?: { full_name: string | null; email: string | null; phone: string | null } | null;
  auction?: (Auction & { slot?: any }) | null;
  rejection_reason?: string | null;
};

const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Taslak', pending: 'Onay Bekliyor', active: 'Yayında',
  sold: 'Satıldı',
  sold_pending_confirmation: 'Onay Bekliyor (Satıcı)', expired: 'Süresi Doldu', rejected: 'Reddedildi', cancelled: 'İptal',
};
const STATUS_CLASS: Record<ListingStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  sold: 'bg-blue-100 text-blue-700',
  expired: 'bg-slate-200 text-slate-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
};
const LISTING_TYPE_LABELS: Record<string, string> = {
  free: 'Ücretsiz', auction: 'Açık Arttırma', premium_auction: 'Premium Açık Arttırma',
};
const LISTING_TYPE_CLASS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700',
  auction: 'bg-sky-100 text-sky-700',
  premium_auction: 'bg-amber-100 text-amber-700',
};

export function ListingReviewModal({
  row, onClose, onApprove, onReject, approving, showAuctionInfo = true,
}: {
  row: ReviewRow;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  showAuctionInfo?: boolean;
}) {
  // Defensive defaults: tüm alanlar undefined olabilir
  const r = {
    title: row.title ?? '—',
    year: row.year ?? 0,
    km: row.km ?? 0,
    price: row.price ?? 0,
    fuel: row.fuel ?? '—',
    transmission: row.transmission ?? '—',
    body: row.body ?? '—',
    color: row.color ?? '',
    city: row.city ?? '',
    district: row.district ?? '',
    description: row.description ?? '',
    damage_record: row.damage_record ?? false,
    damage_detail: row.damage_detail ?? '',
    exchange_accepted: row.exchange_accepted ?? false,
    engine_power_kw: row.engine_power_kw ?? null,
    view_count: row.view_count ?? 0,
    favorite_count: row.favorite_count ?? 0,
    created_at: row.created_at ?? new Date().toISOString(),
    is_premium: row.is_premium ?? false,
    listing_type: row.listing_type ?? 'free',
    status: row.status ?? 'pending',
    rejection_reason: row.rejection_reason ?? null,
    brand: row.brand ?? null,
    model: row.model ?? null,
    engine_size: row.engine_size ?? null,
    seller: row.seller ?? null,
    auction: row.auction ?? null,
  } as const;
  const [activeImage, setActiveImage] = useState(0);
  const imgs = row.images ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-xl bg-white shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-sky-600" /> İlan İncelemesi
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-slate-900 p-4">
            {imgs.length > 0 ? (
              <div>
                <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={imgs[activeImage]?.url}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                {imgs.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {imgs.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImage(i)}
                        className={cn('h-16 w-20 shrink-0 rounded border-2 overflow-hidden',
                          i === activeImage ? 'border-sky-500' : 'border-transparent')}
                      >
                        <img src={img.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center text-slate-500">
                <ImageOff className="h-12 w-12" />
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{r.title}</h2>
                <div className="text-sm text-slate-500 mt-1">
                  {r.brand?.name} {r.model?.name} • {r.year} • {r.km.toLocaleString('tr-TR')} km
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                  LISTING_TYPE_CLASS[r.listing_type])}>
                  {r.listing_type === 'free' ? <Tag className="h-3 w-3" /> : <Gavel className="h-3 w-3" />}
                  {LISTING_TYPE_LABELS[r.listing_type]}
                </span>
                <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_CLASS[r.status])}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            </div>

            <div className="text-3xl font-extrabold text-sky-700">{formatPrice(r.price)}</div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Spec icon={<Calendar className="h-4 w-4" />} label="Yıl" value={String(r.year)} />
              <Spec icon={<Gauge className="h-4 w-4" />} label="KM" value={r.km.toLocaleString('tr-TR')} />
              <Spec icon={<Fuel className="h-4 w-4" />} label="Yakıt" value={r.fuel} />
              <Spec icon={<Settings2 className="h-4 w-4" />} label="Vites" value={r.transmission} />
              <Spec icon={<Tag className="h-4 w-4" />} label="Kasa" value={r.body} />
              <Spec icon={<Hash className="h-4 w-4" />} label="Motor Hacmi" value={r.engine_size?.displacement || '—'} />
              <Spec icon={<Sparkles className="h-4 w-4" />} label="Motor Gücü" value={r.engine_power_kw ? `${r.engine_power_kw} kW` : '—'} />
              <Spec icon={<MapPin className="h-4 w-4" />} label="Konum" value={`${r.city}${r.district ? ' / ' + r.district : ''}`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <Info label="Renk" value={r.color || '—'} />
              <Info label="Takas" value={r.exchange_accepted ? '✓ Kabul' : '✗ Kabul Değil'} />
              <Info label="Hasar Kaydı" value={r.damage_record ? '⚠ Var' : '✓ Yok'} />
              <Info label="Premium" value={r.is_premium ? '⭐ Evet' : 'Hayır'} />
            </div>

            {r.damage_record && r.damage_detail && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
                <div className="font-semibold text-amber-800 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Hasar Detayı
                </div>
                <div className="text-amber-900">{r.damage_detail}</div>
              </div>
            )}

            {r.description && (
              <div>
                <div className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <FileText className="h-4 w-4" /> Satıcı Açıklaması
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-line rounded-md bg-slate-50 p-3 border border-slate-200">
                  {r.description}
                </div>
              </div>
            )}

            <div className="rounded-md bg-slate-50 p-3 border border-slate-200">
              <div className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-2">
                <User className="h-4 w-4" /> Satıcı Bilgileri
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <Info label="Ad Soyad" value={r.seller?.full_name || '—'} />
                <Info label="E-posta" value={r.seller?.email || '—'} />
                <Info label="Telefon" value={r.seller?.phone || '—'} />
              </div>
            </div>

            {showAuctionInfo && r.auction && (
              <div className="rounded-md bg-sky-50 border border-sky-200 p-3">
                <div className="text-sm font-semibold text-sky-800 flex items-center gap-1 mb-2">
                  <Gavel className="h-4 w-4" /> Açık Arttırma Bilgileri
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <Info label="Durum" value={r.auction.status} />
                  <Info label="Açılış" value={formatPrice(r.auction.opening_price)} />
                  <Info label="Şu Anki" value={formatPrice(r.auction.current_price)} />
                  <Info label="Slot" value={r.auction.slot_id ? 'Atanmış ✓' : 'Atanmamış ✗'} />
                </div>
              </div>
            )}

            {r.status === 'rejected' && r.rejection_reason && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm">
                <div className="font-semibold text-red-800 mb-1 flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> Red Sebebi
                </div>
                <div className="text-red-900">{r.rejection_reason}</div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Görüntülenme</div>
                <div className="font-bold text-slate-800">👁 {r.view_count}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Favori</div>
                <div className="font-bold text-slate-800">♥ {r.favorite_count}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">İlan Tarihi</div>
                <div className="font-bold text-slate-800 text-xs">{formatDate(r.created_at)}</div>
              </div>
            </div>
          </div>
        </div>

        {r.status === 'pending' || r.status === 'rejected' ? (
          <div className="px-5 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
            <div className="text-xs text-slate-500">
              {r.status === 'pending'
                ? 'Bu ilan onayınızı bekliyor. İncelemeyi tamamladıktan sonra onaylayın veya reddedin.'
                : 'Bu ilan daha önce reddedildi. Tekrar onaylayabilir veya reddedebilirsiniz.'}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary">Kapat</button>
              <button
                onClick={onReject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" /> Reddet
              </button>
              <button
                onClick={onApprove}
                disabled={approving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Onayla ve Yayınla
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end bg-slate-50">
            <button onClick={onClose} className="btn-secondary">Kapat</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
      <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">{icon} {label}</div>
      <div className="text-sm font-semibold text-slate-800 capitalize">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

export { STATUS_LABELS, STATUS_CLASS, LISTING_TYPE_LABELS, LISTING_TYPE_CLASS };
