## Problem
The `provider_inquiries` table has policies for SELECT, INSERT (anon submit), and DELETE — but **no UPDATE policy**. When an admin changes status or saves notes, the mutation returns 0 rows affected (RLS blocks it silently) and the UI stays on the old value after refetch.

## Fix
Add a single migration that grants admins UPDATE access:

```sql
CREATE POLICY "Admins can update provider inquiries"
ON public.provider_inquiries
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
```

## Optional small UX hardening (frontend)
In `AdminInquiries.tsx`, also stamp `handled_by` / `handled_at` on the client when status changes away from `new`, so the "handled at" timestamp under the status badge populates correctly:

- On status change: include `handled_at: new Date().toISOString()` and `handled_by: user.id` in the patch.

No other changes — RLS unblock is the actual fix.
