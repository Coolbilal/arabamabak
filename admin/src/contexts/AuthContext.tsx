import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface AdminUser {
  id: string;          // admin_users.id
  user_id: string;     // auth.users.id
  username: string;
  full_name: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  permissions: Array<{ area: string; can_view: boolean; can_edit: boolean; can_approve: boolean; can_delete: boolean }>;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  admin: AdminUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (area: string, action?: 'view' | 'edit' | 'approve' | 'delete') => boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAdmin(uid: string) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id,user_id,username,full_name,is_super_admin,is_active,admin_permissions(*)')
      .eq('user_id', uid)
      .eq('is_active', true)
      .maybeSingle();
    console.log('[Auth] loadAdmin result:', { data, error });
    if (!error && data) {
      console.log('[Auth] is_super_admin:', data.is_super_admin, 'permissions count:', (data.admin_permissions || []).length);
      setAdmin({
        id: data.id,
        user_id: data.user_id,
        username: data.username,
        full_name: data.full_name,
        is_super_admin: data.is_super_admin,
        is_active: data.is_active,
        permissions: (data.admin_permissions || []).map((p: any) => ({
          area: p.area,
          can_view: p.can_view,
          can_edit: p.can_edit,
          can_approve: p.can_approve,
          can_delete: p.can_delete,
        })),
      });
    } else {
      setAdmin(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadAdmin(s.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadAdmin(s.user.id);
      else setAdmin(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session, user, admin, loading,
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => { if (user) await loadAdmin(user.id); },
    hasPermission: (area, action) => {
      if (!admin) return false;
      if (admin.is_super_admin) return true;
      // Önce area+sub_area=null olan kayda bak (ana alan yetkisi)
      const main = admin.permissions.find((x) => x.area === area && (x as any).sub_area === null);
      if (main) {
        if (!action) return main.can_view;
        return (
          (action === 'view' && main.can_view) ||
          (action === 'edit' && main.can_edit) ||
          (action === 'approve' && main.can_approve) ||
          (action === 'delete' && main.can_delete)
        );
      }
      // Ana alan yetkisi yoksa: herhangi bir sub_area yetkisi var mı kontrol et
      // (Örn. catalog:otomobil yetkisi varsa, catalog için de izin var say)
      const anySub = admin.permissions.find((x) => x.area === area);
      if (!anySub) return false;
      if (!action) return anySub.can_view;
      return (
        (action === 'view' && anySub.can_view) ||
        (action === 'edit' && anySub.can_edit) ||
        (action === 'approve' && anySub.can_approve) ||
        (action === 'delete' && anySub.can_delete)
      );
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
