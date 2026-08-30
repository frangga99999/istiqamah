# Istiqamah — Personal Prayer Discipline Assistant

A mobile-first PWA that learns each user's prayer patterns and reminds at the
right time — helping build the habit of praying on time, congregationally at the
mosque, and consistently, one step at a time.

Not a prayer reminder. An **adaptive prayer discipline assistant**: it knows not
just *when* a prayer is due, but when *this user* needs to start getting ready.

## Stack

- **Next.js 16** (App Router) · **React 19** · **Tailwind v4** — static, mobile-first
- **[adhan](https://github.com/batoulapps/adhan-js)** — prayer-time calculation (Kemenag default)
- **localStorage** — offline-first working set (check-in works with no network)
- **Supabase** — auth (magic link + Google) + cloud sync, off gracefully until configured
- Deterministic adaptive engine — **no ML**: rolling averages, thresholds, weighted recency

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (all routes static)
npm test             # adaptive engine self-check (16 assertions)
```

The app works **fully local-first** with no backend. Supabase only adds sign-in
and cross-device sync.

## Supabase setup

`.env.local` is already pointed at the `Istiqamah_apps_frangga` project and the
schema (`supabase/migrations/0001_init.sql`) is applied (tables + row-level
security, all owner-only). Two manual dashboard steps remain for auth:

1. **Redirect URLs** — Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**` (add your production URL later)
   - Magic-link sign-in works as soon as this is set.
2. **Google (optional)** — Authentication → Providers → Google: add a Google
   Cloud OAuth client ID + secret. Not needed for magic-link sign-in.

## Deploy (GitHub Pages)

Live at **https://frangga99999.github.io/istiqamah/**. Static export under the
`/istiqamah` base path (`NEXT_PUBLIC_BASE_PATH`), served from the `gh-pages`
branch. Only you can sign in and see your data; the public URL just serves the shell.

**For sign-in to work on the live site**, add the Pages URL in Supabase →
Authentication → URL Configuration:
- Site URL: `https://frangga99999.github.io/istiqamah`
- Redirect URLs: add `https://frangga99999.github.io/istiqamah/**`

Re-deploy after changes:

```bash
NEXT_PUBLIC_BASE_PATH=/istiqamah npm run build
cd out && touch .nojekyll && git init -q && git checkout -q -b gh-pages \
  && git add -A && git commit -qm deploy \
  && git push -qf https://github.com/frangga99999/istiqamah.git gh-pages && rm -rf .git
```

To make pushes auto-deploy via GitHub Actions instead, grant the `workflow` scope
once (`gh auth refresh -s workflow`) and add a Pages workflow that builds with
`NEXT_PUBLIC_BASE_PATH=/istiqamah` and publishes `out/`.

## Architecture

```
src/lib/
  prayer/times.ts     adhan wrapper — schedule, next prayer, tz-correct days
  prayer/state.ts     UPCOMING · PREPARATION · PRAYER_TIME · LATE_RISK · COMPLETED · MISSED
  engine/profile.ts   rolling behaviour profile + risk (recency-weighted)
  engine/adaptive.ts  reminder planner — risk → discrete lead-time grid
  today.ts            Home view-model (schedule + logs + engine)
  journey.ts          weekly metrics, trend, goal promotion
  focus.ts            starting strategy + goal ladder
  store.ts            local-first store (localStorage) + sync merge
  sync.ts             local ↔ Supabase (pull-merge-push, last-write-wins)
  notify.ts           notification copy + foreground scheduler
```

The core loop the whole product serves: **observe → predict → intervene →
record → learn → adjust**, reducing reminders as discipline grows.

Data is private by default. No public profiles, no leaderboards, no guilt
design — a missed prayer is a quiet dash, never a red alarm.
