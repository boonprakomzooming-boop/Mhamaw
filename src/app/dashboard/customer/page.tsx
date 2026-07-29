'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Booking, ChatRoom } from '@/types/database.types';
import { Calendar, Clock, Scissors, MapPin, MessageSquare, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import RealtimeChat from '@/components/chat/RealtimeChat';

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Active Chat State
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [chatShopName, setChatShopName] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Fetch user bookings with shop and service
        const { data } = await supabase
          .from('bookings')
          .select('*, shop:shops(*), service:services(*), employee:employees(*, user:users(*))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setBookings(data || []);
      }
      setLoading(false);
    }

    loadData();

    // Subscribe to realtime updates for bookings
    const channel = supabase
      .channel('customer_bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleOpenShopChat = async (shopId: string, shopName: string) => {
    if (!currentUser) return;
    setChatShopName(shopName);

    const { data: existingRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', currentUser.id)
      .eq('type', 'customer_shop');

    if (existingRooms && existingRooms.length > 0) {
      setActiveChatRoomId(existingRooms[0].id);
    } else {
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'customer_shop',
          shop_id: shopId,
          customer_id: currentUser.id,
        })
        .select()
        .single();

      if (newRoom) {
        setActiveChatRoomId(newRoom.id);
      }
    }
  };

  const handlePayment = async (bookingId: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, type: 'booking' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Payment demo mode: Payment status marked as paid.');
        await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', bookingId);
        window.location.reload();
      }
    } catch (err) {
      alert('Simulating direct payment: Payment status updated!');
      await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', bookingId);
      window.location.reload();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">Confirmed</span>;
      case 'in_progress':
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">In Progress</span>;
      case 'completed':
        return <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">Completed</span>;
      case 'cancelled':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">Cancelled</span>;
      default:
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold">Pending Approval</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Queue & Booking History</h1>
          <p className="text-xs text-slate-400 mt-1">Track your upcoming grooming appointments and live status</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-12">Loading your bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-4">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">No Appointments Booked Yet</h3>
          <p className="text-xs text-slate-500">Explore partner grooming shops and book your first pet grooming slot!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="glass-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{booking.shop?.name || 'Grooming Shop'}</h3>
                    <p className="text-xs font-semibold text-teal-400">{booking.service?.name}</p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    <span>{booking.appointment_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>{booking.start_time} - {booking.end_time}</span>
                  </div>
                  {booking.pet_name && (
                    <div className="col-span-2 text-slate-400">
                      <span className="font-semibold text-slate-300">Pet:</span> {booking.pet_name}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Price: <strong className="text-white">${booking.service?.price}</strong></span>
                  <span className="capitalize">
                    Payment Status: {' '}
                    <strong className={booking.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}>
                      {booking.payment_status}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-800/80 pt-4">
                <button
                  onClick={() => handleOpenShopChat(booking.shop_id, booking.shop?.name || 'Shop')}
                  className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-teal-400 text-xs font-semibold hover:bg-slate-800 flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Chat Shop
                </button>

                {booking.payment_status === 'unpaid' && booking.status !== 'cancelled' && (
                  <button
                    onClick={() => handlePayment(booking.id)}
                    className="flex-1 gradient-button py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Realtime Chat Drawer */}
      {activeChatRoomId && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-400" /> Chat with {chatShopName}
            </h3>
            <button
              onClick={() => setActiveChatRoomId(null)}
              className="text-slate-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <RealtimeChat roomId={activeChatRoomId} currentUserId={currentUser?.id} />
          </div>
        </div>
      )}
    </div>
  );
}
