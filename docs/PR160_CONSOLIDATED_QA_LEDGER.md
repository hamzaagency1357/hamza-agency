# PR #160 — Pre-merge release record · 12 November 2026

The [PR status and checks](https://github.com/hamzaagency1357/hamza-agency/pull/160/checks) identify the exact current HEAD and its final results. This ledger records the inputs, isolated verification, and release sequence for the remediation commit.

## Phase 1 quality and security closeout · 12 November 2026

Phase 1 starts from `14e9d26c3eb9ccdc4d60d9f73fdb07e26b79553f`. That revision had five successful PR workflows, the Full Closeout aggregate at 21/21 and an exact Ready Preview. The PR remains the release branch. The current PR check links apply to the later changes below.

| Observation | Phase 1 change and evidence |
| --- | --- |
| Private records could be read through the Data API outside the Admin UI scope | The Production catalog showed broad authenticated policies on activity, service requests and drafts, and an implicit grant for deputies with no permission row. The new migration binds permissions to linked Auth UUIDs and requires an explicit grant for deputies and program admins. It scopes private pages, sections, media, versions, backup records, team directory, job applications, service requests and activity logs. Existing public policies and assigned-program access remain in the test contract. |
| Legacy browser write policies exposed activity logs, backups and version history | The migration removes those browser write grants and policies. Isolated ACL checks verify that browser roles cannot forge audit rows, alter backup records or insert version snapshots, and that trusted logging, backup creation and restore remain available. |
| The login challenge could be bypassed at server boundaries after enrollment, and the backup TOTP factor was unavailable in the form | The Data API pre-request checks signed AAL for enrolled admins and invokes the existing trusted actor bridge. The Edge gateway and the three team routes use the exact Supabase-verified bearer and verified factor list. The login selector offers each verified TOTP factor. Accounts without a verified factor continue with their current password flow. |
| System Health queried two private tables through the browser and filtered recent failures using only the legacy status | System Health uses a scoped owner-only RPC returning last restore and backup summary fields. The underlying payloads stay private. The dashboard counts both stored failure spellings and distinguishes unavailable reads from an empty result. The operation log writer and backup schedule RPC check their module permissions. |
| Unknown program slug returned HTTP 200 | The program layout validates the five built-in slugs or an exact publicly readable program, then returns localized Not Found for missing programs. The AR/EN/TR HTTP status cases extend the existing 404 suite. |
| Program application form lacked modal keyboard semantics and persistent accessible field names | It uses a native modal dialog, accepts Escape, returns focus to the application button, provides explicit field names and announces submission feedback. The existing form fields and endpoint are retained. |
| Blog sitemap and alternates could include translations marked `noindex` or missing article copy | Sitemap, article metadata and hreflang use the same indexable-locale rule. The blog reads SEO fields in one explicit request on the current schema and retries the legacy shape only for missing-column errors. The AR/TR blog headings, RSS and public Open Graph site name use the approved localized agency name. |
| Rewritten locale routes could render the language selector from a different path during hydration | The selector follows the same URL-derived locale provider as the rest of the site. Turkish fallback copy uses Hamza Ajansı in the homepage, jobs, reviews, stories and marketplace. The standalone maintenance screen keeps its locale and is excluded from indexing. |
| The contact heading could be empty in English or Turkish when a published translation was unavailable | Contact supplies localized fallback copy for the heading, introduction and support links. Complete published translations retain priority. |

The isolated PostgreSQL 17 test applies both release migrations, rejects unauthorized Data API scope and AAL1 for an enrolled owner, accepts the owner at AAL2, and preserves the linked deputy's explicitly granted Pages view. The translation and Blog lifecycle test then exercises the original allowlisted actor bridge through the new pre-request hook. The team route regression checks invite, activation and deactivation with enrolled AAL1 and AAL2 sessions.

### Production reads and Phase 2 requirements

- Production project `fvaurkfnsvsfohpzguho` is healthy on the Free plan. The three existing editorial snapshots matched their stored SHA-256 values. There is one linked, confirmed active owner, zero verified MFA factors for that account and no active recovery administrator. The independent TOTP factor and recovery login require the owner's real device and identity. An additional administrative account requires separate authorization.
- The five approved program logos are configured, and the renderer uses the program name when a localized image alt is empty. Empty cover, mobile or program OG overrides use the existing fallbacks. The earlier Preview returned an actual PNG for TikTok's default sharing route. All ten published CMS rows currently have an OG value in at least one of the two stored fields. Check the rendered share image on the staged Production build.
- The TikTok article is still published and indexable in AR, EN and TR. The BIGO LIVE and Yaahlan Turkish revisions remain published with seven fields each. The exact-match Yaahlan proposal and previous-version preservation below remain the separately authorized content action.
- The Free plan release backup uses a private logical export of application schema, rows and required roles. The default Supabase CLI dump excludes managed Auth and Storage schemas. Inventory the managed configuration and authorized recovery sources separately. The current public bucket has ten active objects. Copy the required Storage binaries and retain their names, sizes and checksums separately from the database dump. Keep the five deployed Edge source files and JWT verification setting, the current Vercel deployment ID and the custom-domain assignment record.
- Use the isolated backup/restore suite to verify the application restore contract. A scoped editorial checksum and synthetic restore establish different evidence. Any full restore rehearsal requires a fresh isolated target and a privately exported bundle with confirmed scope. Use the code rollback sequence below for release regressions and preserve data written after release.
- Apply the scoped authorization and enrolled MFA changes before exposing the new site. Reassess the remaining SECURITY DEFINER warnings and leaked-password protection against available configuration and approved cost. The rewritten private read policies use initplan-friendly role predicates. Unused indexes and other overlapping policies require workload and permission evidence before removal. Verify actual indexing through Search Console and test Production operations after the release authorization.

## Verified starting point

- PR #160 was open, draft, mergeable, with zero reviews. HEAD was `264bc643529e77d567ea6e2a6b89266f4c1f0ea0`. Base `main` was `a120fc48c418b4b259916c45f9389df8c3c26b66`, 31 commits behind the feature branch and zero ahead.
- Exact starting HEAD passed [Quality Gate](https://github.com/hamzaagency1357/hamza-agency/actions/runs/42940281113), [Management Quality Gate](https://github.com/hamzaagency1357/hamza-agency/actions/runs/42940281123), [Admin Visual Evidence](https://github.com/hamzaagency1357/hamza-agency/actions/runs/42940281245), and [Full Closeout, 21/21 jobs](https://github.com/hamzaagency1357/hamza-agency/actions/runs/42940281301). Its [Preview](https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/AsS4wnPpgFmQfafLzHBDJ5SCWp4k) was READY. The new HEAD has its own check results.
- Full Closeout on intermediate HEAD `6231c6a` exposed a local fixture dependency. Its frozen snapshot lacked the blog RPCs targeted by the new migration. The macro workflow now loads their original migrations and the supporting actor-bridge prerequisites before the release-boundary test. [Intermediate run and failure](https://github.com/hamzaagency1357/hamza-agency/actions/runs/43124224484/job/130872935068)
- On intermediate HEAD `ea583b7`, the isolated Supabase translation and blog authorization test passed. The following fixture step failed on duplicate installation of a support policy. The workflow now lets the existing fixture install the support schema once and applies the actor-bridge prerequisites afterwards. [Isolated test and fixture log](https://github.com/hamzaagency1357/hamza-agency/actions/runs/43154376658/job/130971267490)
- Production alias `hamza-agency.com` pointed to Git deployment `dpl_4UsYNwDcWEwDFbG3H5QYk9y5ZQqg`, from the above `main` SHA. The [deployment record](https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/4UsYNwDcWEwDFbG3H5QYk9y5ZQqg) and recent `main` deploys show the Git integration. Merge to `main` initiates a Production build. Domain assignment must be held for staged verification. [Vercel staging and promotion](https://vercel.com/docs/deployments/promoting-a-deployment)

## Administrative gateway and database authorization

| Check | Evidence |
| --- | --- |
| Deployed Edge Function | `pr116-admin-oidc-gateway`, ACTIVE v2, `verify_jwt=false`, bundle SHA-256 `4d207e01708ce2f84754f78d6d67b94ef27400e3c77ddc645b68e6f396330ddc`. All five downloaded source files matched the immutable `a120fc48c418b4b259916c45f9389df8c3c26b66` tree byte-for-byte. |
| Source comparison | `index.ts` forwards the already verified user token and anon key internally. `generated-dispatch.ts` passes them to the dispatcher. `trusted-rpc-dispatch.ts` adds one exact action for `create_translation_candidate_draft`, a three-language completeness guard for save-as-published, and an explicit header type verified under strict TypeScript. `generated-dispatch-base.ts` and `admin-role-policy.ts` matched v2. |
| Compatibility | The deployed v2 rejects the new create action with `invalid_action`. All 125 existing generated actions and their permission contracts are retained. The new action requires `settings.can_edit` or `can_manage` for a deputy and uses the real Supabase user JWT. Save, review and publish retain the service-role transport with verified actor context. The database grants creation to authenticated, and grants those other three RPCs to service_role. |
| OIDC and request limits | Real JOSE RS256 signature checks were exercised with isolated keys. Issuer, audience, team, project, subject, time and Production environment are checked. The gateway resolves the Supabase session and active admin by linked UUID plus matching email, enforces the action and payload allowlists, 50,000-byte usual payload limit, timestamp window and digest. The nonce is format-checked. A durable replay store for this Admin gateway was outside this remediation. |
| Actor bridge | Production `authenticator` has `pgrst.db_pre_request=public.pr116_apply_trusted_admin_actor_context`. Actor headers from anon or an ordinary JWT are rejected. A service-role request needs an allowlisted RPC and a linked active admin UUID. Identity rewriting is transaction-local. Creation uses the authenticated request without actor headers. |
| Regression coverage | The isolated gateway comparator exercised v2 and the candidate with the pinned JOSE version, a simulated Auth and HTTP transport, and a local RSA key. An isolated PostgreSQL test exercises the actual RPC bodies, the pre-request hook, ACLs, RLS, and the create → save → review → publish lifecycle. It verifies the actor UUID and preservation of the superseded published revision. The Full Closeout fixture loads the original blog migrations and the trusted actor's support prerequisites before running the SQL proof. |
| Security remediation | `20261111234553_pr160_scope_admin_translation_and_legacy_rpcs.sql` requires the linked UUID for translation admin access and explicit Settings edit permission for deputy mutations. It removes direct browser EXECUTE for four legacy/internal RPCs, scopes the three private blog SELECT policies to authorized Pages access, and preserves authorized page restoration and public article visibility. The local HTTPS gateway now forwards the user token to the same dispatcher as the Edge Function. |

**Security assessment.** Production Security Advisor listed 10 anon-executable SECURITY DEFINER warnings, 61 authenticated-executable warnings and one leaked-password warning. The actor bridge is an intentional pre-request exception with no evidence of a browser bypass. An isolated reproduction using the Production function bodies showed a `program_admin` reading an unrelated private blog draft through `pr3_blog_snapshot`. Production catalog reads also confirmed that the three blog admin SELECT policies used a predicate granting the same read to every active admin. The migration closes both entry points. The same broad gate existed on legacy archive, restore and snapshot functions. Production showed one active linked, confirmed `super_admin` and zero active deputies or program admins. Treat the scope bypass as **high** and apply the reviewed migration before exposing the new site. The translation authorization previously relied on JWT email alone and lacked the deputy mutation check. Both checks are covered by the staged migration. No critical unauthenticated admin bypass was established in the scoped review. Password protection and review of the remaining exposed RPCs are **medium**. Performance Advisor listed 42 RLS initplan and 44 overlapping permissive-policy warnings, plus 15 missing FK-index and 147 unused-index informational findings. Tune those separately against workloads. [Database linter](https://supabase.com/docs/guides/database/database-linter) · [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Published content and backup evidence

- TikTok article `blog_posts.id=1` is published with one translation per locale and six history versions. The live AR/EN/TR article pages displayed the official identity, verified conditional-acceptance wording, locale self-canonical, reciprocal `hreflang` including `x-default`, matching `og:url`, localized OG titles and sitemap URLs. The live site supplied a rendered six-field TikTok form per language and the registered WhatsApp link `+905011730377`. The official TikTok short link opened the `hamza_agency` Creator Network invitation. Form verification used read-only page inspection.
- The previous stored-canonical repair is documented by audit `848` and commit [8d4e88a](https://github.com/hamzaagency1357/hamza-agency/commit/8d4e88abbb4ea1c3671e269fcc6c48611972db6d). This batch localizes the displayed article agency byline and `og:site_name` using the approved identity, while canonical and structured-data URLs still share the safe resolver.
- BIGO LIVE Turkish revision `7d8886b7-9969-40cf-b93e-e7dec96872e6` and Yaahlan Turkish revision `2929ef98-c63d-41be-bdf1-d9efbce8636a` are published, with seven fields each and preserved superseded predecessors. The public BIGO card and Yaahlan FAQ reflect the earlier fixes. The database enforces one published revision per source and locale.
- The Yaahlan card's English agency alias came from its stored `summary`, confirmed both in `/tr/programs` and the published revision. The candidate site already normalizes the Turkish display at render time. The new exact-match suggestion changes only `programs/3/tr/summary` to `Hamza Ajansı aracılığıyla Yaahlan programına katılın.` inside a new correction draft.
- Optional content release after separate approval. Recheck current revision `2929ef98-c63d-41be-bdf1-d9efbce8636a`, field `088112cb-870b-48da-83fc-4240eeb58b13`, original field SHA-256 `32965c96c0b74d871683e806d827d672a8a0645b9ee941fa938a4a6cbc0b2b66`, source `ddc2a896-5730-49ef-9fc9-55dd29e0ea93` and its fingerprint, and zero active candidates. Back up the current revision, its seven fields and the source snapshot. Use the real authorized Admin session to create, compare, review and publish the one-field correction. Confirm the prior revision is superseded and the six other fields, including the already-correct FAQ, are identical.

| Private backup ID | Scope | Recomputed SHA-256 | Audit |
| --- | --- | --- | --- |
| `2e00da17-10ab-4393-8985-d859511772b4` | Two original Turkish revision headers, both source snapshots, 14 fields, and an empty pre-publication blog set | `c56894e7f27f22072f8a3da138261c5b7e8f4ac8f32c762a8930f220d92a8834` | `845–847` |
| `c3345b72-9297-446e-8816-634238d52eb4` | One blog post, three locales and two pre-canonical history records | `e9e46e66479bb7aad32dd4263c8cdbcff56311454f41851eace4d26d09507a7b` | `848` |
| `976490c7-9d1a-41c5-ae28-1eaf6be34bb0` | One blog post, three locales and four pre-rewrite history records | `e9dd4b1821096e4758bb45f4963e94b3dcaf60dc9f1a022752fa19f5275acbfd` | `849` |

All three computed values matched the stored checksums and the audit rows reference the correct backups. These are scoped editorial snapshots. Full database, Auth, storage objects and Edge artifacts require their own backup sources. Integrity checks were read-only. Production restore remains untested. [Supabase project](https://supabase.com/dashboard/project/fvaurkfnsvsfohpzguho)

## Release sequence after owner authorization

1. Record the exact green PR HEAD, current `main`, live Vercel alias/deployment, and Edge source/version/configuration. Refresh the Production migration history, ACLs and linked admin count. Privately capture the seven affected database function definitions and ACLs, three blog policies, current article/version records and program revision snapshots with checksums. Preserve the Git source of v2 and Vercel rollback deployment. Confirm a current recoverable database backup or scoped logical export.
2. Hold automatic Production-domain assignment in Vercel for the release window. Confirm the live alias is still on the saved deployment. Git integration will build the merge automatically. Retain manual promotion so smoke checks can run on the actual Production build before traffic changes.
3. Apply the two reviewed migrations in this order after an exact-target dry-run with current remote migration history and official migration tracking. Apply `20261111234553` (SHA-256 `dbc522bcae3129b60117e6c5abf3ad0c31188d09c8884bd038c9031646497dd8`), then `20261112121152` (SHA-256 `65b2d01a8761d81994a1f86c1246f88b05a382ea32b2d39a018e59fb62e00594`). Before continuing, confirm the legacy ACL removals, private read policies, retained translation grants, owner-only backup summary and `pgrst.db_pre_request=public.pr160_admin_data_api_pre_request` chaining to the existing actor bridge. The protected workflow pins an older migration. Keep the already recorded one-shot editorial SQL releases out of this execution.
4. Deploy only the five files of `pr116-admin-oidc-gateway` from the approved SHA to `fvaurkfnsvsfohpzguho`, preserving `verify_jwt=false` and the existing OIDC trust claims. Read back the active version and all file hashes. Verify the old site continues to reach the compatible gateway and check denied unauthenticated traffic. Keep production credentials out of logs and artifacts.
5. Merge only the approved PR and verify the merge tree against the green PR tree. Wait for the Git-triggered Production build. Verify its Git SHA, status and currently held domain on Vercel. On the staged Production deployment verify public AR/EN/TR, sitemap, images and metadata, application form rendering, normal Admin access, role scope and gateway behavior. Use the isolated lifecycle test for mutation coverage and obtain explicit approval for any real Production test writes. Promote the verified deployment and repeat health, locale, auth, form and audit smoke checks. Watch for `invalid_action`, authorization errors and gateway 5xx.
6. On a site regression, point Vercel back to `dpl_4UsYNwDcWEwDFbG3H5QYk9y5ZQqg` if it remains the captured previous deployment and recheck the aliases. If the gateway itself fails, restore the five byte-matched v2 files from `a120fc48c418b4b259916c45f9389df8c3c26b66` with the same JWT setting. Restore the site before returning the gateway to v2. V2 predates the enrolled MFA check and the translation create action, so defer sensitive administration during this fallback and move forward to a compatible gateway. Keep both database authorization fixes in place on normal code rollback. Investigate database regressions using saved definitions and narrowly reviewed forward repairs. Preserve new requests and editorial rows. A later editorial correction is undone through a new reviewed version with a fresh snapshot and preserved history. [Vercel rollback](https://vercel.com/docs/instant-rollback) · [Supabase Edge deployment](https://supabase.com/docs/guides/functions/deploy)

## Historical evidence · Superseded where the current record differs

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
