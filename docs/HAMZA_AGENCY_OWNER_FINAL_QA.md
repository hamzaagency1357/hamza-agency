# HAMZA AGENCY — Owner Final QA

This record is for **manual Preview QA only**. It does not authorize Production writes, migrations, Post-deploy actions, Merge, or conversion to Ready for Review.

## Current round — 3 August 2026 — Android round 2

| Field | Value |
| --- | --- |
| Repository | `hamzaagency1357/hamza-agency` |
| Pull request | `#105` |
| Branch | `feat/pr101-complete-product-expansion` |
| Tested surface | Exact Vercel Preview on Android inside a Chrome Custom Tab opened by an external application |
| Owner Final QA | **Needs fixes** |
| Ready for Review | **No** |
| Merge authorized | **No** |
| Production authorized | **No** |

### Actual findings from the second manual round

| ID | Area | Result | Finding |
| --- | --- | --- | --- |
| `QA2-001` | Cookie localization | **Pass** | Arabic renders in Arabic and RTL; English renders in English and LTR; Turkish renders in Turkish and LTR; switching locale while the dialog is open works. This behavior must remain unchanged. |
| `QA2-002` | Cookie modal isolation | **Fail** | The public Header remained visible above the Backdrop and the background was not fully isolated inside the Android Chrome Custom Tab. |
| `QA2-003` | Cookie dialog geometry | **Fail** | The title/top content was clipped or hidden, locale controls consumed excessive height, content was cut near the Footer, and the dialog did not reliably fit the smaller visual viewport. |
| `QA2-004` | Install-app layout | **Fail** | The install prompt overlapped the Hero description and CTA instead of occupying an independent in-flow mobile card. |
| `QA2-005` | Bottom Dock clearance | **Fail** | The fixed Dock covered content, including the beginning of the “Available programs” section, and the page did not reserve clearance based on the Dock’s measured wrapped height. |

**Owner Final QA status remains `Needs fixes`. Cookie localization alone is Pass; the complete Owner Final QA must not be recorded as Pass until the owner repeats Android and Chrome Custom Tab QA against the new exact Preview.**

## Engineering correction prepared for the next exact Preview

- Cookie consent is mounted through a dedicated `document.body` Portal above centralized public UI layers.
- Background body children are made inert and pointer-inactive while consent is open; focus trap, focus restoration, body scroll lock, and conditional dismissal remain enforced.
- Cookie geometry tracks `visualViewport` resize/scroll, keeps a fixed header and actions, and gives the content area internal scrolling.
- Mobile locale controls are a compact horizontal row and changing locale resets dialog scroll to the top.
- The PWA prompt is in normal document flow on Mobile and Desktop.
- The mobile Dock publishes its measured height to `--public-mobile-dock-height`, listens to ResizeObserver, language/width/font/visual viewport changes, and adds a real in-flow clearance element after public content.
- Regression assertions cover geometry, top-layer hit testing, background isolation, PWA/Hero intersections, Dock measurement, final content clearance, and horizontal overflow.

## Fix verification required on the next exact Preview

### Mandatory preflight

- [ ] PR is Open, Draft, and unmerged.
- [ ] PR Current Head equals the SHA recorded for the QA round.
- [ ] Exact Preview `/api/health` reports the same SHA.
- [ ] Vercel deployment and all required exact-head checks are successful.
- [ ] No Production URL is used for stateful testing.

### Cookie localization and behavior

For AR, EN, and TR:

- [ ] Reconfirm the existing localization Pass: title, description, categories, actions, settings label, and policy link use only the URL-owned active language.
- [ ] Arabic is RTL; English and Turkish are LTR.
- [ ] Switch language while the dialog is open; content updates without a full page reload and scroll returns to the top.
- [ ] Necessary only closes the dialog and remains stored after reload.
- [ ] Accept selected stores only selected categories.
- [ ] Accept all stores all optional categories.
- [ ] Settings can be reopened from the unified Bottom Dock.
- [ ] Cookie policy keeps the active locale.

### Android and Chrome Custom Tab geometry

Test at minimum at `360×640`, `360×740`, `390×700`, `390×780`, and `412×732`, plus the owner’s real Android Chrome Custom Tab:

- [ ] Backdrop starts at the visible top edge and covers the complete visible viewport, including the public Header.
- [ ] Header and background cannot receive clicks, pointer events, focus, or page scroll while the dialog is open.
- [ ] Dialog title, horizontal locale row, scrollable body, policy link, and all Footer actions remain reachable.
- [ ] Turkish long copy does not introduce horizontal overflow.
- [ ] Install-app copy and button are in an independent in-flow card and do not overlap the Hero description or CTA.
- [ ] Install card does not overlap the Bottom Dock.
- [ ] “Available programs”, the Footer, the final card, and the final action can scroll fully above the Bottom Dock and Android safe area.
- [ ] Dock measurement updates after locale, width, text wrapping, and visual viewport changes.

## Broader Owner Final QA continuation

After the four remaining blocking findings pass, continue the existing project checklist for public AR/EN/TR pages, forms and tracking, authentication and Admin, Page Builder, Commerce, portals, tasks/SLA/workflows, backup/restore, Trash, notifications, security, and mobile navigation. Record exact Preview URL, exact SHA, device/browser, screenshots, and any new blocking issue.

## Final decision

- Cookie localization: **Pass — manual round 2**
- Cookie modal isolation: **Fail — pending retest after fix**
- Cookie dialog geometry: **Fail — pending retest after fix**
- Install-app layout: **Fail — pending retest after fix**
- Bottom Dock clearance: **Fail — pending retest after fix**
- Owner Final QA: **Needs fixes**
- Approved for Ready for Review: **No**
- Merge authorized: **No**
- Production migrations authorized: **No**
- Post-deploy/session revocation authorized: **No**
