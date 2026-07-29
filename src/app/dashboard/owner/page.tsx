'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shop, Service, Employee, Booking, ChatRoom, UserProfile } from '@/types/database.types';
import { Store, Calendar, Users, Scissors, MessageSquare, CreditCard, Plus, CheckCircle2, AlertCircle, Trash2, Clock, MapPin, Check, ShieldCheck } from 'lucide-react';
import RealtimeChat from '@/components/chat/RealtimeChat';

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'shop' | 'services' | 'bookings' | 'employees' | 'chat'>('bookings');
  const [chatSubTab, setChatSubTab] = useState<'customer' | 'internal'>('customer');

  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Shop Setup Form State
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [shopSaveLoading, setShopSaveLoading] = useState(false);

  // Service Form State
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('45');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Employee Form State
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('Senior Groomer');

  // Selected Active Chat Room
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadOwnerData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch Owner Shop
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (shopData) {
        setShop(shopData);
        setShopName(shopData.name);
        setDescription(shopData.description || '');
        setAddress(shopData.address);
        setPhone(shopData.phone || '');

        // Fetch Services
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('shop_id', shopData.id);
        setServices(servicesData || []);

        // Fetch Employees
        const { data: employeesData } = await supabase
          .from('employees')
          .select('*, user:users(*)')
          .eq('shop_id', shopData.id);
        setEmployees(employeesData || []);

        // Fetch Bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*, user:users(*), service:services(*), employee:employees(*, user:users(*))')
          .eq('shop_id', shopData.id)
          .order('appointment_date', { ascending: false });
        setBookings(bookingsData || []);

        // Fetch Chat Rooms
        const { data: roomsData } = await supabase
          .from('chat_rooms')
          .select('*, customer:users(*)')
          .eq('shop_id', shopData.id);
        setChatRooms(roomsData || []);
      }

      setLoading(false);
    }

    loadOwnerData();
  }, [supabase]);

  // Handle Save / Update Shop Profile
  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setShopSaveLoading(true);

    if (shop) {
      // Update
      const { data } = await supabase
        .from('shops')
        .update({
          name: shopName,
          description,
          address,
          phone,
        })
        .eq('id', shop.id)
        .select()
        .single();
      if (data) setShop(data);
    } else {
      // Create
      const { data } = await supabase
        .from('shops')
        .insert({
          owner_id: currentUser.id,
          name: shopName,
          description,
          address,
          phone,
          subscription_status: 'active',
        })
        .select()
        .single();
      if (data) setShop(data);
    }
    setShopSaveLoading(false);
  };

  // Handle Add Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    const { data } = await supabase
      .from('services')
      .insert({
        shop_id: shop.id,
        name: newServiceName,
        price: parseFloat(newServicePrice),
        duration: parseInt(newServiceDuration),
        description: newServiceDesc,
      })
      .select()
      .single();

    if (data) {
      setServices([...services, data]);
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDesc('');
    }
  };

  // Handle Delete Service
  const handleDeleteService = async (id: string) => {
    await supabase.from('services').delete().eq('id', id);
    setServices(services.filter((s) => s.id !== id));
  };

  // Handle Add Employee by Email
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !empEmail) return;

    // Find user by email
    const { data: targetUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', empEmail.trim())
      .single();

    if (!targetUser) {
      alert('User with this email not found. Please ensure they have registered an account first.');
      return;
    }

    const { data: newEmp, error } = await supabase
      .from('employees')
      .insert({
        user_id: targetUser.id,
        shop_id: shop.id,
        role: empRole,
      })
      .select('*, user:users(*)')
      .single();

    if (error) {
      alert('Employee already assigned to this shop or error occurred.');
    } else if (newEmp) {
      setEmployees([...employees, newEmp]);
      setEmpEmail('');
    }
  };

  // Handle Update Booking Status
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: any) => {
    await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    setBookings(
      bookings.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
  };

  // Handle Create or Select Internal Staff Chat
  const handleEnsureInternalChat = async () => {
    if (!shop || !currentUser) return;
    const existing = chatRooms.find((r) => r.type === 'internal');
    if (existing) {
      setSelectedChatRoomId(existing.id);
    } else {
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'internal',
          shop_id: shop.id,
        })
        .select('*, customer:users(*)')
        .single();
      if (newRoom) {
        setChatRooms([...chatRooms, newRoom]);
        setSelectedChatRoomId(newRoom.id);
      }
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Owner Dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-400" />
            {shop ? shop.name : 'Setup Your Grooming Shop'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Shop Management System SaaS • Multi-Tenant Platform
          </p>
        </div>

        {shop && (
          <div className="flex items-center gap-3">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> SaaS Plan: Active Partner
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'bookings'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" /> Bookings & Queues ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'services'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Scissors className="w-4 h-4" /> Services & Catalog ({services.length})
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'employees'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Staff & Employees ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'chat'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Communications & Realtime Chat
        </button>

        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'shop'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Store className="w-4 h-4" /> Shop Profile & Subscription
        </button>
      </div>

      {/* TAB 1: BOOKINGS & QUEUE CALENDAR */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Daily & Weekly Queues</h2>
          </div>

          {bookings.length === 0 ? (
            <div className="glass-panel p-12 text-center text-slate-400 text-sm">
              No appointments booked yet for your shop.
            </div>
          ) : (
            <div className="overflow-x-auto glass-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Assigned Groomer</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Queue Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40">
                      <td className="p-4">
                        <div className="font-bold text-white">{b.user?.name || 'Customer'}</div>
                        <div className="text-[10px] text-slate-400">{b.pet_name || 'No Pet Name'}</div>
                      </td>
                      <td className="p-4 text-emerald-400 font-semibold">{b.service?.name}</td>
                      <td className="p-4 text-slate-300">
                        <div>{b.appointment_date}</div>
                        <div className="text-[10px] text-slate-400">{b.start_time} - {b.end_time}</div>
                      </td>
                      <td className="p-4 text-slate-300">
                        {b.employee?.user?.name || 'Unassigned'}
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold capitalize ${b.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {b.payment_status}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={b.status}
                          onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SERVICES & CATALOG */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 glass-panel p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Add New Service
            </h3>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="Full Haircut & Spa"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="45.00"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    placeholder="45"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Includes bath, blow dry, nail clipping, and fur styling."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button type="submit" className="w-full gradient-button py-2.5 rounded-xl text-xs font-semibold">
                Save Service
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-white">Active Service Catalog</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((s) => (
                <div key={s.id} className="glass-card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white">{s.name}</h4>
                      <span className="text-emerald-400 font-extrabold">${s.price}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/80 pt-3 mt-4 text-xs text-slate-400">
                    <span>{s.duration} minutes</span>
                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 glass-panel p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Assign Staff Member
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Registered User Email</label>
                <input
                  type="email"
                  required
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="employee@example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Specialization</label>
                <input
                  type="text"
                  required
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="Lead Groomer"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button type="submit" className="w-full gradient-button py-2.5 rounded-xl text-xs font-semibold">
                Add Employee
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-white">Current Staff Team</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {employees.map((emp) => (
                <div key={emp.id} className="glass-card p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                    {emp.user?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{emp.user?.name}</h4>
                    <p className="text-xs text-emerald-400 font-medium">{emp.role}</p>
                    <p className="text-[10px] text-slate-400">{emp.user?.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHAT SYSTEM */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
          {/* Chat Rooms Selector List */}
          <div className="md:col-span-1 glass-panel p-4 flex flex-col space-y-3">
            <div className="flex border-b border-slate-800 pb-2 gap-2">
              <button
                onClick={() => setChatSubTab('customer')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                  chatSubTab === 'customer' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                }`}
              >
                Customers
              </button>
              <button
                onClick={() => {
                  setChatSubTab('internal');
                  handleEnsureInternalChat();
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                  chatSubTab === 'internal' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                }`}
              >
                Internal Team
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {chatSubTab === 'customer' ? (
                chatRooms
                  .filter((r) => r.type === 'customer_shop')
                  .map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedChatRoomId(room.id)}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedChatRoomId === room.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold">{room.customer?.name || 'Customer Inquiry'}</div>
                      <div className="text-[10px] text-slate-400">{room.customer?.email}</div>
                    </button>
                  ))
              ) : (
                chatRooms
                  .filter((r) => r.type === 'internal')
                  .map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedChatRoomId(room.id)}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedChatRoomId === room.id
                          ? 'border-cyan-500 bg-cyan-500/10 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-cyan-300">Shop Internal Channel</div>
                      <div className="text-[10px] text-slate-400">Staff & Owner communications</div>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* Active Chat Window */}
          <div className="md:col-span-2">
            {selectedChatRoomId && currentUser ? (
              <RealtimeChat roomId={selectedChatRoomId} currentUserId={currentUser.id} />
            ) : (
              <div className="glass-panel h-full flex items-center justify-center text-slate-500 text-xs">
                Select a conversation thread to start live messaging.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SHOP PROFILE & SUBSCRIPTION */}
      {activeTab === 'shop' && (
        <div className="max-w-2xl mx-auto glass-panel p-8 space-y-6">
          <h3 className="text-lg font-bold text-white">Shop Information & Platform SaaS Settings</h3>

          <form onSubmit={handleSaveShop} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Shop Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Paws & Claws Pet Grooming"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your services, pet care philosophy, and experience..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Sukhumvit Road, Bangkok"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+66 81 234 5678"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={shopSaveLoading}
              className="w-full gradient-button py-3 rounded-xl text-xs font-semibold"
            >
              {shopSaveLoading ? 'Saving...' : 'Save Shop Profile'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
