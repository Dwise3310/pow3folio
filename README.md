# Pow3Folio

**Web3 Native Portfolio and Proof of Work Platform**

One clean, shareable link for crypto professionals: traders, community managers, researchers, airdrop hunters and builders.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** (dark theme)
- **Supabase** (Auth + Postgres + Storage)
- **Vercel** (hosting)

## Stage 0 Status

- [x] Project structure
- [x] Dark theme + brand palette
- [x] Supabase client setup
- [x] Landing page
- [x] Auth pages (login / signup)
- [x] Middleware session refresh
- [x] Dashboard shell

## Local development

```bash
npm install
cp .env.local.example .env.local
# fill Supabase URL + anon key
npm run dev
```

## Deploy

Push to `main`; Vercel builds automatically.
