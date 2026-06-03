# Hamza Agency — Deployment Guide

> Complete step-by-step guide to deploy Hamza Agency on Vercel.

---

## Overview

The deployment flow is:

```
Local machine → GitHub repository → Vercel (auto-deploy)
```

Every time you push to the `main` branch, Vercel automatically rebuilds and redeploys.

---

## Step 1 — Create a GitHub Repository

1. Go to https://github.com/new
2. Set:
   - **Repository name:** `hamza-agency`
   - **Visibility:** Private (recommended)
   - **Do NOT** initialize with README (you already have one)
3. Click **Create repository**
4. Copy the repository URL (e.g. `https://github.com/YOUR_USERNAME/hamza-agency.git`)

---

## Step 2 — Push Your Code to GitHub

Run these commands in your project folder:

```bash
# Initialize git (skip if already done)
git init

# Add all files
git add .

# First commit
git commit -m "feat: Phase 1 foundation — Hamza Agency"

# Connect to your GitHub repo (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR_USERNAME/hamza-agency.git

# Push to main branch
git branch -M main
git push -u origin main
```

Verify: Refresh your GitHub repo page — you should see all files there.

> ⚠️ Make sure `.env.local` is **NOT** uploaded. It should be listed in `.gitignore`.

---

## Step 3 — Create a Vercel Account & Import Project

1. Go to https://vercel.com
2. Click **Sign Up** → choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub

**Import your project:**

1. From the Vercel dashboard, click **Add New → Project**
2. Find `hamza-agency` in the list and click **Import**
3. Vercel will auto-detect it as a Next.js project
4. Leave the framework preset as **Next.js**

---

## Step 4 — Add Environment Variables in Vercel

Before clicking Deploy, you MUST add your environment variables:

1. In the Vercel import screen, scroll to **Environment Variables**
2. Add each variable one by one:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | e.g. `971501234567` |
| `NEXT_PUBLIC_APP_URL` | Your domain, e.g. `https://hamzaagency.com` |
| `NEXT_PUBLIC_APP_NAME` | `Hamza Agency` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en` |

3. For each variable, set **Environment** to: ✅ Production ✅ Preview ✅ Development

> **Where to find Supabase keys:**
> Supabase Dashboard → Your Project → Settings → API

---

## Step 5 — Deploy

1. Click **Deploy**
2. Vercel will:
   - Clone your repo
   - Run `npm install`
   - Run `npm run build`
   - Deploy to a `.vercel.app` subdomain
3. Watch the build logs in real-time
4. After ~2 minutes, your site is live!

You'll get a URL like: `https://hamza-agency-xyz.vercel.app`

---

## Step 6 — Add a Custom Domain (Optional)

1. In Vercel → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain: e.g. `hamzaagency.com`
4. Follow the DNS instructions Vercel shows you:

**For Namecheap / GoDaddy / any registrar:**
- Add an **A record**: `@` → `76.76.21.21`
- Add a **CNAME**: `www` → `cname.vercel-dns.com`

5. Wait 10–60 minutes for DNS to propagate
6. Vercel will auto-provision an SSL certificate (HTTPS)

---

## Automatic Deployments

After initial setup, every push triggers a new deployment:

```bash
# Make changes to your code, then:
git add .
git commit -m "feat: add services section"
git push
```

Vercel will automatically:
1. Detect the push
2. Build the new version
3. Deploy to production (if pushing to `main`)
4. Create a Preview deployment (if pushing to any other branch)

---

## Environment Variables After Deployment

To update or add environment variables after deploying:

1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add/edit variables
3. **Redeploy** the project for changes to take effect:
   - Go to **Deployments**
   - Click the three dots `···` on the latest deployment
   - Click **Redeploy**

---

## Build Commands Reference

| Command | What it does |
|---------|-------------|
| `npm run build` | Builds for production (runs locally to test) |
| `npm run dev` | Starts local development server |
| `npm run lint` | Checks for TypeScript/ESLint errors |

**Test your build locally before pushing:**
```bash
npm run build
# Should complete with no errors
```

---

## Troubleshooting

### Build fails: "Cannot find module"
```bash
# Make sure all deps are installed
npm install
npm run build
```

### Build fails: "Missing environment variable"
- Check that all required env vars are added in Vercel
- Make sure variable names match exactly (case-sensitive)

### Supabase connection error
- Verify `NEXT_PUBLIC_SUPABASE_URL` format: `https://xxxx.supabase.co` (no trailing slash)
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the **anon** key, not service role

### Site deploys but shows blank page
- Check browser console for errors
- Check Vercel Function Logs: Dashboard → Your Project → **Functions**

### Custom domain not working
- Wait up to 48 hours for DNS propagation
- Verify DNS records are correct in your domain registrar
- Check Vercel Domains page for status

---

## Production Checklist

Before announcing your site:

- [ ] All environment variables added in Vercel
- [ ] Custom domain connected and SSL active
- [ ] WhatsApp number is correct and working
- [ ] Site loads on mobile (iOS and Android)
- [ ] PWA icons generated and added to `/public/icons/`
- [ ] Open Graph image created (`/public/og-image.jpg` — 1200×630px)
- [ ] Google Search Console verified
- [ ] Analytics connected (Phase 2)

---

*Hamza Agency — Built to dominate.*
