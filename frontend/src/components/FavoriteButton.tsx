import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface FavoriteButtonProps {
  vehicleId?: string;
  auctionId?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({
  vehicleId,
  auctionId,
  size = 'md',
  showCount = false,
  className,
  onToggle,
}: FavoriteButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isFav, setIsFav] = useState(false);
  const [count, setCount] = useState(0);

  // Kullanıcının favorileyip favorilemediğini kontrol et
  useEffect(() => {
    if (!user) {
      setIsFav(false);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq(vehicleId ? 'vehicle_id' : 'auction_id', vehicleId || auctionId || '')
        .maybeSingle();
      if (active) setIsFav(!!data);
    })();
    return () => { active = false; };
  }, [user, vehicleId, auctionId]);

  // Favori sayısı (anonim gösterim)
  useEffect(() => {
    if (!showCount) return;
    let active = true;
    (async () => {
      const { count: c } = await supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq(vehicleId ? 'vehicle_id' : 'auction_id', vehicleId || auctionId || '');
      if (active) setCount(c || 0);
    })();
    return () => { active = false; };
  }, [showCount, vehicleId, auctionId, isFav]);

  const toggleMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('login_required');
      const targetCol = vehicleId ? 'vehicle_id' : 'auction_id';
      const targetId = vehicleId || auctionId;
      if (isFav) {
        // Çıkar
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq(targetCol, targetId!);
        if (error) throw error;
        return false;
      } else {
        // Ekle
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            [targetCol]: targetId,
            notify_auction_start: true,
            notify_price_drop: true,
          });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: (newFav) => {
      setIsFav(newFav);
      setCount((c) => c + (newFav ? 1 : -1));
      onToggle?.(newFav);
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      // Login'e yönlendir, sonra geri dön
      const returnTo = window.location.pathname + window.location.search;
      navigate(`/giris?return=${encodeURIComponent(returnTo)}`);
      return;
    }
    toggleMut.mutate();
  }

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggleMut.isPending}
      className={cn(
        'inline-flex items-center gap-1 transition-all',
        'hover:scale-110 active:scale-95',
        'disabled:opacity-50',
        className
      )}
      title={isFav ? 'Favoriden Çıkar' : 'Favorile'}
      aria-label={isFav ? 'Favoriden Çıkar' : 'Favorile'}
    >
      <Star
        className={cn(
          sizeClasses,
          isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-400 hover:text-amber-400',
          'transition-colors'
        )}
      />
      {showCount && count > 0 && (
        <span className="text-xs text-slate-600 font-medium">{count}</span>
      )}
    </button>
  );
}
