

## Fix Display Name Typo

**Current value:** `Brian Downden`
**Correct value:** `Brian Dowden`

### Action
Run a single data update on the `profiles` table:

```sql
UPDATE profiles
SET display_name = 'Brian Dowden'
WHERE id = 'b9d476cf-7d14-488e-ae76-29132301f7c3';
```

No schema changes or code changes required.

