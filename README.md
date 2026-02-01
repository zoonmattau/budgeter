# Seedling - Budget App

A modern, gamified budgeting app that helps you plant your financial future and watch your savings grow.

## Features

- **Zero-Based Budgeting**: Give every dollar a job
- **Savings Goals**: Set goals with visual plant growth tracking
- **Bill Tracking**: Never miss a payment with upcoming bill reminders
- **Net Worth Tracking**: Monitor assets and liabilities with history charts
- **Social Leaderboards**: Compare net worth with friends and globally
- **Friend System**: Add friends via codes and compete together
- **Gamification**: Challenges, streaks, and achievements
- **Household Support**: Personal and shared budgets

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + PostgreSQL + Row Level Security)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
git clone <repo-url>
cd budgeter
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API and copy your project URL and anon key
3. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

Option A: Using Supabase CLI (recommended)
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Option B: Using Supabase Dashboard
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/20240101000000_initial_schema.sql`
3. Run the SQL

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Authenticated app routes
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budget/
│   │   ├── goals/
│   │   ├── bills/
│   │   ├── net-worth/
│   │   └── settings/
│   ├── (auth)/          # Auth routes (login/signup)
│   ├── auth/            # Auth callback
│   └── onboarding/      # New user setup
├── components/
│   ├── dashboard/       # Dashboard widgets
│   ├── goals/           # Goal components (plant visual)
│   ├── transactions/    # Transaction list, quick add
│   ├── budget/          # Budget builder
│   ├── bills/           # Bills list
│   ├── net-worth/       # Account management
│   ├── navigation/      # Bottom nav, top bar
│   ├── settings/        # Settings form
│   └── ui/              # Reusable UI (category chip, etc.)
├── lib/
│   ├── supabase/        # Supabase client (server/client)
│   ├── database.types.ts
│   └── utils.ts
└── middleware.ts        # Auth middleware
```

## Database Schema

See `supabase/migrations/20240101000000_initial_schema.sql` for the full schema.

Key tables:
- `profiles` - User profiles
- `categories` - Spending/income categories
- `budgets` - Monthly budget allocations
- `transactions` - Income and expenses
- `goals` - Savings goals
- `bills` - Recurring bills
- `accounts` - Net worth tracking
- `challenges` - Gamification challenges
- `user_stats` - XP, streaks, achievements

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Phase 2 Roadmap

- [ ] Bank account connections (Basiq)
- [ ] CSV import/export
- [ ] Push notifications
- [ ] Advanced forecasting
- [ ] Multi-currency support
- [ ] Native mobile apps

## License

MIT
