# HAMZA AGENCY — Pending Operational Actions

This file lists intentionally deferred operational actions only. It is not the current project-state authority and it is not a feature backlog. Current state is maintained in [`docs/CURRENT_PROJECT_STATE.md`](docs/CURRENT_PROJECT_STATE.md).

## Future operational action

- Owner TOTP enrollment before any future MFA enforcement.
  - Do not enforce MFA as part of documentation cleanup.
  - Do not store MFA seeds, recovery codes, tokens, passwords, or other credentials in the repository.
  - Any future Auth configuration change requires its own approved scope and Production-write authorization.

## Rules

- Closed Security/Auth/Dependency/Public/PWA/Admin phases remain closed unless a new regression is proven.
- No Production database, Auth, user, permission, billing, backup/restore, or business-data write is authorized by this file.
- Historical TODO/PENDING items in older ledgers do not become active work merely because the historical file is retained.
