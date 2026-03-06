

# Move FGN Ecosystem Links from Sidebar to Ecosystem Page

## Change

Remove the "FGN Ecosystem" section (Play, Manage, Hub magic-link buttons) from `AdminSidebar.tsx` and add them as a new card section inside `AdminEcosystem.tsx`.

## Files

| File | Change |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | Remove lines 25-29 (ecosystemApps array), lines 3 (useEcosystemAuth import), lines 33 (hook call), and lines 66-85 (the FGN Ecosystem section + buttons). Remove unused `ExternalLink` and `Loader2` icon imports. |
| `src/pages/admin/AdminEcosystem.tsx` | Add a new "FGN Ecosystem Apps" card at the top with three buttons (Play, Manage, Hub) that call `useEcosystemAuth().requestMagicLink`. Each button shows the app name with an `ExternalLink` icon and a loading spinner when clicked. |

