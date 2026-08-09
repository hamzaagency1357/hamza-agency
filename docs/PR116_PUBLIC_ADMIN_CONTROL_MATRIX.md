# PR #116 — Public → Admin Control Audit

This closeout distinguishes owner-editable business content from stable UX/i18n labels and security/system internals. It does not introduce a parallel CMS.

| Public element | Admin control | Storage | Languages | Permission |
|---|---|---|---|---|
| Agency localized names | Settings → هوية الوكالة والوكيل | `settings` identity keys | AR / EN / TR | existing settings/admin permission |
| Agent readable/decorated names | Settings → هوية الوكالة والوكيل | `settings` identity keys | AR / EN / TR + AR decorated | existing settings/admin permission |
| Agent role, lead, management/about copy | Settings → هوية الوكالة والوكيل | `settings` identity keys | AR / EN / TR | existing settings/admin permission |
| Agent SEO title/description | Settings → هوية الوكالة والوكيل | `settings` identity keys | AR / EN / TR | existing settings/admin permission |
| Header local identity / Agent agency line / Footer identity | Derived from central identity settings with safe approved defaults | `settings` | AR / EN / TR | existing settings/admin permission |
| Homepage statistics incl. years of experience | Admin Homepage Settings | `settings` | shared number + localized labels | existing settings permission |
| Program logo/cover/mobile cover/alt/media mode/layout | Program Media Admin | `programs` + existing media architecture | localized alt where supported | programs/admin permission |
| Program name/status/visibility/descriptions/conditions/updates/order | Existing Programs/content modules | existing program/content tables | AR / EN / TR | existing content/program permissions |
| Navigation/footer links | Existing navigation settings | existing settings/navigation architecture | localized labels | existing settings permission |
| Contact details incl. WhatsApp/email | Existing settings/contact controls | `settings` | shared/localized copy where supported | existing settings permission |
| Pages, sections, Blog, FAQ, Jobs, Success Stories, Partners, Gallery, Announcements | Existing content modules | existing content/pages architecture | AR / EN / TR | existing content permissions |
| Reviews moderation/form configuration | Existing reviews administration | reviews/review submissions/settings | localized public UI | existing review/admin permission |
| Visual presets/media/theme controls | Existing Visual Experience | existing visual/settings architecture | shared | role-gated visual/admin permission |
| Smart Support / knowledge | Existing support/knowledge modules | existing support architecture | localized content where supported | existing support/admin permission |

## Stable UX / i18n (intentionally code-managed)

Interaction labels such as Save, Back, Search, Accept all, Necessary only, Manage preferences, install interaction labels, loading states, and accessibility labels remain in code/i18n. These are product UX strings, not business content that should become database settings.

## Security / system (intentionally not owner-editable)

Supabase secrets, `service_role`, environment variables, OIDC/gateway secrets, RLS policies, SQL, migrations, schema definitions, production credentials, cryptographic/signing keys, Security Definer internals, and raw service configuration remain code/system managed and role protected.

## Remaining hard-coded owner-editable business content

None in the identity surfaces closed by this PR. Approved values remain as centralized safe defaults in `lib/publicIdentity.ts` so public pages remain correct before the Owner first saves the new settings. Those defaults are not duplicated across Header, Footer, Agent, or SEO components.

No additional schema migration is required for identity controls: the existing `settings` architecture accepts new setting keys through the current admin write path.
