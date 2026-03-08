

## Phase: Add Helper Text to Career Path Mapping Form

### Problem
The Career Path mapping inputs in the Ecosystem settings lack clear guidance, making it hard for admins to know what values to enter for `external_path_id` and `external_module_id`.

### Changes

#### `src/pages/admin/AdminEcosystem.tsx`

1. Update the `external_path_id` input placeholder to `"e.g. cdl-class-a or path-001"`.
2. Update the `external_module_id` input placeholder to `"e.g. module-safety-101 (optional)"`.
3. Add a small `<p>` helper paragraph below the mapping form inputs explaining these are IDs from the external LMS or custom identifiers agreed upon between systems.

No backend or migration changes needed.

