import { useAuth } from '../contexts/AuthContext';
import { Bell } from 'lucide-react';

export default function Topbar() {
  const { admin } = useAuth();
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-sm font-medium text-slate-500">Yönetim Paneli</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-slate-100">
          <Bell className="h-5 w-5 text-slate-500" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800">{admin?.full_name || admin?.username}</div>
          <div className="text-xs text-slate-500">{admin?.is_super_admin ? 'Süper Admin' : 'Admin'}</div>
        </div>
      </div>
    </header>
  );
}
