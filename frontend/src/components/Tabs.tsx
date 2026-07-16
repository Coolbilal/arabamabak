import { useState, type ReactNode } from 'react';
import { cn } from '../lib/utils';

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
  badge?: string | number;
};

type Props = {
  tabs: TabItem[];
  defaultTabId?: string;
  className?: string;
};

/**
 * Genel Tabs componenti — client-side state ile çalışır (URL değişmez).
 * Aktif tab altı çizgi + içerik gösterimi.
 */
export default function Tabs({ tabs, defaultTabId, className }: Props) {
  const [activeId, setActiveId] = useState<string>(defaultTabId ?? tabs[0]?.id ?? '');

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className={cn('w-full', className)}>
      {/* Tab başlıkları */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px',
                isActive
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              )}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    isActive ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Aktif tab içeriği */}
      <div className="py-4">{activeTab?.content}</div>
    </div>
  );
}
