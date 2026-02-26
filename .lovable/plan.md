
## Add Manageable Hero Logo

### Overview
Add the uploaded FGN logo above the "NETWORK GAMING PLATFORM" text in the hero section, centered with the rest of the content. The logo will be admin-manageable through the Admin Settings panel.

### Steps

1. **Copy the logo asset** into `src/assets/fgn-hero-logo.png` as the default fallback image.

2. **Add a new `app_settings` row** with key `hero_logo_url` (empty by default, meaning "use the bundled default logo"). This follows the existing pattern used for `featured_video_url` and `homepage_ticker_embed`.

3. **Update `src/components/HeroSection.tsx`**:
   - Fetch the `hero_logo_url` setting from the database on mount.
   - Display the logo (from setting or fallback) above the "NETWORK GAMING PLATFORM" text, centered.
   - Use `max-h-20 md:max-h-28` sizing so it scales well on mobile/desktop.
   - All elements are already centered via `text-center` on the container -- just ensure the `img` uses `mx-auto`.

4. **Update `src/pages/admin/AdminSettings.tsx`**:
   - Add a new "Hero Logo" settings card with a file upload button (uploads to `app-media` storage bucket under `hero/logo.*`).
   - On upload, store the public URL in `app_settings` with key `hero_logo_url`.
   - Show a preview of the current logo and a "Reset to Default" option that clears the setting value.

### Technical Detail

**Database migration**: Insert the new setting row:
```sql
INSERT INTO public.app_settings (key, value)
VALUES ('hero_logo_url', '')
ON CONFLICT (key) DO NOTHING;
```

**HeroSection changes**: Add a `useEffect` that queries `app_settings` for `hero_logo_url`. If the value is non-empty, use it as the `src`; otherwise import and use the bundled `fgn-hero-logo.png`. Render the logo as a centered `img` tag above the subtitle `p` tag, with `mb-6` spacing.

**AdminSettings changes**: Add a new card section between the existing settings cards. It will include:
- A preview thumbnail of the current hero logo
- A file input (hidden, triggered by button) that uploads to `app-media/hero/logo.{ext}` with `upsert: true`
- On successful upload, update the `hero_logo_url` row in `app_settings`
- A "Reset to Default" button that sets the value back to empty string
