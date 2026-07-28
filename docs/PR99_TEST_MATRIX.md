# PR #99 Automated Test Matrix

| Gate | Command | Coverage |
|---|---|---|
| Lint | `npm run lint` | Source quality and React rules |
| Types | `npm run typecheck` | TypeScript contracts |
| Public translations | `npm run verify:translations` | PR #98 locale completeness rules |
| Migration safety | `npm run verify:migrations` | Transactional PR #99 migrations, no destructive DDL or secrets |
| Secret scan | `npm run verify:secrets` | No Service Role/JWT-like secret/client env files |
| Unit/integration | `npm run test` | Transactional publishing, locale identity, versioning, restore, rate-limit hashing, section catalog, unsaved state |
| Build | `npm run build` | Next.js production compile and route generation |
| Runtime smoke | `npm run test:e2e` | Public AR/EN/TR routes and unauthenticated admin guards |

Authenticated CRUD browser E2E remains required before the PR can be marked Ready for Review.
