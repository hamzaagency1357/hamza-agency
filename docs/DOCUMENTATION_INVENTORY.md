# HAMZA AGENCY — Documentation Inventory

This inventory prevents historical documents from being mistaken for the current source of truth. Current project state is authoritative only in [`CURRENT_PROJECT_STATE.md`](CURRENT_PROJECT_STATE.md).

| Document / group | Classification | Use |
|---|---|---|
| `README.md` | PUBLIC-SAFE / ACTIVE | concise repository overview; points to current-state authority |
| `docs/CURRENT_PROJECT_STATE.md` | ACTIVE / INTERNAL-ONLY | single authoritative current project state |
| `PROJECT_PENDING_TASKS.md` | ACTIVE / INTERNAL-ONLY | intentionally deferred operational actions only |
| `docs/HAMZA_AGENCY_OPERATIONS_GUIDE.md` | ACTIVE / INTERNAL-ONLY | current operational guidance |
| `docs/HAMZA_AGENCY_EXECUTION_MODE.md` | ACTIVE / INTERNAL-ONLY | tool-neutral bounded-change workflow |
| `docs/SUPABASE_DATABASE_CHANGE_WORKFLOW.md` | ACTIVE / INTERNAL-ONLY | current database-change process; no implicit Production authorization |
| `docs/CURRENT_CLOSEOUT_LEDGER.md` | HISTORICAL / INTERNAL-ONLY | PR #116-era closeout evidence; not current authority |
| `docs/CURRENT_REMEDIATION_LEDGER.md` | HISTORICAL / INTERNAL-ONLY | completed remediation-program evidence; not current authority |
| `docs/PROJECT-STATUS.md` | HISTORICAL / STALE | July 2026 snapshot; retained through Git history and historical marker |
| `docs/HAMZA_AGENCY_PROJECT_CHECKPOINT.md` | HISTORICAL / STALE | prior checkpoint; not current authority |
| `docs/HAMZA_AGENCY_FINAL_DELIVERY.md` | HISTORICAL / INTERNAL-ONLY | prior delivery/closeout evidence |
| `docs/HAMZA_AGENCY_FINAL_HANDOVER.md` | HISTORICAL / INTERNAL-ONLY | prior handover evidence |
| `docs/HAMZA_AGENCY_FULL_COMPLETION_EXECUTION_PLAN.md` | HISTORICAL / INTERNAL-ONLY | prior execution plan |
| `docs/HAMZA_AGENCY_FULL_PROJECT_CLOSEOUT.md` | HISTORICAL / INTERNAL-ONLY | prior closeout evidence |
| `docs/HAMZA_AGENCY_OWNER_FINAL_QA.md` | HISTORICAL / INTERNAL-ONLY | prior Owner QA evidence |
| deployment/recovery/checklist records under `docs/` | INTERNAL-ONLY | use only when their date/scope still applies; current-state conflicts defer to `CURRENT_PROJECT_STATE.md` |
| migration/security/remediation evidence under `docs/` | HISTORICAL or INTERNAL-ONLY | preserve evidence; never infer current Production state from an old status label |
| test/e2e/QA instructions | INTERNAL-ONLY | executable/verification support, never visitor-facing content |

## Rules

- Do not create a second authoritative “current state” ledger.
- Historical files may contain old PRs, SHAs, blockers, or migration states; they must be clearly treated as historical evidence.
- Useful history remains available in Git and associated PR/workflow records even when an active document is reconciled.
- Repository documentation may contain technical identifiers when operationally necessary; those identifiers must not be exposed as visitor-facing runtime metadata.
