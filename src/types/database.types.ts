export type UserRole = 'user' | 'owner' | 'employee';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type ChatRoomType = 'customer_shop' | 'internal';
export type SubscriptionStatusType = 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address: string;
  phone?: string | null;
  image_url?: string | null;
  subscription_status: SubscriptionStatusType;
  created_at: string;
}

export interface Service {
  id: string;
  shop_id: string;
  name: string;
  description?: string | null;
  duration: number; // in minutes
  price: number;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  shop_id: string;
  role: string;
  created_at: string;
  user?: UserProfile;
  shop?: Shop;
}

export interface Booking {
  id: string;
  shop_id: string;
  user_id: string;
  service_id: string;
  employee_id?: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  pet_name?: string | null;
  notes?: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  service?: Service;
  shop?: Shop;
  user?: UserProfile;
  employee?: Employee;
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  shop_id: string;
  customer_id?: string | null;
  created_at: string;
  shop?: Shop;
  customer?: UserProfile;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: UserProfile;
}

export interface Subscription {
  id: string;
  shop_id: string;
  plan_name: string;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  status: SubscriptionStatusType;
  created_at: string;
}
