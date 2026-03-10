

## Fix Sound Mute Toggle + Add Sound Choice Picker

### Two issues to address

1. **Mute toggle not working**: `showBrowserNotification` does not pass `silent: true` — the OS plays its own chime regardless of the mute setting.
2. **Sound selection**: Users should be able to choose from a few subtle notification tones.

### Changes

| File | Change |
|------|--------|
| `src/lib/notificationAlerts.ts` | Add `silent: isSoundMuted()` to `showBrowserNotification`. Add sound choice helpers (`getSelectedSound`, `setSelectedSound`). Define a `SOUND_OPTIONS` array with 3 choices. Update `playNotificationSound` to use the selected sound file. Invalidate cached `audioInstance` when sound changes. |
| `src/components/NotificationPreferences.tsx` | Replace the simple sound on/off toggle section with: mute switch (kept) + a sound picker (radio group or select dropdown) showing the 3 options with a "Preview" play button next to each. Store selection via `setSelectedSound`. |
| `public/sounds/` | Add 2 new subtle sound files generated as short Web Audio API tones (or simple royalty-free chimes): `soft-chime.mp3`, `gentle-pop.mp3`. Keep existing `notification.mp3` as the "Classic" option. |

### Sound Options

| Key | Label | File |
|-----|-------|------|
| `classic` | Classic | `/sounds/notification.mp3` |
| `soft-chime` | Soft Chime | `/sounds/soft-chime.mp3` |
| `gentle-pop` | Gentle Pop | `/sounds/gentle-pop.mp3` |

### Detail

**`notificationAlerts.ts`** adds:
```typescript
const SOUND_CHOICE_KEY = "notification_sound_choice";
export const SOUND_OPTIONS = [
  { key: "classic", label: "Classic", file: "/sounds/notification.mp3" },
  { key: "soft-chime", label: "Soft Chime", file: "/sounds/soft-chime.mp3" },
  { key: "gentle-pop", label: "Gentle Pop", file: "/sounds/gentle-pop.mp3" },
];
export function getSelectedSound() { ... }
export function setSelectedSound(key: string) { ... }
```

`playNotificationSound` uses the selected file, and resets `audioInstance` when the source changes.

`showBrowserNotification` adds `silent: isSoundMuted()` to suppress the OS chime.

**`NotificationPreferences.tsx`** shows each sound option as a row with the label, a small play/preview button, and a radio indicator for the active selection. The mute switch stays above and disables the picker when muted.

Since we cannot run a backend audio generator, the two new sound files will be created as minimal programmatic audio using the Web Audio API at build time, exported as short base64 data URIs or tiny mp3 files placed in `public/sounds/`.

