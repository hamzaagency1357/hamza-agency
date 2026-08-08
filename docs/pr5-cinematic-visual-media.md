# HAMZA AGENCY — PR5 Cinematic Visual Media

PR5 implements the production-safe visual direction **«بوابة إلى عالم البث المباشر»** without changing approved public copy, SEO, mobile navigation, PR4 Smart Support, or the HAMZA AGENCY logo.

## Architecture

The implementation reuses `public.media`, the `media-library` bucket, existing Visual Experience presets and the current admin permission model. It does not create a parallel CMS or storage system.

`CinematicSiteBackground` is mounted once in the root layout and maps AR/EN/TR routes to shared page scopes for Home, Programs, Services, Success Stories, Blog, Agent, Contact, Install App, Tracking, Service Request, Application Status and Service Status.

It supports Desktop/Mobile assets, WebM primary video, MP4 fallback, poster/static fallback, images/textures, opacity/dimming/overlay/blur/focal position, muted autoplay, loop and playsInline. It stops cinematic playback for `prefers-reduced-motion`, Save-Data and low-resource devices, and selects only the current device source set.

If the PR5 database columns are not present yet, `/api/public/site-visual` returns a safe `media: null` response and the existing premium visual presets remain the fallback. No raw database error is exposed.

## Admin media lifecycle

`/admin/media/cinematic` is protected by the existing `media` permission and supports Upload, Preview-ready assets, Desktop, Desktop MP4 fallback, Mobile, Mobile MP4 fallback, Poster, Alt text, media type, page usage, Draft, Review, Approved, Published, Disabled, Archived, scheduling, playback controls, focal position and visual intensity controls.

Published video requires a Poster. Safe archive blocks a currently published asset. Safe delete is a second step available only to archived + inactive records; it deletes only the database record while retaining Storage files as a non-breaking safety copy.

Admin UI does not expose raw storage keys, UUIDs, JSON or raw database error messages.

## Upload security

Accepted signatures/MIME types: JPEG, PNG, WebP, AVIF, WebM and MP4. SVG is rejected. Images are limited to 5MB and videos to 25MB. Filenames use safe path segments plus `crypto.randomUUID()`. No client-side `service_role` credential is used.

## Migration

`20260808233000_pr5_cinematic_visual_media.sql` is additive. It extends `public.media` with lifecycle, variants, poster, visual controls and scheduling; keeps RLS enabled; tightens public SELECT to active + published + currently scheduled rows; reuses admin CRUD policies; and expands the existing bucket only to the validated image/WebM/MP4 set. It does not drop tables, truncate data or remove columns.

Production application is deferred until PR5 technical closeout.

## Final cinematic asset

No final approved cinematic WebM/MP4 asset was present in the repository or active media library at PR5 start. PR5 therefore does not invent an AI video, logo or text. The complete system and premium fallback are ready for the approved asset to be uploaded later. This is not a runtime blocker.

## Regression boundaries

PR5 does not modify the Mobile Main Navigation structure, approved copy/SEO, Smart Support, Human Handoff/SUP, Knowledge Base, Notifications, consent/privacy or internal-note handling. The media layer is pointer-event-free and remains below public content/support UI.

After PR5 is merged and Production health is verified, the next phase is the single Final Full Project Audit.
