# HAMZA AGENCY repository rules

- Continue work on the current approved pull request and branch; do not open a replacement PR for the same closeout scope.
- Verify the exact PR Head before every write and after every commit.
- Use free plans only. No billing, trials, cards, paid providers, or hidden paid services without explicit owner approval.
- Do not perform Production writes, migrations, restores, submissions, membership changes, or permission changes without explicit authorization for that exact operation.
- Do not edit `main` directly and do not merge without explicit owner approval.
- Reuse the existing Quality Gates, Playwright setup, helpers, migrations, routes, tables, and RPCs whenever they are safe to extend.
- Never commit, log, upload, or expose secrets, cookies, access tokens, refresh tokens, MFA material, recovery codes, private keys, or sensitive user data.
- Keep documentation updates in the progressive closeout record by default. For an Owner-approved closeout blocker on the current PR, narrowly edit only the minimum operational code, workflow, migration, tests, runbook/docs, and repository rules required to make that approved closeout path safe and verifiable; keep all such changes in the same PR and record the resulting state in [`docs/HAMZA_AGENCY_FULL_PROJECT_CLOSEOUT.md`](docs/HAMZA_AGENCY_FULL_PROJECT_CLOSEOUT.md). This exception does not authorize Production writes, migrations, restores, permission changes, direct `main` edits, or merge.
