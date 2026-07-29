import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard/customer';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch or create user record in public.users
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile) {
          await supabase.from('users').insert({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
            role: 'user',
          });
        }

        if (profile?.role === 'owner') {
          return NextResponse.redirect(`${origin}/dashboard/owner`);
        } else if (profile?.role === 'employee') {
          return NextResponse.redirect(`${origin}/dashboard/employee`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate with Google`);
}
