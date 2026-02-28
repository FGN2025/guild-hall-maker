

## Prevent Duplicate Display Names at Registration

### Problem
Currently, multiple users can register with the same display name. There is no uniqueness check on the `display_name` column in the `profiles` table, and no validation during signup.

### Solution
Add a two-layer defense:

1. **Database: Add a unique index on `display_name`** (case-insensitive) so duplicates are impossible at the data level.
2. **Frontend: Real-time availability check** during registration so users get immediate feedback before submitting.

### Changes

#### 1. Database Migration
- Add a unique index on `LOWER(display_name)` to the `profiles` table (case-insensitive uniqueness)
- This prevents duplicates even if the frontend check is bypassed

```sql
CREATE UNIQUE INDEX idx_profiles_display_name_lower
ON public.profiles (LOWER(display_name))
WHERE display_name IS NOT NULL;
```

#### 2. Frontend -- `src/pages/Auth.tsx`
- After the user types a display name (on blur or with a debounce), query the `profiles` table to check if that name is already taken:
  ```typescript
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("display_name", displayName.trim())
    .limit(1);
  ```
- Show a red "This name is already taken" or green "Available" indicator next to the Display Name field
- Block form submission if the name is taken
- Also make the Display Name field **required** for signup (currently optional)

### Technical Details

**Files modified:**
- `src/pages/Auth.tsx` -- add availability check with debounced query, validation message, and require the field

**Database change:**
- One migration adding a partial unique index on `LOWER(display_name)` (partial because `display_name` can be NULL for legacy rows)

