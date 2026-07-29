'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types/database.types';
import { Scissors, User, Store, Briefcase, LogOut, Calendar, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }
    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Scissors className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Mha<span className="gradient-text">Maw</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-900"
          >
            Find Shops
          </Link>

          {!loading && (
            <>
              {profile ? (
                <div className="flex items-center space-x-3">
                  {profile.role === 'user' && (
                    <Link
                      href="/dashboard/customer"
                      className="flex items-center space-x-1 text-sm font-medium text-teal-400 hover:text-teal-300 px-3 py-2 rounded-lg bg-teal-950/40 border border-teal-800/50"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      My Bookings
                    </Link>
                  )}

                  {profile.role === 'owner' && (
                    <Link
                      href="/dashboard/owner"
                      className="flex items-center space-x-1 text-sm font-medium text-emerald-400 hover:text-emerald-300 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50"
                    >
                      <Store className="w-4 h-4 mr-1" />
                      Shop Dashboard
                    </Link>
                  )}

                  {profile.role === 'employee' && (
                    <Link
                      href="/dashboard/employee"
                      className="flex items-center space-x-1 text-sm font-medium text-cyan-400 hover:text-cyan-300 px-3 py-2 rounded-lg bg-cyan-950/40 border border-cyan-800/50"
                    >
                      <Briefcase className="w-4 h-4 mr-1" />
                      Staff Dashboard
                    </Link>
                  )}

                  <div className="h-4 w-px bg-slate-800" />

                  <div className="flex items-center space-x-2 text-sm text-slate-300">
                    <span className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400">
                      {profile.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <span className="hidden sm:inline-block font-medium">{profile.name}</span>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="gradient-button text-sm px-4 py-2 rounded-lg"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
