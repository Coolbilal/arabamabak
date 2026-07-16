import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type PaintPart = {
  id: string;
  part_code: string;
  status: 'original' | 'painted' | 'changed' | 'none';
};

type Props = {
  vehicleId: string;
};

// 14 parça: ön tampon, kaput, tavan, bagaj kapağı, 4 kapı, 4 çamurluk, 2 yan kenar
const PARTS: { code: string; label: string; row: number; col: number }[] = [
  // Ön kısım (row 0)
  { code: 'front_bumper', label: 'Ön Tampon', row: 0, col: 1 },
  { code: 'hood', label: 'Kaput', row: 0, col: 2 },
  // Sol taraf (row 1, sol)
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk', row: 1, col: 0 },
  { code: 'left_front_door', label: 'Sol Ön Kapı', row: 1, col: 1 },
  { code: 'left_rear_door', label: 'Sol Arka Kapı', row: 1, col: 2 },
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk', row: 1, col: 3 },
  // Orta (row 2)
  { code: 'roof', label: 'Tavan', row: 2, col: 1 },
  { code: 'trunk', label: 'Bagaj Kapağı', row: 2, col: 2 },
  // Sağ taraf (row 3)
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk', row: 3, col: 0 },
  { code: 'right_front_door', label: 'Sağ Ön Kapı', row: 3, col: 1 },
  { code: 'right_rear_door', label: 'Sağ Arka Kapı', row: 3, col: 2 },
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk', row: 3, col: 3 },
  // Ön/arka kenar (row 4)
  { code: 'rear_bumper', label: 'Arka Tampon', row: 4, col: 1 },
];

// Renk kodları
const STATUS_COLOR: Record<string, { bg: string; border: string; text: string; label: string }> = {
  original: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800', label: 'Orijinal' },
  painted: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800', label: 'Boyalı' },
  changed: { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-800', label: 'Değişen' },
  none: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-500', label: 'Belirtilmemiş' },
};

const STATUS_PRIORITY: Record<string, number> = { original: 0, none: 1, painted: 2, changed: 3 };

/**
 * İlan detay sayfasında gösterilen boya/değişen diyagramı.
 * Üstten görünüm (araba kuşbakışı).
 * Parçalar grid layout ile gösterilir, renk kodlu.
 */
export default function VehiclePaintDiagram({ vehicleId }: Props) {
  const partsQ = useQuery({
    queryKey: ['vehicle-paint-parts', vehicleId],
    enabled: !!vehicleId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_paint_parts')
        .select('id, part_code, status')
        .eq('vehicle_id', vehicleId);
      if (error) throw error;
      return (data ?? []) as PaintPart[];
    },
  });

  const partsMap = new Map<string, string>();
  (partsQ.data ?? []).forEach((p) => partsMap.set(p.part_code, p.status));

  // Veri yoksa bilgi mesajı
  if (partsQ.data && partsQ.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">
          Bu ilan için boya / değişen bilgisi henüz girilmemiş.
        </p>
      </div>
    );
  }

  // Parçaları grid'e yerleştir
  const rows: Record<number, typeof PARTS> = {};
  PARTS.forEach((p) => {
    if (!rows[p.row]) rows[p.row] = [];
    rows[p.row].push(p);
  });

  // Özet istatistik
  const summary = { original: 0, painted: 0, changed: 0, none: 0 };
  (partsQ.data ?? []).forEach((p) => {
    if (summary[p.status] !== undefined) summary[p.status]++;
  });

  return (
    <div className="space-y-4">
      {/* Özet */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-center">
          <div className="text-lg font-bold text-emerald-700">{summary.original}</div>
          <div className="text-emerald-700">Orijinal</div>
        </div>
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-center">
          <div className="text-lg font-bold text-amber-700">{summary.painted}</div>
          <div className="text-amber-700">Boyalı</div>
        </div>
        <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-center">
          <div className="text-lg font-bold text-rose-700">{summary.changed}</div>
          <div className="text-rose-700">Değişen</div>
        </div>
      </div>

      {/* Diyagram — basit grid (üstten görünüm) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 text-xs text-slate-500 text-center font-medium">
          Üstten Görünüm (Kuşbakışı)
        </div>
        <div className="space-y-2">
          {Object.keys(rows)
            .sort()
            .map((rowKey) => {
              const row = rows[Number(rowKey)];
              return (
                <div
                  key={rowKey}
                  className="grid grid-cols-4 gap-2"
                >
                  {row.map((part) => {
                    const status = partsMap.get(part.code) ?? 'none';
                    const c = STATUS_COLOR[status];
                    return (
                      <div
                        key={part.code}
                        className={`rounded border ${c.bg} ${c.border} ${c.text} px-2 py-3 text-center text-xs font-medium`}
                      >
                        <div className="font-bold">{c.label}</div>
                        <div className="text-[10px] opacity-80 mt-1">{part.label}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      </div>

      {/* Renk açıklaması */}
      <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
        <div className="font-medium text-slate-700 mb-1">Renk Açıklaması:</div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500" />
          <span>Orijinal — değişmemiş, fabrika boyası</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-amber-500" />
          <span>Boyalı — lokal boya yapılmış</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-rose-500" />
          <span>Değişen — parça değişmiş</span>
        </div>
      </div>
    </div>
  );
}
