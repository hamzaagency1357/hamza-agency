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
