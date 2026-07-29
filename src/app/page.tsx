'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shop } from '@/types/database.types';
import Link from 'next/link';
import { Search, MapPin, Scissors, Star, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';

export default function MarketplaceHome() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchShops() {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setShops(data);
      }
      setLoading(false);
    }
    fetchShops();
  }, [supabase]);

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(search.toLowerCase()) ||
      shop.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 p-8 sm:p-12">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-2xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Pet Grooming Booking & Management Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Give Your Pets The <span className="gradient-text">VIP Care</span> They Deserve
          </h1>

          <p className="text-slate-400 text-base sm:text-lg">
            Discover top-rated pet grooming salons, compare services, book instant queue slots, and track appointment status live.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by shop name, city, or address..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Shop Listings */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Featured Grooming Shops</h2>
            <p className="text-xs text-slate-400 mt-1">Browse active shops ready for appointments</p>
          </div>
          <span className="text-xs text-teal-400 bg-teal-950/60 border border-teal-800/40 px-3 py-1 rounded-full font-medium">
            {filteredShops.length} Shops Available
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 glass-card animate-pulse" />
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="glass-panel p-12 text-center space-y-4">
            <Scissors className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-300">No Shops Found</h3>
            <p className="text-xs text-slate-500">
              {search ? 'Try adjusting your search criteria.' : 'Be the first shop owner to register your salon!'}
            </p>
            <Link
              href="/register"
              className="inline-block gradient-button text-xs px-4 py-2 rounded-xl"
            >
              Register a Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop) => (
              <div key={shop.id} className="glass-card flex flex-col overflow-hidden group">
                <div className="h-44 bg-gradient-to-tr from-slate-900 to-teal-950 relative flex items-center justify-center p-4">
                  {shop.image_url ? (
                    <img
                      src={shop.image_url}
                      alt={shop.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Scissors className="w-10 h-10 text-teal-400/60 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-slate-400">MhaMaw Partner</span>
                    </div>
                  )}
                  {shop.subscription_status === 'active' && (
                    <span className="absolute top-3 right-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Premium Verified
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors">
                      {shop.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {shop.description || 'Professional pet bath, haircut, nail trim, and styling services.'}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="truncate">{shop.address}</span>
                    </div>
                  </div>

                  <Link
                    href={`/shops/${shop.id}`}
                    className="w-full gradient-button py-2.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5" /> View Services & Book Queue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
