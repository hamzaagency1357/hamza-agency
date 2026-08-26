# HAMZA AGENCY — Current Project State

This document is the single authoritative repository summary of the current project state. Historical closeout, remediation, checkpoint, and audit documents remain evidence only and must not be treated as current execution instructions.

## Production baseline

- Production: `https://hamza-agency.com`
- Current GitHub main SHA: `60b7bf221c3ab06dab1811728456764b5ac0a1ec`
- Current Vercel Production deployment Git SHA: `60b7bf221c3ab06dab1811728456764b5ac0a1ec`
- Production release identity: **MATCHED**
- `/api/health`: HTTP `200`, `status: "ok"`
- `/api/health` is a liveness/status endpoint only and intentionally does **not** expose `commitSha`.
- Exact release identity is verified through GitHub and trusted Vercel deployment metadata, not through public application responses.
- Production platform: Vercel
- Database/Auth/Storage: Supabase
- Public languages: Arabic, English, Turkish
- Current runtime: Node 24.x, Next.js 15.5.22, React/React DOM 19.2.8

## Closed remediation phases

- PR-A Security Remediation: **CLOSED**
- Stage-2 ACL lockdown: **APPLIED AND VERIFIED**
- Dependency + Auth Hardening: **CLOSED via PR #127**
- Public + PWA + Localization Closeout: **CLOSED via PR #128**
- Admin Professionalism Closeout: **CLOSED via PR #129**
- Documentation + Technical Exposure Closeout: **CLOSED via PR #130**

Closed phases are not reopened unless a new regression is proven.

## Security and database state

Trusted Support E2E is **PROVEN**. The current migration identities are:

- Preparation: `20260825141930_pr120_support_request_trusted_gateway_preparation`
- Stage-2 Production identity: `20260826003518_final_security_acl_lockdown`

Repository/Production migration identity reconciliation was completed through PR #125/#126. Do not rename, replay, repair, or reapply these migrations merely to reconcile documentation.

The current execution path does not require a PAT/JIT database workflow. If a future database change is needed, it requires a separately approved change package and current migration-history verification before any Production write.

## Owner-locked product facts

- Agency identity: `HAMZA AGENCY` / `وكالة حمزة`
- SEO agent identity: `عراب سوريا`
- Decorated in-site agent identity: `⚔عܓོراب✴سܓོوريا⚔`
- Monthly success opportunity: **`+500`**
- Arabic Smart Support label: `الدعم الذكي`
- Programs: TikTok, BIGO LIVE, Yaahlan, Xena, Catchii
- Reviewer name remains required.
- Public/Admin content and business logic from completed closeouts remain unchanged unless a separately proven regression requires correction.

## Operational follow-up

The MFA technical flow is prepared. Owner TOTP enrollment remains deferred before any future MFA enforcement and is not a current release blocker. No recovery secret, MFA seed, token, or credential belongs in the repository.

## Documentation authority

Use this file for current project state. Other ledgers/checkpoints may preserve historical evidence, but any conflicting historical status is superseded by this document and current GitHub/Vercel/Supabase evidence.
