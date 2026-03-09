

## Plan: Simplify Navbar for Public/Unauthenticated Users

You're absolutely right — since unauthenticated users can only browse Tournaments and Challenges, showing the full 13-item nav menu is misleading and cluttered. After login, users get the sidebar anyway, making the full navbar redundant.

### Change

**`src/components/Navbar.tsx`** — Make the nav items conditional based on auth state:

- **Not logged in**: Show only **Tournaments**, **Challenges**, **Sign In**, and **Join Now**
- **Logged in** (navbar still visible on Index page and PublicLayout routes): Show the full nav items as today, since the navbar appears on the landing page even for authenticated users

This is achieved by filtering `navItems` based on `!!user`:

```typescript
const publicNavItems = [
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/challenges", label: "Challenges", icon: Target },
];

// In render: use user ? navItems : publicNavItems
```

Both desktop and mobile nav sections will use the same conditional list.

### Files

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Filter nav items to 2 for unauthenticated users |

**1 file, minimal change. No risk.**

