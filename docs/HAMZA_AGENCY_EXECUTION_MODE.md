# HAMZA AGENCY — Execution Mode

## Fast Feature Delivery Mode

Use this mode for features that touch a large page, more than one file, Supabase reads/writes, or public and admin behavior together.

1. Start from the current `main` branch.
2. Use one clean feature branch per complete feature.
3. Implement the entire approved scope before creating a pull request.
4. Run build and checks before the PR is opened.
5. Review the final diff once: changed files, deleted code, scope, and regressions.
6. Wait for one Vercel Preview success for the completed feature.
7. Merge only after explicit approval, then verify Production.

## Small Safe Fix Mode

Use this mode only for a clearly isolated edit such as a copy change, CSS adjustment, metadata setting, or small component fix.

1. One change.
2. One commit.
3. One Vercel Preview check.
4. Merge only after explicit approval.

## Program Details Translation Reader — Approved Scope

- Preserve the existing `app/programs/[slug]/page.tsx` visual design, backgrounds, animations, fallback content, submission form, and Supabase application behavior.
- Read only published EN/TR rows from `content_translations` where `source_type = programs`.
- Enable EN/TR only when all fields are non-empty and published: `title`, `summary`, `content`, `requirements`, `benefits`, `updates`, `faq`.
- Otherwise render the full original Arabic experience with no mixed language.
- Preserve brand names: TikTok, BIGO LIVE, Yaahlan, Xena, Catchii.
- Persist application platform and duplicate-prevention keys with the original program name, never a translated display name.
- No SQL, RLS, migration, OpenAI call, automatic translation, or admin-panel change in this feature.

## Non-Negotiable Safety Check

Do not replace the original public program-details page with a wrapper or a redesigned component. The final diff must retain its existing public behavior and presentation.
