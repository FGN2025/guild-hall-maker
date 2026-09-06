# Wire "Powered by FGN" footer to real destinations

## Current state
- `src/components/PoweredByFgn.tsx` already links to `https://play.fgn.gg` and `/for-providers`.
- It is rendered on `TenantEventPage` and `TenantEventDetail` only.
- The external link does not open in a new tab and carries no UTM attribution, so tenant referral traffic is invisible.
- `/for-providers` has a working contact form and a Stripe signup form, but the footer link lands at the top of the page rather than the inquiry section.

## Goal
Make sure every visitor on a public tenant event page can reach the real FGN homepage and the provider inquiry form, with proper attribution and UX.

## Plan

1. Harden `src/components/PoweredByFgn.tsx`
   - Open the external FGN link in a new tab with `rel="noopener noreferrer"`.
   - Add UTM parameters to the external link so tenant traffic is attributable: `utm_source=fgn-tenant&utm_medium=referral&utm_campaign=tenant-events&utm_content=<tenantSlug>`.
   - Change the internal provider link to `/for-providers#contact-form` so it scrolls directly to the inquiry form.
   - Keep styling subtle and tenant-brand-safe.

2. Surface the footer on additional public tenant pages
   - Add `<PoweredByFgn />` to `src/pages/WebPageView.tsx` if it is a public tenant-branded page and does not already include it.
   - Ensure it is placed outside any `main` content container and above the bottom of the viewport.

3. Verify end-to-end with Playwright
   - Visit a public tenant event list page (e.g., `/events/acme-broadband`) and confirm the footer renders.
   - Click the external FGN link and assert it opens `https://play.fgn.gg` with the expected UTM params in a new tab.
   - Click the provider link and assert navigation to `/for-providers#contact-form`.
   - Check `WebPageView` if modified.
   - Confirm no console errors and no broken links.

4. Run typecheck/build after edits.

## Out of scope
- No backend or RLS changes.
- No changes to `/for-providers` form logic.
- No marketing notifications or data migrations.
