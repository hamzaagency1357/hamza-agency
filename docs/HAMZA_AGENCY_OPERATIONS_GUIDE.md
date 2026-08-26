# HAMZA AGENCY — Operations Guide

> **Status:** Active internal operations reference.
>
> Current project status: [`CURRENT_PROJECT_STATE.md`](CURRENT_PROJECT_STATE.md).

## Purpose

This guide covers safe day-to-day operation of HAMZA AGENCY without turning historical implementation notes into current requirements.

## Core platform

- Next.js / React application on Vercel.
- Supabase for database, authentication, and storage.
- Arabic, English, and Turkish public experiences.
- Internal Admin under `/admin`.

## Safe operating rules

1. Verify current state before making a change; do not rely on historical checkpoints as current authority.
2. Keep each change bounded to its approved scope and review the complete diff before merge.
3. Never commit passwords, tokens, service-role credentials, cookies, MFA/recovery material, private backups, or secret environment files.
4. Treat Production database/Auth/user/permission writes as separately approved operations; repository changes alone do not authorize them.
5. Use exact GitHub/Vercel deployment evidence for release identity rather than exposing build metadata to public visitors.
6. If a deployment regression is proven, fix or revert the bounded change; do not hide the failure with temporary public debug output.

## Public operations

Representative public routes include the homepage, programs, joining/application status, service requests/status, jobs, FAQ, knowledge content, contact, and legal pages. Public responses must remain production-safe: no stack traces, raw database errors, repository identifiers, migration names, deployment IDs, or internal exception details.

## Admin operations

- Access starts at `/admin/login` and authenticated Admin pages.
- Daily Admin UX should remain business-facing; raw infrastructure identifiers belong only in explicit technical diagnostics when legitimately required.
- Use role/permission boundaries already implemented by the application; this guide does not authorize permission changes.
- Do not copy private applicant/support/customer information outside its operational purpose.

## Content and localization

- Preserve the Owner-locked agency/agent identity and `+500` statistic.
- Keep Arabic/English/Turkish content isolated by locale; do not introduce mixed-language fallback text unless that fallback is an approved product behavior.
- Program brands remain TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii.
- Reviewer name remains required.

## Database changes

Follow [`SUPABASE_DATABASE_CHANGE_WORKFLOW.md`](SUPABASE_DATABASE_CHANGE_WORKFLOW.md). The Stage-2 ACL lockdown is already applied and verified; documentation work must not replay or repair migration history.

## Deployment and recovery

- A successful Vercel Preview is evidence for the exact commit that produced it, not for later commits.
- Merge only after explicit approval.
- After an approved merge, verify Production deployment health and affected flows.
- Recovery/rollback procedures must use current repository/deployment evidence and must not expose credentials or private backup material.

## Deferred Auth operation

Owner TOTP enrollment is a future operational action before any future MFA enforcement. Do not enforce MFA or store recovery material as part of routine documentation/technical cleanup.
