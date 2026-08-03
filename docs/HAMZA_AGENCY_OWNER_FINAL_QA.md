# HAMZA AGENCY — Owner Final QA Checklist

This checklist is for **manual Preview QA only**. Do not run stateful tests on Production. Stop and record a blocking issue if the Preview does not report the exact PR Head.

## 1. Round information

| Field | Value |
| --- | --- |
| Repository | `hamzaagency1357/hamza-agency` |
| Pull request | `#105` |
| Branch | `feat/pr101-complete-product-expansion` |
| Automated closeout baseline | `d8de9da6ad738aaa6bca6d37779c40e48d7fd2ff` |
| Exact QA commit SHA | Copy **Current Head** from the PR body immediately before QA: `____________________________` |
| Exact Vercel Preview URL | `https://hamza-agency-git-feat-pr101-0c5675-hamzaagencysy-3009s-projects.vercel.app` |
| Preview `/api/health` commit SHA | `____________________________` |
| Date and time — Europe/Istanbul | `____________________________` |
| Executor name | `____________________________` |
| Device/browser | `____________________________` |
| Screenshot or evidence folder/link | `____________________________` |

### Mandatory preflight

- [ ] **Pass / Fail / Not Tested** — PR is Open, Draft, and unmerged.
- [ ] **Pass / Fail / Not Tested** — PR Current Head equals the Exact QA commit entered above.
- [ ] **Pass / Fail / Not Tested** — Preview `/api/health` reports the same exact commit SHA.
- [ ] **Pass / Fail / Not Tested** — Vercel deployment is successful for that commit.
- [ ] **Pass / Fail / Not Tested** — No Production URL is used for stateful QA.

Notes/screenshots:

> 

## Result notation

For every item, mark exactly one result:

- `Pass`
- `Fail`
- `Not Tested`

A `Fail` or required `Not Tested` is blocking until the owner explicitly decides otherwise.

## 2. Public multilingual QA

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Home page — Arabic `/` |  |  |
| Home page — English `/en` |  |  |
| Home page — Turkish `/tr` |  |  |
| Language switcher is inside Header and switches AR / EN / TR |  |  |
| Language does not change automatically while scrolling or navigating |  |  |
| EN/TR contain no unintended Arabic text; AR contains no unintended EN/TR leakage |  |  |
| Header links work in all three languages |  |  |
| Footer links work in all three languages |  |  |
| Mobile navigation opens, closes, and does not overlap content |  |  |
| WhatsApp/support/AI mobile controls open and close correctly |  |  |
| Ticker content is localized and moves in the correct direction |  |  |
| Core SEO title and description are correct |  |  |
| Canonical and locale URLs are correct |  |  |
| Core OpenGraph metadata is present and appropriate |  |  |
| Programs pages |  |  |
| Applications pages and forms |  |  |
| Services pages and forms |  |  |
| Jobs pages and forms |  |  |
| Knowledge pages |  |  |
| FAQ pages |  |  |
| Gallery pages |  |  |
| Partners pages |  |  |
| Contact pages and support wording |  |  |
| Legal, Privacy, Cookie, AI, and Terms pages |  |  |

Section notes/screenshots:

> 

## 3. Tracking

Use Preview-generated data only. Do not use Production applicant records.

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Submit a real Creator/Application form on Preview |  |  |
| Receive and record the generated tracking code |  |  |
| Lookup succeeds using the tracking code only |  |  |
| Lookup does not require WhatsApp, phone, email, or name |  |  |
| Invalid tracking code returns the approved safe response |  |  |
| Submit a Service Request on Preview |  |  |
| Receive and verify Service Request tracking |  |  |
| Tracking messages are correct in AR |  |  |
| Tracking messages are correct in EN |  |  |
| Tracking messages are correct in TR |  |  |
| Public lookup does not expose private applicant data |  |  |

Tracking codes used:

- Application: `____________________________`
- Service Request: `____________________________`

Section notes/screenshots:

> 

## 4. Authentication and Admin

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Admin login succeeds with the owner-approved account |  |  |
| Invalid login fails safely without exposing internals |  |  |
| Password reset request and recovery route behave correctly |  |  |
| MFA works for the current owner account when enabled |  |  |
| Recovery codes are stored privately outside GitHub/Vercel/Supabase/chat |  |  |
| `/admin` |  |  |
| `/admin/page-builder` |  |  |
| `/admin/backups` |  |  |
| `/admin/trash` |  |  |
| `/admin/notifications` |  |  |
| `/admin/system-health` |  |  |
| Save one permitted Preview change |  |  |
| Reload and confirm that the change persisted |  |  |
| Activity Log records the approved change |  |  |
| Admin pages show no visible application error |  |  |

Do not paste passwords, MFA secrets, recovery codes, tokens, or cookies into this file.

Section notes/screenshots:

> 

## 5. Page Builder

Use a dedicated Preview QA page or approved non-Production page.

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Create/save Draft |  |  |
| Preview Draft content |  |  |
| Public route remains unavailable before publish |  |  |
| Publish Arabic |  |  |
| Publish English |  |  |
| Publish Turkish |  |  |
| Public content is correct in all three languages |  |  |
| Version records are created |  |  |
| Restore a selected version |  |  |
| Restored page returns to Draft as designed |  |  |
| Republish AR / EN / TR |  |  |
| Unpublish AR / EN / TR |  |  |
| Public route returns 404 after final Unpublish |  |  |
| Activity/version history is understandable and accurate |  |  |

Page slug/ID used: `____________________________`

Section notes/screenshots:

> 

## 6. Commerce

Use Preview test listings and accounts only. Do not configure real payments.

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Add listing to Favorites |  |  |
| Remove listing from Favorites |  |  |
| Add item to Cart |  |  |
| Update quantity |  |  |
| Remove and re-add Cart item |  |  |
| Checkout with approved Preview/manual method |  |  |
| Receive an Order code |  |  |
| View Order details and item totals |  |  |
| Advance the approved Order lifecycle |  |  |
| Review is allowed only when eligible |  |  |
| Ineligible review is denied |  |  |
| Refund request flow |  |  |
| Refund status flow |  |  |
| Dispute opening flow |  |  |
| Dispute response/resolution flow |  |  |
| Client cannot perform employee/admin-only actions |  |  |
| Partner sees only related permitted data |  |  |
| Cross-tenant access is denied |  |  |
| Notifications and audit evidence appear for lifecycle events |  |  |

Order code used: `____________________________`

Section notes/screenshots:

> 

## 7. Portals and operations

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Creator Portal |  |  |
| Client Portal |  |  |
| Employee Portal |  |  |
| Partner Portal |  |  |
| Invitation creation |  |  |
| Invitation acceptance |  |  |
| Invitation resend/cancel where permitted |  |  |
| Membership role change where permitted |  |  |
| Membership suspend and restore |  |  |
| Task creation/update |  |  |
| Assignees |  |  |
| Watchers |  |  |
| Comments |  |  |
| Attachment metadata |  |  |
| Task status history |  |  |
| SLA warning |  |  |
| SLA breach |  |  |
| SLA pause |  |  |
| SLA resume |  |  |
| SLA escalation |  |  |
| Workflow run |  |  |
| Workflow bounded retry |  |  |
| Workflow resume |  |  |
| Workflow completion |  |  |
| Cross-role and cross-tenant denial |  |  |

Section notes/screenshots:

> 

## 8. Backup, Trash, and Notifications

Preview/local-approved paths only. Do not run a stateful Production restore.

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Backup metadata is complete and understandable |  |  |
| Checksum/project/version/schema metadata are present |  |  |
| Dry-run path reports validation without destructive change |  |  |
| Limited restore path is available and clearly bounded |  |  |
| Unauthorized role cannot start restore |  |  |
| Restore a Trash item |  |  |
| Restored item persists after reload |  |  |
| Wrong permanent-delete confirmation is denied |  |  |
| Two-step permanent delete succeeds with correct confirmation |  |  |
| Deleted content is not exposed afterward |  |  |
| Notification pagination |  |  |
| Mark one notification read |  |  |
| Read state persists after reload |  |  |
| Mark all notifications read |  |  |
| Notification deduplication |  |  |
| Unauthorized notification action is denied |  |  |

Section notes/screenshots:

> 

## 9. Mobile QA — Android viewport

Test on the owner’s Android phone and, where possible, one narrow browser viewport.

| Check | Result | Notes / screenshot |
| --- | --- | --- |
| Header layout |  |  |
| Logo and main navigation |  |  |
| AR / EN / TR language switcher |  |  |
| Mobile menu and bottom controls |  |  |
| Forms and validation messages |  |  |
| Tables transform or scroll safely |  |  |
| Cards and portals remain readable |  |  |
| No horizontal page overflow |  |  |
| No blocked or covered buttons |  |  |
| No infinite loading loop |  |  |
| No unexpected language switch |  |  |
| No visible application error |  |  |
| No browser-console application error during inspected flows |  |  |
| Back navigation and refresh are safe |  |  |

Section notes/screenshots:

> 

## 10. Blocking issues

| ID | Area | Severity | Description | Evidence | Owner decision |
| --- | --- | --- | --- | --- | --- |
| `QA-001` |  |  |  |  |  |
| `QA-002` |  |  |  |  |  |
| `QA-003` |  |  |  |  |  |

## 11. Final owner decision

- Owner Final QA: `Pass / Fail`
- Required items marked Not Tested: `Yes / No`
- Blocking issues remaining: `Yes / No`
- Approved for Ready for Review: `Yes / No`
- This approval authorizes Merge: **No — Merge requires a separate explicit approval.**
- This approval authorizes Production migrations: **No — Production migrations require a separate explicit approval.**
- This approval authorizes Post-deploy/session revocation: **No — a separate explicit approval is required.**

Owner name/signature: `____________________________`

Date and time — Europe/Istanbul: `____________________________`

Final notes:

> 
