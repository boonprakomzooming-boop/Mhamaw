---
name: mhamaw-dev
description: Specialized workflows, architectural guidelines, database schemas, and troubleshooting procedures for the Mhamaw Pet Grooming SaaS Platform.
---

# Mhamaw Development & Architecture Skill

This skill provides step-by-step developer guidelines, system architecture details, database models, and common troubleshooting patterns for **Mhamaw (หมาหมาว)**.

---

## 🏗️ Architecture Overview

Mhamaw is structured around three primary user roles:
1. **Customer (`user`)**: Explores salons, books grooming appointments, processes payments via Stripe, and chats with salons.
2. **Shop Owner (`owner`)**: Manages salon profile, services, grooming staff, subscription plans, and customer queue.
3. **Employee (`employee`)**: Views assigned grooming queue tasks and communicates via internal shop chat rooms.

---

## 🗄️ Database & TypeScript Model Synchronisation

When updating Supabase PostgreSQL tables in `schema.sql`, always maintain `src/types/database.types.ts`:

- **User Profiles**: `UserProfile` (`id`, `role`, `name`, `email`, `phone`, `avatar_url`)
- **Shops**: `Shop` (`id`, `owner_id`, `name`, `description`, `address`, `phone`, `subscription_status`)
- **Employees**: `Employee` (`id`, `user_id`, `shop_id`, `role`, `user?`, `shop?`)
- **Bookings**: `Booking` (`id`, `shop_id`, `user_id`, `service_id`, `appointment_date`, `status`, `payment_status`, `service?`, `shop?`, `user?`, `employee?`)
- **Chat Rooms**: `ChatRoom` (`id`, `type`, `shop_id`, `customer_id`, `shop?`, `customer?`)

---

## 💳 Stripe Integration Patterns

- **Checkout Endpoint**: `src/app/api/stripe/checkout/route.ts`
  - Handles single appointment payment checkout (`mode: 'payment'`) and monthly SaaS subscriptions (`mode: 'subscription'`).
- **Webhook Endpoint**: `src/app/api/stripe/webhook/route.ts`
  - Verifies `stripe-signature`.
  - On `checkout.session.completed`, updates `bookings.payment_status = 'paid'` or `shops.subscription_status = 'active'`.

---

## 🔧 Build & Deployment Checklist

Before pushing changes to GitHub or deploying to Vercel:

1. **Verify Local Build**:
   ```powershell
   npm.cmd run build
   ```
2. **Check Git Status & Remote**:
   ```powershell
   & "C:\Users\thani\AppData\Local\GitHubDesktop\app-3.5.10\resources\app\git\cmd\git.exe" status
   ```
3. **Push to Remote Branch**:
   ```powershell
   & "C:\Users\thani\AppData\Local\GitHubDesktop\app-3.5.10\resources\app\git\cmd\git.exe" push origin main
   ```
