# Pow3Folio

**Web3 Native Portfolio & Proof-of-Work Platform**

One clean, shareable link for crypto professionals — traders, community managers, researchers, airdrop hunters and builders.

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
- [x] Sign up / Login
- [x] Protected dashboard shell
- [ ] Profile system (Stage 1)
- [ ] Proof of Work sections (Stage 1)

## Local Setup

1. Clone the repo
```bash
git clone https://github.com/Dwise3310/pow3folio.git
cd pow3folio
npm install
```

2. Create `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://qdpzxshuxyrzamdkjeha.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Color Palette

| Token | Value | Use |
|-------|-------|-----|
| Background | `#09090b` | Page bg |
| Surface | `#18181b` | Cards |
| Primary | `#10b981` | Brand / proof accent |
| Accent | `#22d3ee` | Secondary highlights |
| Text | `#fafafa` / `#a1a1aa` | Hierarchy |

## Roadmap

See project brief for full stages. Stage 1 = Profile + Writing + Trading + Community.
