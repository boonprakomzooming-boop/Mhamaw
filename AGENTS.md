# AGENTS.md - Mhamaw Pet Grooming SaaS Platform

## 🐾 Project Overview
**Mhamaw (หมาหมาว)** is a full-stack Pet Grooming SaaS & Booking Marketplace platform built for pet owners, salon owners, and grooming staff.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS, Lucide React Icons
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime Chat)
- **Payments**: Stripe API (Checkout Sessions & Webhooks for Bookings and SaaS Subscriptions)
- **Deployment**: Vercel & GitHub Actions

---

## 📁 Repository Structure
```
Mhamaw/
├── src/
│   ├── app/
│   │   ├── api/stripe/         # Stripe checkout & webhook endpoints
│   │   ├── dashboard/          # Role-based dashboards (customer, owner, employee)
│   │   ├── shops/[id]/         # Shop details & booking page
│   │   ├── login/ & register/  # Authentication pages
│   │   └── layout.tsx & page.tsx
│   ├── components/
│   │   ├── chat/               # Supabase Realtime Chat
│   │   └── layout/             # Navbar, Footer, and UI Shell
│   ├── lib/
│   │   └── supabase/           # SSR client, server, and middleware helpers
│   └── types/                  # database.types.ts (Supabase TypeScript definitions)
├── schema.sql                  # PostgreSQL Database DDL, RLS Policies, Seed Data
├── .env.local.example          # Environment variables template
├── package.json
└── tsconfig.json
```

---

## 📜 Development & Operational Rules

### 1. Windows Execution Environment
- On Windows PowerShell, execute Node commands using `npm.cmd` (e.g., `npm.cmd run dev`, `npm.cmd run build`).

### 2. Type Safety & Fallback Environment Variables
- Maintain strict TypeScript type definitions in `src/types/database.types.ts`.
- Ensure Supabase client helpers (`client.ts`, `server.ts`, `middleware.ts`) include fallback values (`process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'`) to avoid static build crashes on Vercel.

### 3. Build & Deployment Verification
- Always execute `npm.cmd run build` to verify type safety and static generation before committing or declaring a task finished.

### 4. Database & RLS Integrity
- When modifying database tables or schemas, update `schema.sql` and `src/types/database.types.ts` simultaneously.
- Verify Row Level Security (RLS) policies for multi-tenant isolation across `shops`, `bookings`, `employees`, and `chat_rooms`.
