import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader, MessageSquare, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatDate } from '../lib/utils';
import type { Conversation, Message, Profile } from '../lib/types';

interface ConvRow extends Conversation {
  other?: Profile | null;
  unread_count?: number;
}

export default function MessagesPage() {
  const { user, profile } = useAuth();
  if (!user) return <Navigate to="/giris" replace />;

  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Konuşma listesi
  const convQuery = useQuery({
    queryKey: ['conversations', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Conversation[];

      // Diğer katılımcıların id'sini topla
      const otherIds = Array.from(
        new Set(rows.map((r) => (r.participant_a === user.id ? r.participant_b : r.participant_a))),
      );
      let profilesMap: Record<string, Profile> = {};
      if (otherIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('id', otherIds);
        for (const p of (profs ?? []) as unknown as Profile[]) profilesMap[p.id] = p;
      }

      // Okunmamış sayıları
      const { data: msgData } = await supabase
        .from('messages')
        .select('conversation_id, sender_id, is_read')
        .in('conversation_id', rows.map((r) => r.id))
        .neq('sender_id', user.id)
        .eq('is_read', false);
      const unreadMap: Record<string, number> = {};
      for (const m of (msgData ?? []) as unknown as Array<{ conversation_id: string; sender_id: string; is_read: boolean }>) {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1;
      }

      return rows.map<ConvRow>((r) => ({
        ...r,
        other: profilesMap[r.participant_a === user.id ? r.participant_b : r.participant_a] ?? null,
        unread_count: unreadMap[r.id] ?? 0,
      }));
    },
  });

  // Seçili konuşmanın mesajları
  const messagesQuery = useQuery({
    queryKey: ['messages', selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Message[];
    },
  });

  // İlk yüklemede ilk konuşmayı seç
  useEffect(() => {
    if (!selectedId && convQuery.data && convQuery.data.length > 0) {
      setSelectedId(convQuery.data[0].id);
    }
  }, [convQuery.data, selectedId]);

  // Realtime: yeni mesaj
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`conv:${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['messages', selectedId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, qc]);

  // Mesaj okundu işaretle
  useEffect(() => {
    if (!selectedId || !messagesQuery.data) return;
    const unread = messagesQuery.data.filter((m) => m.sender_id !== user.id && !m.is_read);
    if (unread.length === 0) return;
    supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unread.map((m) => m.id))
      .then(() => {
        qc.invalidateQueries({ queryKey: ['conversations', user.id] });
      });
  }, [selectedId, messagesQuery.data, user.id, qc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data?.length]);

  const selectedConv = convQuery.data?.find((c) => c.id === selectedId) ?? null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId) return;
    setSending(true);
    try {
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: selectedId,
        sender_id: user.id,
        content,
      });
      if (msgErr) throw msgErr;
      const preview = content.length > 100 ? content.slice(0, 100) + '…' : content;
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: preview,
        })
        .eq('id', selectedId);
      setDraft('');
      qc.invalidateQueries({ queryKey: ['messages', selectedId] });
      qc.invalidateQueries({ queryKey: ['conversations', user.id] });
    } catch (err) {
      const e = err as Error;
      alert(e.message || 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const conversations = convQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-extrabold text-slate-900">Mesajlarım</h1>

      <div className="card grid h-[calc(100vh-220px)] min-h-[520px] grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
        {/* Sol: konuşma listesi */}
        <div className="flex flex-col border-b border-slate-200 md:border-b-0 md:border-r">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            Konuşmalar
          </div>
          <div className="flex-1 overflow-y-auto">
            {convQuery.isLoading ? (
              <div className="flex items-center justify-center p-6 text-slate-500">
                <Loader className="h-5 w-5 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
                <MessageCircle className="h-10 w-10 text-slate-300" />
                <p>Henüz mesajınız yok.</p>
                <p className="text-xs text-slate-400">
                  Araç detay sayfasından ilan sahibine mesaj gönderebilirsiniz.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition',
                          active ? 'bg-brand-50' : 'hover:bg-slate-50',
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                          {(c.other?.full_name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {c.other?.full_name ?? 'Bilinmeyen kullanıcı'}
                            </div>
                            <div className="shrink-0 text-[10px] text-slate-400">
                              {formatDate(c.last_message_at)}
                            </div>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <div className="truncate text-xs text-slate-500">
                              {c.last_message_preview ?? '—'}
                            </div>
                            {c.unread_count && c.unread_count > 0 ? (
                              <span className="badge bg-brand-600 text-white">
                                {c.unread_count}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Sağ: mesajlaşma alanı */}
        <div className="flex min-h-0 flex-col">
          {!selectedConv ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-500">
              <MessageSquare className="h-12 w-12 text-slate-300" />
              <p>Mesajlaşmak için bir konuşma seçin.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {(selectedConv.other?.full_name?.[0] ?? '?').toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedConv.other?.full_name ?? 'Bilinmeyen kullanıcı'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedConv.other?.email ?? '—'}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                {messagesQuery.isLoading ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <Loader className="h-5 w-5 animate-spin" />
                  </div>
                ) : (messagesQuery.data ?? []).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Henüz mesaj yok. İlk mesajı siz gönderin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(messagesQuery.data ?? []).map((m) => {
                      const mine = m.sender_id === user.id;
                      return (
                        <div
                          key={m.id}
                          className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                              mine
                                ? 'rounded-br-sm bg-brand-600 text-white'
                                : 'rounded-bl-sm bg-white text-slate-800',
                            )}
                          >
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            <div
                              className={cn(
                                'mt-1 text-[10px]',
                                mine ? 'text-white/70' : 'text-slate-400',
                              )}
                            >
                              {formatDate(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  className="input"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || draft.trim() === ''}
                  className="btn-primary"
                  aria-label="Gönder"
                >
                  {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="hidden sm:inline">Gönder</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Giriş yapan: {profile?.full_name ?? user.email}
      </p>
    </div>
  );
}
