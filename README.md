# NomadPilot ✈

Autonomous AI travel platform — plan, book, and monitor trips via natural language.

## Architecture (matches flowchart)

| Stage | Component | Backend |
|-------|-----------|---------|
| Intent Capture | `InputStage` | — |
| AI Brain | `ProcessingStage` | `/api/ai-brain` → OpenAI GPT-4o |
| Trip Generation | `ProcessingStage` | `/api/trip-generate` → Amadeus |
| Optimization | `ProcessingStage` | Scoring in `trip-generate` |
| Confirmation | `ConfirmationStage` | — |
| Booking | `BookingStage` | `/api/book` → Amadeus |
| Real-time Ops | `OpsStage` | `/api/ops` → Supabase |
| Organizer | `OrganizerStage` | Supabase |
| Post-Trip | `PostTripStage` | — |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required keys:
- **Supabase**: Create project at [supabase.com](https://supabase.com)
- **OpenAI**: Get key at [platform.openai.com](https://platform.openai.com)
- **Amadeus**: Get free test keys at [developers.amadeus.com](https://developers.amadeus.com)

### 3. Database setup

Run `supabase-schema.sql` in your Supabase SQL editor.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
# Set env vars in Vercel dashboard, then:
vercel --prod
```

## Key integrations

- **Airlines/GDS**: Amadeus REST API (swap to production endpoint + credentials when live)
- **Hotels/OTAs**: Amadeus Hotel Search API
- **AI Brain**: OpenAI GPT-4o with structured JSON outputs
- **Database**: Supabase (Postgres + Realtime)
- **Auth**: Supabase Auth (add `@supabase/auth-helpers-nextjs` for full auth flow)

## Extending

- **Ground transport**: Add rail/car APIs in `lib/amadeus/index.ts`
- **Calendar sync**: Add Google Calendar OAuth in `organizer` route
- **Payments**: Add Stripe in `/api/book`
- **Corporate policy**: Extend `CorporatePolicy` type and enforce in optimizer
- **Real-time ops**: Set up Amadeus flight status webhooks → `/api/ops`
