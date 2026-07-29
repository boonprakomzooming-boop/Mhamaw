'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message } from '@/types/database.types';
import { Send, User } from 'lucide-react';

interface RealtimeChatProps {
  roomId: string;
  currentUserId: string;
}

export default function RealtimeChat({ roomId, currentUserId }: RealtimeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. Fetch initial messages
    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:users(*)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }

    fetchMessages();

    // 2. Subscribe to new realtime messages
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch sender details for newly arrived message
          const { data: senderData } = await supabase
            .from('users')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const fullMessage: Message = {
            ...(payload.new as Message),
            sender: senderData || undefined,
          };

          setMessages((prev) => [...prev, fullMessage]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const msgContent = newMsg.trim();
    setNewMsg('');

    await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: currentUserId,
      content: msgContent,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-xs text-slate-500 py-4">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">
            No messages yet. Send a message to start chatting!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-teal-400 shrink-0">
                    {msg.sender?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  {!isMe && (
                    <div className="text-[10px] font-bold text-teal-300 mb-0.5">
                      {msg.sender?.name || 'User'}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <div className="text-[9px] text-right mt-1 opacity-60">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={!newMsg.trim()}
          className="p-2 rounded-xl gradient-button disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
