'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Booking, Employee, ChatRoom } from '@/types/database.types';
import { Calendar, Clock, Briefcase, MessageSquare, CheckCircle2 } from 'lucide-react';
import RealtimeChat from '@/components/chat/RealtimeChat';

export default function EmployeeDashboard() {
  const [assignedBookings, setAssignedBookings] = useState<Booking[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<Employee | null>(null);
  const [internalRoomId, setInternalRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadEmployeeData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch Employee record
      const { data: empData } = await supabase
        .from('employees')
        .select('*, shop:shops(*)')
        .eq('user_id', user.id)
        .single();

      if (empData) {
        setEmployeeProfile(empData);

        // Fetch assigned queue bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*, user:users(*), service:services(*)')
          .eq('shop_id', empData.shop_id)
          .order('appointment_date', { ascending: true });

        setAssignedBookings(bookingsData || []);

        // Fetch internal chat room
        const { data: room } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('shop_id', empData.shop_id)
          .eq('type', 'internal')
          .single();

        if (room) {
          setInternalRoomId(room.id);
        }
      }

      setLoading(false);
    }

    loadEmployeeData();
  }, [supabase]);

  const handleUpdateStatus = async (bookingId: string, newStatus: any) => {
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
    setAssignedBookings(
      assignedBookings.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Staff Dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-cyan-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            Staff Operational Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Grooming Queue Tasks • {employeeProfile?.shop?.name || 'Grooming Salon'}
          </p>
        </div>

        {employeeProfile && (
          <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-full font-bold">
            Role: {employeeProfile.role}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" /> Today&apos;s Queue Tasks
          </h2>

          {assignedBookings.length === 0 ? (
            <div className="glass-panel p-8 text-center text-slate-400 text-sm">
              No tasks assigned yet.
            </div>
          ) : (
            <div className="space-y-3">
              {assignedBookings.map((b) => (
                <div key={b.id} className="glass-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{b.service?.name}</h3>
                      <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                        Pet: {b.pet_name || 'N/A'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Customer: <strong className="text-slate-200">{b.user?.name}</strong> • Time:{' '}
                      <span className="text-cyan-300 font-medium">{b.start_time} - {b.end_time}</span>
                    </p>

                    {b.notes && (
                      <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-2 rounded-lg mt-2">
                        Note: {b.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                      value={b.status}
                      onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 w-full md:w-auto"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Internal Owner Chat */}
        <div className="md:col-span-1 glass-panel p-4 flex flex-col h-[500px]">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" /> Internal Shop Channel
          </h3>
          <div className="flex-1 overflow-hidden">
            {internalRoomId && currentUser ? (
              <RealtimeChat roomId={internalRoomId} currentUserId={currentUser.id} />
            ) : (
              <div className="text-center text-xs text-slate-500 py-8">
                Internal channel not initialized. Contact shop owner.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
