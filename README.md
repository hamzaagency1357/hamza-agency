# HAMZA AGENCY — Stable v1

HAMZA AGENCY is a premium Next.js + Supabase platform for managing a live-streaming and creator agency. The project includes a public website, admin dashboard, creator/service requests, SEO foundation, AI-support foundation, backups, permissions, and final delivery documentation.

> Status: **Stable v1 — ready for Vercel build verification and production approval**

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | React 19 |
| Styling | Tailwind CSS v3 |
| Database/Auth | Supabase |
| Hosting | Vercel |
| SEO | Metadata, sitemap, robots, OpenGraph, JSON-LD |
| Languages | Arabic / English / Turkish foundation |
| AI Support | Safe public support widget based on knowledge base and fallback answers |

---

## Current Stable Features

### Public Website

- Premium Arabic-first public website.
- Programs pages for TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii.
- Public pages for services, digital services, jobs, reviews, success stories, partners, gallery, FAQ, knowledge center, contact, privacy policy, terms, and AI policy.
- Public quick navigation.
- Language switcher foundation for Arabic, English, and Turkish.
- Public AI support widget without secret keys.
- WhatsApp contact integration.
- SEO-ready metadata, sitemap, robots, OpenGraph, and JSON-LD.
- Final luxury visual polish: black, royal purple, and gold identity.

### Requests

- Creator agency application flow.
- Service request flow.
- Application status tracking.
- Service request status tracking.
- Admin-side request management.

### Admin Dashboard

- Admin home dashboard.
- Settings dashboard.
- Programs, pages, sections, media, announcements.
- Applications and service requests.
- Jobs, reviews, success stories, partners, gallery.
- Notifications, analytics, activity logs, trash.
- Permissions, backups, launch checklist.
- Knowledge base, AI support, AI settings.
- Export/version/audit support pages where available.

### Security & Operations

- Environment variables are documented in `.env.example`.
- Real `.env` files are ignored by Git.
- No AI provider secret is stored in the frontend.
- Service-role and provider secrets must remain server-side only.
- Manual JSON backup from the admin backups page.
- Final delivery document: `docs/HAMZA_AGENCY_FINAL_DELIVERY.md`.

---

## Environment Variables

Create `.env.local` locally or configure these in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=https://hamza-agency.com
NEXT_PUBLIC_WHATSAPP_NUMBER=905011730377
NEXT_PUBLIC_DEFAULT_LANGUAGE=ar
NEXT_PUBLIC_SUPPORTED_LANGUAGES=ar,en,tr
NEXT_PUBLIC_AI_SUPPORT_ENABLED=true
```

Important:

- Never commit `.env` or `.env.local`.
- Never expose Supabase service-role keys in `NEXT_PUBLIC_*` variables.
- Real AI provider keys must be server-side only.

---

## Local Setup

```bash
git clone https://github.com/hamzaagency1357/hamza-agency.git
cd hamza-agency
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Production Build Check

Before approving any production deployment, run:

```bash
npm install
npm run build
```

The build must finish without TypeScript or Next.js errors.

---

## Production Verification Checklist

### Public Pages

- `/`
- `/programs`
- `/service-request`
- `/service-status`
- `/application-status`
- `/contact`
- `/faq`
- `/privacy-policy`
- `/terms-and-conditions`
- `/ai-policy`

### Admin Pages

- `/admin/login`
- `/admin`
- `/admin/settings`
- `/admin/applications`
- `/admin/service-requests`
- `/admin/backups`
- `/admin/permissions`
- `/admin/knowledge-base`
- `/admin/ai-support`
- `/admin/ai-settings`

### Functional Tests

- Submit a creator application.
- Track a creator application by WhatsApp number.
- Submit a service request.
- Track a service request by request code.
- Change service request status from admin.
- Generate a JSON backup.
- Test public AI support with known and unknown questions.
- Test language switcher AR / EN / TR.
- Test WhatsApp links.

---

## Project Documentation

- Final stable delivery: `docs/HAMZA_AGENCY_FINAL_DELIVERY.md`
- Environment template: `.env.example`
- Deployment/checking should always follow the production verification checklist above.

---

## Roadmap After v1 Approval

These are post-v1 improvements, not blockers for the stable v1 release:

- Full dynamic CMS translations for Arabic, English, and Turkish.
- Server-side AI provider integration.
- Automated off-site backups.
- Deeper Supabase RLS audit.
- Automated tests.
- More advanced analytics and error monitoring.

---

## License

Private — HAMZA AGENCY. All rights reserved.
