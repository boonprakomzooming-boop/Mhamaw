-- ========================================================
-- PET GROOMING BOOKING & MARKETPLACE PLATFORM SCHEMA
-- Supabase PostgreSQL + Row Level Security (RLS) Policies
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('user', 'owner', 'employee');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');
CREATE TYPE chat_room_type AS ENUM ('customer_shop', 'internal');
CREATE TYPE subscription_status_type AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive');

-- 2. USERS TABLE
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SHOPS TABLE
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  image_url TEXT,
  subscription_status subscription_status_type DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SERVICES TABLE
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration INT NOT NULL, -- Duration in minutes
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. EMPLOYEES TABLE
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Groomer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, shop_id)
);

-- 6. BOOKINGS TABLE
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  pet_name TEXT,
  notes TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CHAT ROOMS TABLE
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type chat_room_type NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. SUBSCRIPTIONS TABLE
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID UNIQUE NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  status subscription_status_type NOT NULL DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- AUTOMATIC USER SYNC FROM SUPABASE AUTH TO PUBLIC.USERS
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'user'::public.user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Supabase Realtime for Messages & Bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- USERS POLICIES
-- --------------------------------------------------------
CREATE POLICY "Public users are viewable by authenticated users" 
  ON public.users FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.users FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- --------------------------------------------------------
-- SHOPS POLICIES
-- --------------------------------------------------------
CREATE POLICY "Shops are viewable by anyone" 
  ON public.shops FOR SELECT 
  USING (true);

CREATE POLICY "Owners can insert their own shop" 
  ON public.shops FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own shop" 
  ON public.shops FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = owner_id);

-- --------------------------------------------------------
-- SERVICES POLICIES
-- --------------------------------------------------------
CREATE POLICY "Services are viewable by anyone" 
  ON public.services FOR SELECT 
  USING (true);

CREATE POLICY "Owners can insert services for their shop" 
  ON public.services FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE id = shop_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update/delete services for their shop" 
  ON public.services FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE id = shop_id AND owner_id = auth.uid()
    )
  );

-- --------------------------------------------------------
-- EMPLOYEES POLICIES
-- --------------------------------------------------------
CREATE POLICY "Employees viewable by shop owner and staff" 
  ON public.employees FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE id = shop_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can manage employees" 
  ON public.employees FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE id = shop_id AND owner_id = auth.uid()
    )
  );

-- --------------------------------------------------------
-- BOOKINGS POLICIES
-- --------------------------------------------------------
CREATE POLICY "Customers can view their own bookings" 
  ON public.bookings FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Shop owners and assigned employees can view shop bookings" 
  ON public.bookings FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.employees WHERE shop_id = bookings.shop_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create bookings" 
  ON public.bookings FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners and employees can update bookings" 
  ON public.bookings FOR UPDATE 
  TO authenticated 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.employees WHERE shop_id = bookings.shop_id AND user_id = auth.uid()
    )
  );

-- --------------------------------------------------------
-- CHAT ROOMS & MESSAGES POLICIES
-- --------------------------------------------------------
CREATE POLICY "Users can view chat rooms they belong to" 
  ON public.chat_rooms FOR SELECT 
  TO authenticated 
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.employees WHERE shop_id = chat_rooms.shop_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create chat rooms" 
  ON public.chat_rooms FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can view messages in their chat rooms" 
  ON public.messages FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = room_id AND (
        cr.customer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.shops WHERE id = cr.shop_id AND owner_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.employees WHERE shop_id = cr.shop_id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can insert messages in their chat rooms" 
  ON public.messages FOR INSERT 
  TO authenticated 
  WITH CHECK (sender_id = auth.uid());

-- --------------------------------------------------------
-- SUBSCRIPTIONS POLICIES
-- --------------------------------------------------------
CREATE POLICY "Owners can view their shop subscriptions" 
  ON public.subscriptions FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage their subscriptions" 
  ON public.subscriptions FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid()
    )
  );
