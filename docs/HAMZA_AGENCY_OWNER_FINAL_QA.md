# HAMZA AGENCY — Owner Final QA

This record is for **manual Preview QA only**. It does not authorize Production writes, migrations, Post-deploy actions, Merge, or conversion to Ready for Review.

## Current round — 4 August 2026 — fixes prepared, manual retest pending

| Field | Value |
| --- | --- |
| Repository | `hamzaagency1357/hamza-agency` |
| Pull request | `#105` |
| Branch | `feat/pr101-complete-product-expansion` |
| Owner Final QA | **Needs fixes** |
| Ready for Review | **No** |
| Merge authorized | **No** |
| Production authorized | **No** |

## Status before the new manual retest

| Area | Status | Evidence / required next check |
| --- | --- | --- |
| Floating install prompt removed | **Pass** | The PWA runtime remains silent and no automatic floating install UI is mounted. |
| Install App layout | **Pass** | The installation experience remains a standalone page in normal document flow. |
| Install App AR localization | **Pass** | `/install-app` displays Arabic and RTL. |
| Install App EN localization | **Fail — pending fix verification** | The previous Android round showed Arabic Install App content under `/en/install-app`. The implementation now derives the page language from the URL-owned site language and requires a new exact-Preview retest. |
| Install App TR localization | **Fail — pending fix verification** | The previous Android round showed Arabic Install App content under `/tr/install-app`. The implementation now derives the page language from the URL-owned site language and requires a new exact-Preview retest. |
| Bottom Dock three actions | **Pass** | Mobile Dock remains limited to WhatsApp, AI Support, and Quick Navigation. |
| Cookie Banner localization | **Pass** | First-visit banner copy follows AR / EN / TR URL locale. |
| Cookie Banner compact spacing | **Needs final retest** | The banner has a primary Accept all action, quieter Necessary only action, text Manage preferences link, and measured clearance above the Dock. |
| Cookie Preferences Dialog | **Fail and removed** | The broken Dialog, Portal, Backdrop, focus trap, background inerting, and body scroll lock have been removed. |
| Cookie Settings pages | **Pending final retest** | New normal-flow pages are available at `/cookie-settings`, `/en/cookie-settings`, and `/tr/cookie-settings`. |
| Owner Final QA | **Needs fixes** | Do not record Pass until the owner completes the final real-device round against the new exact Preview. |

## Engineering correction in this round

- Replaced the Cookie Preferences overlay with a shared normal-flow Cookie Settings page.
- Preserved the existing `hamza_agency_cookie_consent` key, consent version, stored shape, Necessary-always-true rule, cookie mirror, and existing consent audit delivery.
- Added translated category descriptions and Save selected, Accept all, Necessary only, and Back to website actions.
- Added an inline semantic `role=status` confirmation instead of a floating toast.
- Changed the Cookie Banner Manage preferences action and Footer Cookie settings action into locale-aware links.
- Kept the first-visit Cookie Banner compact, scroll-safe, and clear of the measured Bottom Dock.
- Removed all Preferences Dialog Portal, Backdrop, focus trap, body scroll lock, inert, `aria-hidden`, dialog state, and old dialog test IDs.
- Corrected the Install App root cause: locale-prefixed URLs are internally rewritten to the base route, so the old base page forced Arabic. Install App now consumes the URL-owned site-language provider instead of hard-coded route props.
- Removed optimistic language selection. The active AR / EN / TR state now follows the actual pathname after navigation.
- Added direct-navigation, in-app switching, consent persistence, normal-flow geometry, overflow, Footer, Dock clearance, Chrome Custom Tab, and user-gesture installation regression coverage with retries disabled.

## Final manual Owner QA scope

Use the new immutable exact-Head Preview on Android Chrome and a Chrome Custom Tab. The next manual round is intentionally limited to:

1. Cookie Banner on Mobile.
2. Cookie Settings page in Arabic.
3. Cookie Settings page in English.
4. Cookie Settings page in Turkish.
5. Install App switching AR → EN → TR → AR, checking URL and all page content together.
6. Footer Install App and Cookie settings links.
7. Bottom Dock clearance above the last page action and Footer.

Test at minimum at `360×640`, `390×700`, and `412×732`, plus the owner’s real Chrome Custom Tab viewport. Confirm there is no horizontal overflow, word-by-word heading wrapping, overlay, Backdrop, Portal, body scroll lock, Footer overlap, or Dock overlap.

## Release guard

- Keep PR `#105` Open, Draft, and unmerged.
- Do not convert to Ready for Review or Merge without explicit owner approval after the final manual round.
- Do not execute Production migrations, Post-deploy actions, Billing changes, or stateful Production tests.
- Do not mark Owner Final QA as Pass based only on automated checks.
