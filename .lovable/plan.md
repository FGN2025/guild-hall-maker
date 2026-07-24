## Root cause

`src/components/marketing/AgentLaunchCard.tsx` renders two `<SelectItem value="">` entries (Archetype "Auto-select" on line 137, Anchor event "None" on line 149). Radix UI rejects empty-string values because `""` is reserved to clear the Select and show the placeholder. Rendering these items throws synchronously when the dropdown mounts, which the app's ErrorBoundary catches — producing the "Something went wrong" screen on `/tenant/marketing?tab=agent`.

The component's local state (`archetype`, `anchor`) is initialized to `""`, and the launch handler already treats empty/falsy as "not provided" (`archetype || undefined`, and `anchor.split(":")` only runs when `anchor` is truthy).

## Fix

In `src/components/marketing/AgentLaunchCard.tsx`:

1. Replace the two `SelectItem value=""` entries with a sentinel value (e.g. `"__none__"`).
2. In each `Select`'s `value` prop, map internal empty string → sentinel for display (`value={archetype || "__none__"}`, `value={anchor || "__none__"}`).
3. In each `onValueChange`, map sentinel back to `""` so downstream logic (`archetype || undefined`, anchor parsing) is unchanged.

No other files, no state-shape changes, no behavior changes. Placeholder still shows correctly because the sentinel items render explicit labels ("Auto-select", "None").

## Verification

- Reload `/tenant/marketing?tab=agent` — page renders without ErrorBoundary.
- Open Archetype and Anchor selects, pick "Auto-select" / "None" and a real value; confirm launch payload matches prior behavior (archetype omitted when auto, no anchor ids when none).
