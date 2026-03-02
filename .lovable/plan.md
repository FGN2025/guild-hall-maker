

# Admin-Controlled AI Image Generation Model

Upgrade the default model to `google/gemini-3-pro-image-preview` (higher quality) and let admins choose between the built-in Lovable AI models or a custom external API.

## Changes

### 1. Add `ai_image_config` setting to `app_settings`
Insert a new row with key `ai_image_config` containing a JSON value:
```json
{
  "provider": "lovable",
  "model": "google/gemini-3-pro-image-preview",
  "custom_api_url": "",
  "custom_api_key": "",
  "custom_model": ""
}
```
- `provider`: `"lovable"` (default) or `"custom"`
- When `"lovable"`, use the selected model from a dropdown of supported image models
- When `"custom"`, use the admin-provided API URL, API key, and model name

### 2. Update edge function `supabase/functions/generate-media-image/index.ts`
- Read `ai_image_config` from `app_settings` using the service role client
- If provider is `"lovable"`: call the Lovable AI Gateway with the configured model (default: `google/gemini-3-pro-image-preview`)
- If provider is `"custom"`: call the custom API URL with the custom API key and model, using the same OpenAI-compatible chat completions format
- Keep existing error handling (429, 402) and image extraction logic
- For custom providers, also try standard `b64_json` response format as fallback

### 3. Add AI Image Config section to `src/pages/admin/AdminSettings.tsx`
New card with:
- **Provider toggle**: Radio group choosing "Lovable AI (Built-in)" or "Custom API"
- **Lovable mode**: Dropdown to pick between `google/gemini-2.5-flash-image` (faster, lower quality) and `google/gemini-3-pro-image-preview` (higher quality, default)
- **Custom mode**: Three fields appear -- API Endpoint URL, API Key (password input), and Model Name
- Save button persisting to `app_settings` as JSON

### 4. No changes to the frontend `AIImageGenerator` component
The admin config is read server-side in the edge function. The generate dialog remains unchanged for end users.

## Technical Details

- The custom API key is stored in `app_settings.value` JSON (not as a Supabase secret) since it needs to be admin-editable without developer intervention. The `app_settings` table is already protected by RLS (admin-only write, public read). However, since the API key would be visible via public read, we will mask it in the admin UI and the edge function will read it server-side only.
- Note: The `app_settings` table has a public SELECT policy. To avoid leaking the custom API key, the edge function will read it with the service role key. The frontend admin UI will show a masked version and only send the key when explicitly changed.
- The edge function already uses the service role client, so reading from `app_settings` is straightforward.

