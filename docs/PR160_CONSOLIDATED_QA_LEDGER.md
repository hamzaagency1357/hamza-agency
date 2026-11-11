
## VERIFIED OWNER-AUTHORIZED SINGLE-USE EDITORIAL RELEASE — 2026-11-11

**Execution:** completed once on Supabase project `fvaurkfnsvsfohpzguho` at `2026-11-11T00:24:16Z`. A subsequent invocation correctly failed closed with `One-shot editorial release has already been recorded`; it did **not** repeat writes. The reviewed script is now **disabled by default** (`v_apply=false`) and remains only as a preflight/audit record. **No credentials, Auth users, permission grants, Edge Function deploys, PR merges, or site deployments were created by this operation.**

- Private scoped preflight backup: `operations_preflight_backups.id = 2e00da17-10ab-4393-8985-d859511772b4`. Checksum `c56894e7f27f22072f8a3da138261c5b7e8f4ac8f32c762a8930f220d92a8834` reverified; 2 prior published Turkish revisions and all 14 old field records retained. This is a scoped preflight backup, not a full-system restoration test.
- TikTok article: `blog_posts.id=1`, slug `tiktok-live-hamza-agency`, `published`, AR/EN/TR translations all present, indexed flag allowed, correct official WhatsApp `+905011730377` and `https://www.tiktok.com/t/ZS2AxwqsK/`.
- BIGO TR correction: new published revision `7d8886b7-9969-40cf-b93e-e7dec96872e6`; prior published revision `3d963d9e-f68a-4130-af4b-ddf803298b19` preserved as `superseded`, all seven fields complete.
- Yaahlan TR correction: new published revision `2929ef98-c63d-41be-bdf1-d9efbce8636a`; prior published revision `a193e789-c0ab-44a7-8b60-2b956b0da1db` preserved as `superseded`, all seven fields complete.
- Audit: `activity_logs.id = 845, 846, 847` (service actor, original and replacement revision IDs and backup ID; no impersonated administrator). Unique release key `pr160-owner-authorized-tiktok-bigo-yaahlan-20261111-v1`.
- Public HTTP: `/blog/tiktok-live-hamza-agency`, `/en/blog/tiktok-live-hamza-agency`, `/tr/blog/tiktok-live-hamza-agency` returned HTTP 200 with article content, application and contact links, and no `noindex`. `/sitemap.xml` contains the article slug. Program detail routes `/tr/programs/bigo-live` and `/tr/programs/yaahlan` returned HTTP 200; their translation text is loaded client-side, so raw HTML alone does **not** prove the final rendered text. Published database revision values have been verified.
- New code regression test and exact-HEAD CI are required before marking the PR merge-ready; **do not infer CI success from the previous SHA.** The PR remains OPEN/Draft/unmerged; no site/Edge Function deployment by this operation.

---
# PR #160 — Consolidated observations and evidence

**Status:** OPEN / Draft, no merge, no manual deploy and no Production writes. Baseline before final repair: `9f920f38c9faec6301c78e59abe5a367f4b08acb`. The correct latest HEAD must always be checked on GitHub.

| Observation | Classification | Evidence / next action |
| --- | --- | --- |
| Male owner addressed in feminine | Fixed earlier #160 | Dashboard copy and regression tests |
| Team invitation roles/statuses untranslated | Fixed earlier #160 | Arabic labels, raw database identifiers intact |
| Mobile team 320/390px and horizontal overflow | Fixed earlier #160 | [Visual evidence PASS](https://github.com/hamzaagency1357/hamza-agency/actions/runs/41417490210) |
| Team lifecycle and isolated Auth | Previously fixed #158 | [PASS](https://github.com/hamzaagency1357/hamza-agency/actions/runs/40451235295) |
| Exact program_admin permissions | Previously fixed #158; live-actor test not performed | Tests isolated, no new authorization changes |
| Restore/delete/concurrency safety | Previously fixed #158 | [PostgreSQL isolated PASS](https://github.com/hamzaagency1357/hamza-agency/actions/runs/40451235300) |
| Operations states/priority/Workflows/Marketplace/SLA | Fixed earlier #160 | UI labels translated, API enums unchanged |
| Operations status selectors incorrectly bound to translated enum | Fixed this batch | Five selectors now use raw row.status; new unit regression |
| Program management advanced label confusion | Fixed earlier #160 | Clear explanatory copy, no published data writes |
| CMS page SEO counts | Verified live state read-only, earlier #160 labels fixed | 10 published core pages; all have SEO title+description; 10 lack OG image field; no required CMS slug missing |
| Missing ten CMS OG images | Production-gated | No guesses; select and review approved per-page images before separate authorized write |
| Knowledge base duplicate suggestions/categories/sources/dates | Fixed earlier #160 | UI-only dedupe/category display, no stored record mutation |
| Knowledge safe review/publish | Previously fixed | Existing review gates retained |
| Program logos and media selector | Verified live / fixed earlier #160 | Five logo URLs populated; cover/mobile/OG URLs absent, existing media upload linked, no media overwritten |
| Media library raw English technical strings | Fixed this batch | Human Arabic labels; size/MIME/magic-byte validations remain |
| Images actually load on public devices | Needs verification | URL existence in DB does not prove HTTP/image availability |
| TikTok Arabic FAQ falsely guarantees acceptance | Production-gated, render sanitizer fixed this batch | Live `public.programs.id=1` FAQ has affirmative promise; no database write |
| TikTok English published FAQ falsely guarantees acceptance | Production-gated, render sanitizer covered | Published EN revision `faq` contains affirmative promise; needs reviewed replacement revision |
| TikTok Turkish published FAQ falsely guarantees acceptance | Production-gated, render sanitizer fixed this batch | Published revision `b80b6a8b-471b-4d87-ad8d-2f959635cf2f`, field `faq`: `kabul garantilidir` |
| Published Turkish brand `HAMZA AJANSI` / Yaahlan odd grammar | Fixed render-time narrow phrases this batch; stored content still gated | Maintain official `HAMZA AGENCY` identity. Do not directly overwrite published revision |
| Blank/unmapped translated program detail sections | Fixed this batch | Per-field approved locale fallback, new regression |
| Public SEO canonical/hreflang/sitemap/robots | Previously fixed/tested | `tests/seo-contracts.test.mjs`; actual search engine indexing not asserted |
| Announcements, notifications, activity logs, backup/restore | Previously tested; live behavior needs verification | [Prior Full Closeout 21 jobs PASS](https://github.com/hamzaagency1357/hamza-agency/actions/runs/41417490211) |
| Historical `AUTO-20260823-021700.json` backup-validation failure | Needs verification | Never restore/mutate Production backup to test |
| Dependabot preview failure | Separate branch, no auto merge | TypeScript 7 vs eslint peer requirements, isolated from #160 |
| minimatch vulnerability | Fixed earlier #160 | Patched 11.0.1 and dependency chain, [audit PASS](https://github.com/hamzaagency1357/hamza-agency/actions/runs/41417490239) |
| Owner MFA/TOTP, alternative recovery admin, real Chrome Custom Tab | Owner-gated | No secrets or real user edits |
| Published locales/presets, ads, mobile dock, PWA and public identity | Previously addressed; real-device spot-check may be needed | Existing locale, E2E and owner-locked identity tests |
| AI code exposure | Previously addressed | Existing technical-exposure suite; legitimate AI Policy and Smart Support preserved |

## Read-only production evidence — 2 November 2026

Supabase project `fvaurkfnsvsfohpzguho`: **SELECT only**, no writes.
- `pages`: 10/10 published, with SEO titles and descriptions; 0/10 have `og_image`; all ten expected CMS slugs exist.
- `programs`: TikTok, BIGO LIVE, Yaahlan, Xena, Catchii have logo URLs; no hero/mobile/OG images set.
- `media`: 7 records have file URL values.
- `programs.id=1` Arabic `faq` promises guaranteed acceptance; published EN and TR revision fields also promise it.
- Published TR TikTok revision `b80b6a8b-471b-4d87-ad8d-2f959635cf2f` is not stale and includes `HAMZA AJANSI` and `kabul garantilidir`.
- This PR only normalizes public presentation. **Stored translations and program content remain unchanged.**

## Separately authorized Production-content correction plan (NOT performed)

1. Record exact Arabic FAQ before editing and create a safe source revision/backup.
2. Replace false affirmative acceptance wording with truthful AR/EN/TR reviewed FAQ texts:
   - AR: هل القبول مضمون؟ لا، القبول غير مضمون؛ يخضع كل طلب للمراجعة وفق شروط البرنامج والمنصة.
   - EN: Is acceptance guaranteed? No. Acceptance is not guaranteed; every application is reviewed.
   - TR: Kabul garanti mi? Hayır. Kabul garantisi yoktur; her başvuru program koşullarına göre değerlendirilir.
3. Prepare new EN/TR revision and keep in `needs_review` until an authorized human reviews the full field set and publishes manually; normalize brand aliases only where appropriate.
4. Review each of ten OG image candidates visually before explicitly approved Admin updates. Do not assume images, URLs or indexing success.
5. Verify resulting public content in all locales read-only after separately approved edits.

## Release gate

After the final repair commit, the four exact-head workflows (Quality Gate, Management Quality Gate, Admin Visual Evidence, Full Project Closeout) and targeted new tests must PASS. Prior HEAD statuses do not prove a newer commit. Remain DRAFT/UNMERGED. Stored Production content is **not** marked fixed; owner approval needed for later writes.

---

## OWNER OVERRIDE — 2026-11-09: conditional acceptance + locale-specific agency name

**This decision supersedes all earlier proposals in this file and the PR body that treated conditional acceptance as a false promise or required the English name on Turkish pages. DO NOT execute the previously drafted 17-field Production update.**

Accepted business wording (all conditions must be fulfilled and verified):
- **AR:** القبول مضمون عند استيفاء جميع شروط ومتطلبات البرنامج والتحقق منها.
- **EN:** Acceptance is guaranteed when all program requirements are met and verified.
- **TR:** Programın tüm şartları karşılandığında ve doğrulandığında kabul garantilidir.

Approved public-facing localized agency names: **AR وكالة حمزة | EN HAMZA AGENCY | TR Hamza Ajansı**. Preserve the agent name `⚔عܓོراب✴سܓོوريا⚔` and all platform names.

**Code correction:** the prior blanket sanitizer changed legitimate conditional guarantees into unconditional denials. It now preserves conditional statements and qualifies genuinely unconditional promises with explicit conditions; public FAQ fallback/legacy translations, SEO and brand presentations follow the same owner policy. Existing test cases requiring denial have been replaced.

**Published database content is NOT automatically rewritten.** The stored TikTok FAQ already promises acceptance for applications meeting the program conditions. It must not be overwritten with "القبول غير مضمون". The old proposed English/Turkish denials and the proposal to replace "Hamza Ajansı" with "HAMZA AGENCY" are withdrawn. A later separately authorized content change is only justified for **genuine quality mistakes**, especially BIGO LIVE's truncated Turkish summary `BIGO LIVE programına Hamza Ajansı ara` and Yaahlan's malformed Turkish camera question `Programın kamerayla görünürlük gerektiriyor mu?`. Correct via reviewed candidate revisions, keeping earlier published versions and histories intact. Do not UPDATE published revision fields directly.

**Remaining validation:** after this code change, run a single final exact-head CI pass, inspect AR/EN/TR program details and media/SEO sharing previews, then present owner-review evidence. No PR creation, merge, manual deployment, Production writes, migration/Edge Function/secret edits.
