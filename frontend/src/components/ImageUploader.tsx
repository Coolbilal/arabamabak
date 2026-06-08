import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, X, ArrowUp, ArrowDown, Image as ImageIcon, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, publicUrl } from '../lib/supabase';
import { cn } from '../lib/utils';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  bucket?: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export default function ImageUploader({ value, onChange, max = 8, bucket = 'vehicle-images' }: Props) {
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      if (!user) throw new Error('Giriş yapmalısınız');
      if (value.length + files.length > max) {
        throw new Error(`Maksimum ${max} görsel`);
      }
      const urls: string[] = [];
      const total = files.length;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.size > MAX_BYTES) throw new Error('Dosya 10MB\'dan büyük');
        if (!ALLOWED.includes(f.type)) throw new Error('Geçersiz dosya türü (jpeg/png/webp/avif)');
        const path = `${user.id}/${Date.now()}-${i}-${f.name.replace(/\s+/g, '-')}`;
        const { error } = await supabase.storage.from(bucket).upload(path, f, {
          cacheControl: '3600',
          upsert: false,
        });
        if (error) throw error;
        urls.push(publicUrl(bucket, path));
        setProgress(Math.round(((i + 1) / total) * 100));
      }
      return urls;
    },
    onSuccess: (urls) => {
      onChange([...value, ...urls]);
      setProgress(0);
    },
    onError: (err: Error) => {
      alert(err.message);
      setProgress(0);
    },
  });

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    upload.mutate(arr);
  };

  const remove = (i: number) => {
    const next = value.filter((_, idx) => idx !== i);
    onChange(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const remaining = max - value.length;
  const disabled = value.length >= max || upload.isPending;

  return (
    <div>
      <div
        onClick={() => !disabled && fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition',
          disabled
            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
            : dragging
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-slate-300 bg-white text-slate-500 hover:border-brand-400 hover:bg-slate-50',
        )}
      >
        {upload.isPending ? (
          <>
            <Loader className="h-8 w-8 animate-spin text-brand-600" />
            <div className="text-sm font-semibold text-slate-700">Yükleniyor... %{progress}</div>
            <div className="mt-1 h-2 w-48 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8" />
            <div className="text-sm font-semibold">
              {value.length >= max
                ? `Maksimum ${max} görsel yüklendi`
                : 'Sürükle bırak veya tıkla (max 8 görsel)'}
            </div>
            <div className="text-xs text-slate-400">
              JPEG, PNG, WebP, AVIF · Maks 10MB · Kalan: {remaining}
            </div>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {value.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
            >
              <img
                src={url}
                alt={`Görsel ${i + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Kapak
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-700 disabled:opacity-30"
                    aria-label="Yukarı"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-700 disabled:opacity-30"
                    aria-label="Aşağı"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white"
                  aria-label="Sil"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {!url.startsWith('http') && (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
