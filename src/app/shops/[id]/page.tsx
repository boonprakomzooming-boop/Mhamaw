'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shop, Service, Employee } from '@/types/database.types';
import { MapPin, Phone, Scissors, Calendar, Clock, DollarSign, MessageSquare, AlertCircle, CheckCircle2, User } from 'lucide-react';
import RealtimeChat from '@/components/chat/RealtimeChat';

export default function ShopDetailsPage() {
  const params = useParams();
  const shopId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Booking Modal State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [petName, setPetName] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat Drawer State
  const [showChat, setShowChat] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShopData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch Shop details
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();
      setShop(shopData);

      // Fetch Services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shopId);
      setServices(servicesData || []);

      // Fetch Staff/Employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*, user:users(*)')
        .eq('shop_id', shopId);
      setEmployees(employeesData || []);

      setLoading(false);
    }

    fetchShopData();
  }, [shopId, supabase]);

  const handleOpenChat = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Check if chat room already exists
    const { data: existingRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', currentUser.id)
      .eq('type', 'customer_shop');

    if (existingRooms && existingRooms.length > 0) {
      setChatRoomId(existingRooms[0].id);
    } else {
      // Create new chat room
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'customer_shop',
          shop_id: shopId,
          customer_id: currentUser.id,
        })
        .select()
        .single();

      if (newRoom) {
        setChatRoomId(newRoom.id);
      }
    }
    setShowChat(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!selectedService || !appointmentDate || !startTime) {
      setError('Please fill in all required fields');
      return;
    }

    setBookingLoading(true);
    setError(null);

    // Calculate end time based on duration
    const [hours, mins] = startTime.split(':').map(Number);
    const endMinutesTotal = hours * 60 + mins + selectedService.duration;
    const endH = Math.floor(endMinutesTotal / 60) % 24;
    const endM = endMinutesTotal % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    try {
      const { error: insertError } = await supabase.from('bookings').insert({
        shop_id: shopId,
        user_id: currentUser.id,
        service_id: selectedService.id,
        employee_id: selectedEmployeeId || null,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTimeStr,
        pet_name: petName,
        notes: notes,
        status: 'pending',
        payment_status: 'unpaid',
      });

      if (insertError) throw insertError;

      setBookingSuccess(true);
      setTimeout(() => {
        setSelectedService(null);
        setBookingSuccess(false);
        router.push('/dashboard/customer');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit booking queue');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Shop Details...</div>;
  }

  if (!shop) {
    return <div className="p-12 text-center text-slate-400">Shop not found.</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl">
                <Scissors className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{shop.name}</h1>
                <p className="text-xs text-slate-400 mt-0.5">{shop.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-2">
              <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <MapPin className="w-3.5 h-3.5 text-teal-400" /> {shop.address}
              </span>
              {shop.phone && (
                <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  <Phone className="w-3.5 h-3.5 text-teal-400" /> {shop.phone}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleOpenChat}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Live Chat with Shop
          </button>
        </div>
      </div>

      {/* Services Listing */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Scissors className="w-5 h-5 text-teal-400" /> Services & Grooming Packages
        </h2>

        {services.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-400 text-sm">
            No services listed by this shop yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div key={service.id} className="glass-card p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-bold text-white">{service.name}</h3>
                    <span className="text-lg font-extrabold text-teal-400">${service.price}</span>
                  </div>
                  <p className="text-xs text-slate-400">{service.description || 'Full pet grooming treatment'}</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-400" /> {service.duration} mins
                  </span>

                  <button
                    onClick={() => setSelectedService(service)}
                    className="gradient-button text-xs px-4 py-2 rounded-xl"
                  >
                    Book Queue
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Drawer / Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 space-y-6 relative border-teal-500/30">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Book Appointment Queue</h3>
                <p className="text-xs text-teal-400 font-medium">{selectedService.name} (${selectedService.price})</p>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-white">Booking Confirmed!</h4>
                <p className="text-xs text-slate-400">Redirecting to your bookings dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Select Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Time Slot *</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {employees.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Groomer (Optional)</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Any Available Groomer</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.user?.name || 'Staff Groomer'} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pet Name / Breed</label>
                  <input
                    type="text"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="e.g. Milo (Golden Retriever)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Special Notes for Groomer</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any allergies, sensitive skin, or special requests..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="w-1/2 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-1/2 gradient-button py-2.5 rounded-xl text-xs font-semibold"
                  >
                    {bookingLoading ? 'Submitting Queue...' : 'Confirm Queue Booking'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Realtime Chat Drawer */}
      {showChat && chatRoomId && currentUser && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-400" /> Chat with {shop.name}
            </h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-slate-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <RealtimeChat roomId={chatRoomId} currentUserId={currentUser.id} />
          </div>
        </div>
      )}
    </div>
  );
}
