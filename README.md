# Adapsis

**Enterprise B2B dynamic product configurator & sales management platform.**

Built for factories and custom manufacturers (transformers, industrial panels, machinery, etc.) where products aren't defined by fixed attributes — a configurator + CRM + quote management system with a fully dynamic product model.

🔗 **Demo:** [adapsis.vercel.app](https://adapsis.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Notes](#architecture-notes)
- [Getting Started](#getting-started)
- [Demo Credentials](#demo-credentials)
- [Project Structure](#project-structure)
- [Database](#database)

## Features

**Product & Pricing**
- Unlimited dynamic variation groups and options (JSONB-based, no fixed schema)
- Price effect types: fixed amount, percentage, multiplier
- Base price + multi-currency support (live exchange rate conversion)
- Inventory/stock reservation tied to selected options

**Sales Configurator**
- Step-by-step configuration with dependent dropdowns
- Real-time total price calculation
- Quote templates (save/reuse common configurations)
- Quote duplication

**CRM**
- Customer, contact, activity (call/email/meeting) and task tracking
- Sales pipeline for opportunities (lead → qualified → proposal → negotiation → won/lost)
- Customer document management (Supabase Storage)

**Admin & Reporting**
- Admin approval workflow (quotes above discount threshold, product/inventory requests)
- Sales quota and commission tracking
- Role-based access: `admin` / `sales`
- Multi-tenant (multiple organizations) support

**Platform**
- Global search (⌘K / Ctrl+K) — customers, quotes, products
- i18n (TR/EN)
- Daily automatic demo data reseed via Vercel Cron

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Row-Level Security) |
| UI | Tailwind CSS 4, Radix UI, Framer Motion, Recharts |
| State | Zustand |
| Tables | TanStack Table |
| Deploy | Vercel |

## Architecture Notes

- **Dynamic product model:** Products have no predefined columns; each one is defined through the `product_variants` table via a JSONB `options` field. Adding a new attribute never requires a schema change.
- **Multi-currency:** All prices are stored in the database as `base_currency` (USD) and converted to the live rate on the sales screen.
- **Multi-tenant:** Every row is scoped by `organization_id`, isolated via RLS policies to prevent cross-organization data leaks.

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL / anon key / secret key
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Demo Credentials

🔗 [adapsis.vercel.app/login](https://adapsis.vercel.app/login)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@adapsis.com` | `Portfolyo2026!` |
| Sales | `satis@adapsis.com` | `Portfolyo2026!` |
| Sales | `mehmet.satis@adapsis.com` | `Portfolyo2026!` |
| Sales | `zeynep.satis@adapsis.com` | `Portfolyo2026!` |

> Demo data is automatically reset and reseeded every night at 03:00 (Vercel Cron).

## Project Structure

```
src/app/
├── admin/            # Product builder, inventory, pipeline, requests, settings
├── sales/            # Configurator, dashboard, quotes, new quote
├── api/              # Cron (demo reseed), inventory list, exchange rates
├── login/            # Authentication
└── shared/           # Shared components

scripts/
├── seed-demo.mjs     # Demo organization + users + full data set
├── create-admin.mjs  # Create a single admin user
└── create-sales.mjs  # Create a single sales user

supabase/
├── migrations/       # Sequential SQL migrations
└── seed.sql
```

## Database

The schema is managed as sequential SQL files under `supabase/migrations/` (up to migration 033): products/variants, inventory, customers/contacts, activities/tasks/opportunities, quotes/templates, system requests, sales quotas, and multi-tenant organization support.
