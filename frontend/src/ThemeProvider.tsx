// arabamabak - ThemeProvider
// site_themes tablosundan aktif temayı çeker, CSS variable olarak uygular
// Real-time ile admin panelden tema değişince otomatik günceller

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import type { SiteTheme } from '../lib/types';

interface ThemeContextValue {
  loading: boolean;
  refresh: () => Promise<void>;
  theme: SiteTheme | null;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DEFAULT_THEME: SiteTheme = {
  accent_color: '#f59e0b',
  background_color: '#ffffff',
  body_line_height: 1.5,
  border_color: '#e5e7eb',
  border_radius_lg: '16px',
  border_radius_md: '8px',
  border_radius_sm: '4px',
  button_style: 'rounded',
  danger_color: '#ef4444',
  font_family_base: 'Inter, system-ui, sans-serif',
  font_family_heading: 'Inter, system-ui, sans-serif',
  font_size_base: '16px',
  font_weight_bold: 700,
  font_weight_normal: 400,
  heading_line_height: 1.2,
  id: 1,
  info_color: '#3b82f6',
  is_active: true,
  primary_color: '#dc2626',
  secondary_color: '#1f2937',
  shadow_lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
  shadow_md: '0 4px 6px -1px rgba(0,0,0,0.1)',
  shadow_sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  success_color: '#10b981',
  surface_color: '#f9fafb',
  text_color: '#111827',
  text_muted_color: '#6b7280',
  updated_at: new Date().toISOString(),
  updated_by: null,
  warning_color: '#f59e0b',
};

function applyThemeToDocument(theme: SiteTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary_color);
  root.style.setProperty('--color-secondary', theme.secondary_color);
  root.style.setProperty('--color-accent', theme.accent_color);
  root.style.setProperty('--color-background', theme.background_color);
  root.style.setProperty('--color-surface', theme.surface_color);
  root.style.setProperty('--color-text', theme.text_color);
  root.style.setProperty('--color-text-muted', theme.text_muted_color);
  root.style.setProperty('--color-border', theme.border_color);
  root.style.setProperty('--color-success', theme.success_color);
  root.style.setProperty('--color-warning', theme.warning_color);
  root.style.setProperty('--color-danger', theme.danger_color);
  root.style.setProperty('--color-info', theme.info_color);
  root.style.setProperty('--font-family-base', theme.font_family_base);
  root.style.setProperty('--font-family-heading', theme.font_family_heading);
  root.style.setProperty('--font-size-base', theme.font_size_base);
  root.style.setProperty('--font-weight-normal', String(theme.font_weight_normal));
  root.style.setProperty('--font-weight-bold', String(theme.font_weight_bold));
  root.style.setProperty('--heading-line-height', String(theme.heading_line_height));
  root.style.setProperty('--body-line-height', String(theme.body_line_height));
  root.style.setProperty('--radius-sm', theme.border_radius_sm);
  root.style.setProperty('--radius-md', theme.border_radius_md);
  root.style.setProperty('--radius-lg', theme.border_radius_lg);
  root.style.setProperty('--shadow-sm', theme.shadow_sm);
  root.style.setProperty('--shadow-md', theme.shadow_md);
  root.style.setProperty('--shadow-lg', theme.shadow_lg);
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setTheme] = useState<SiteTheme | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('site_themes')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.warn('Theme yüklenemedi, default kullanılıyor:', error.message);
        applyThemeToDocument(DEFAULT_THEME);
        setTheme(DEFAULT_THEME);
      } else if (data) {
        applyThemeToDocument(data as SiteTheme);
        setTheme(data as SiteTheme);
      }
    } catch (err) {
      console.error('Theme yükleme hatası:', err);
      applyThemeToDocument(DEFAULT_THEME);
      setTheme(DEFAULT_THEME);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    // Real-time: admin tema değiştirince otomatik güncelle
    const channel = supabase
      .channel('site_themes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_themes' },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <ThemeContext.Provider value={{ loading, refresh: load, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
