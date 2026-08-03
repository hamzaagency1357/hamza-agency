# HAMZA AGENCY — Owner Final QA

This record is for **manual Preview QA only**. It does not authorize Production writes, migrations, Post-deploy actions, Merge, or conversion to Ready for Review.

## Current round — 3 August 2026

| Field | Value |
| --- | --- |
| Repository | `hamzaagency1357/hamza-agency` |
| Pull request | `#105` |
| Branch | `feat/pr101-complete-product-expansion` |
| Tested surface | Exact Vercel Preview on Android Chrome |
| Owner Final QA | **Needs fixes** |
| Ready for Review | **No** |
| Merge authorized | **No** |
| Production authorized | **No** |

### Actual findings

| ID | Area | Result | Finding |
| --- | --- | --- | --- |
| `QA-001` | Cookie localization | **Fail** | Cookie consent/settings remained Arabic after switching to EN or TR, including RTL direction and Arabic labels. |
| `QA-002` | Cookie settings mobile layout | **Fail** | The dialog exceeded the Android viewport and its top content could become clipped or hidden behind the header. |
| `QA-003` | Install-app mobile layout | **Fail** | The install button overlapped long Arabic copy and the card did not adapt safely to narrow screens. |
| `QA-004` | Bottom dock overlap | **Fail** | The fixed mobile dock covered the install card and final page content. |

**Owner Final QA status remains `Needs fixes`. Do not change these findings to Pass until the owner repeats manual Android QA against a new exact Preview whose `/api/health` SHA matches the current PR Head.**

## Fix verification required on the next exact Preview

### Mandatory preflight

- [ ] PR is Open, Draft, and unmerged.
- [ ] PR Current Head equals the SHA recorded for the QA round.
- [ ] Exact Preview `/api/health` reports the same SHA.
- [ ] Vercel deployment and all required exact-head checks are successful.
- [ ] No Production URL is used for stateful testing.

### Cookie localization and behavior

For AR, EN, and TR:

- [ ] Open the URL-owned locale and open Cookie settings.
- [ ] Title, description, categories, actions, settings label, and policy link use only the active language.
- [ ] Arabic is RTL; English and Turkish are LTR.
- [ ] Switch language while the dialog is open; content updates without a full page reload.
- [ ] Necessary only closes the dialog and remains stored after reload.
- [ ] Accept selected stores only selected categories.
- [ ] Accept all stores all optional categories.
- [ ] Settings can be reopened from the unified Bottom Dock.
- [ ] Cookie policy keeps the active locale.

### Android geometry

Test at minimum on widths `360`, `390`, and `412` pixels and on the owner’s Android phone:

- [ ] Dialog top and bottom remain inside the viewport and its body scrolls internally when needed.
- [ ] Dialog opens at its top; header and decision buttons remain reachable.
- [ ] Background page cannot be scrolled or interacted with while the dialog is open.
- [ ] No horizontal overflow.
- [ ] Install-app copy and action do not overlap; narrow layout is vertical.
- [ ] Install card remains above the Bottom Dock.
- [ ] Last page content, buttons, cards, and Footer can scroll fully above the Bottom Dock and Android safe area.

## Broader Owner Final QA continuation

After the four blocking findings above pass, continue the existing project checklist for public AR/EN/TR pages, forms and tracking, authentication and Admin, Page Builder, Commerce, portals, tasks/SLA/workflows, backup/restore, Trash, notifications, security, and mobile navigation. Record exact Preview URL, exact SHA, device/browser, screenshots, and any new blocking issue.

## Final decision

- Owner Final QA: **Needs fixes**
- Blocking issues remaining: **Yes — pending manual retest on the new Preview**
- Approved for Ready for Review: **No**
- Merge authorized: **No**
- Production migrations authorized: **No**
- Post-deploy/session revocation authorized: **No**
