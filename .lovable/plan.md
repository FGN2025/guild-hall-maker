

# Add Help Tooltip to Subscriber Validation Toggle

## Change

Add an `Info` icon with a tooltip next to the "Require subscriber validation on signup" label explaining what the toggle does.

## File: `src/pages/admin/AdminTenants.tsx`

- Import `Info` from `lucide-react` and `Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider` from the tooltip component
- After the `Label`, add a `Tooltip`-wrapped `Info` icon (h-3.5 w-3.5, text-muted-foreground) with content explaining: "When enabled, new users selecting this provider during signup must verify their identity against the subscriber registry (name + account number) before completing registration."

Single-line addition next to the existing label, no structural changes.

