'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database.types';
import Link from 'next/link';
import { User, Store, Briefcase, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        if (role === 'owner') {
          router.push('/dashboard/owner');
        } else if (role === 'employee') {
          router.push('/dashboard/employee');
        } else {
          router.push('/dashboard/customer');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8">
      <div className="glass-panel p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
          <p className="text-sm text-slate-400 mt-1">Select your role and start using MhaMaw Platform</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Role Selector Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Select Account Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  role === 'user'
                    ? 'border-teal-500 bg-teal-500/10 text-white ring-1 ring-teal-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <User className={`w-5 h-5 ${role === 'user' ? 'text-teal-400' : 'text-slate-400'}`} />
                  {role === 'user' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Customer</div>
                  <div className="text-[10px] text-slate-400">Book queues & services</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  role === 'owner'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Store className={`w-5 h-5 ${role === 'owner' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {role === 'owner' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Shop Owner</div>
                  <div className="text-[10px] text-slate-400">Manage shop & staff</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('employee')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  role === 'employee'
                    ? 'border-cyan-500 bg-cyan-500/10 text-white ring-1 ring-cyan-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Briefcase className={`w-5 h-5 ${role === 'employee' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {role === 'employee' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Employee</div>
                  <div className="text-[10px] text-slate-400">View queues & chat</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-button py-3 rounded-xl text-sm font-semibold"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-teal-400 hover:text-teal-300 font-semibold underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
