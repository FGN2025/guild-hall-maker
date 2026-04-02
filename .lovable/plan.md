

## Add "Compete" Dropdown to Navbar

### Problem
Tournaments, Challenges, and Quests occupy three separate nav slots. The user wants them grouped into a single "Compete" dropdown in the navbar, while each page retains its own search/filter controls.

### Changes — `src/components/Navbar.tsx`

1. **Import** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu` and `ChevronDown` from lucide-react

2. **Define `competeItems`** array:
   - `{ to: "/tournaments", label: "Tournaments", icon: Trophy }`
   - `{ to: "/challenges", label: "Challenges", icon: Target }`
   - `{ to: "/quests", label: "Quests", icon: Compass }`

3. **Remove those three entries** from `navItems`, `authNavItems`, and `publicNavItems`

4. **Desktop nav**: Before the remaining flat links, render a `DropdownMenu`:
   - Trigger: styled like existing nav links, showing `Swords` icon + "Compete" + `ChevronDown`
   - Active highlight when pathname starts with `/tournaments`, `/challenges`, or `/quests`
   - Content: three `DropdownMenuItem` entries, each wrapping a `Link` with icon + label

5. **Mobile nav**: Replace the three separate links with a "Compete" group header (`text-xs uppercase text-muted-foreground`) and the three links indented with `pl-8`, keeping click-to-close behavior

### Files Changed

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Group 3 items into "Compete" dropdown on desktop; grouped section on mobile |

No changes to Tournaments, Challenges, or Quests pages — their filters remain as-is.

