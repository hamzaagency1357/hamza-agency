# Hamza Agency — Project Foundation

> **Phase 1** · Premium Next.js 15 foundation — Luxury · Futuristic · Premium

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Database | Supabase |
| Hosting | Vercel |
| PWA | Web App Manifest + meta tags |
| i18n | Arabic / English / Turkish (Phase 2) |
| Theme | Dark / Light mode (Phase 2 toggle) |

---

## Design System

| Token | Value |
|-------|-------|
| **Premium Black** | `#0A0A0A` — `#161616` — `#242424` |
| **Royal Purple** | `#7B2FBE` — `#4A1080` — `#1A0533` |
| **Luxury Gold** | `#C9A84C` — `#F0D060` — `#8B6914` |
| **Display Font** | Cormorant Garamond (luxury serif) |
| **Body Font** | DM Sans (clean modern) |
| **Arabic Font** | Noto Naskh Arabic |

---

## Prerequisites

Make sure you have:

- **Node.js** v18.17 or later → https://nodejs.org
- **npm** v9+ (comes with Node.js)
- A **Supabase** account → https://supabase.com (free tier is fine)
- A **GitHub** account → https://github.com
- A **Vercel** account → https://vercel.com (free tier is fine)

---

## Local Setup

### Step 1 — Clone the project

```bash
git clone https://github.com/YOUR_USERNAME/hamza-agency.git
cd hamza-agency
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Set up environment variables

```bash
# Copy the example file
cp .env.example .env.local
```

Now open `.env.local` in your editor and fill in your values:

```env
# Required for Supabase connection:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Required for WhatsApp:
NEXT_PUBLIC_WHATSAPP_NUMBER=971501234567
```

> **Where to find your Supabase keys:**
> 1. Go to https://supabase.com
> 2. Open your project
> 3. Click **Settings** → **API**
> 4. Copy **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`
> 5. Copy **anon public** key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> 6. Copy **service_role** key → paste as `SUPABASE_SERVICE_ROLE_KEY`

### Step 4 — Run the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the Hamza Agency splash screen and homepage.

---

## Project Structure

```
hamza-agency/
│
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (metadata, fonts, PWA)
│   ├── page.tsx                # Homepage (assembles all sections)
│   └── globals.css             # Global styles + design tokens
│
├── components/                 # Reusable UI components
│   ├── SplashScreen.tsx        # Animated luxury splash screen
│   ├── Navbar.tsx              # Floating glass navbar
│   ├── HeroSection.tsx         # Full-screen hero section
│   └── Footer.tsx              # Premium footer
│
├── lib/
│   └── supabase.ts             # Supabase client (browser + admin)
│
├── config/
│   └── whatsapp.ts             # WhatsApp global configuration
│
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/
│       ├── icon.svg            # Source SVG icon
│       └── README.md           # Icon generation instructions
│
├── .env.example                # Environment variables template
├── .env.local                  # Your local env (DO NOT COMMIT)
├── .gitignore                  # Git ignore rules
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind design system
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel deployment configuration
├── README.md                   # This file
└── DEPLOYMENT.md               # Vercel deployment guide
```

---

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production (also runs type checking)
npm run build

# Start production server (after build)
npm start

# Run ESLint
npm run lint
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ✅ Yes | WhatsApp number (international, no +) |
| `NEXT_PUBLIC_APP_URL` | Optional | Your production domain |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Optional | Default locale: `en`, `ar`, or `tr` |

---

## Roadmap

| Phase | Status | Contents |
|-------|--------|----------|
| **Phase 1** | ✅ Current | Foundation, design system, navbar, hero, footer |
| **Phase 2** | 🔲 Next | Services, portfolio, about, CMS, i18n, dark/light toggle |
| **Phase 3** | 🔲 Planned | Admin panel, financial system |
| **Phase 4** | 🔲 Planned | Creator portal, influencer platform |
| **Phase 5** | 🔲 Planned | AI features |

---

## License

Private — Hamza Agency. All rights reserved.
