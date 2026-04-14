

## Activate 6 CE Fiber Challenges

### Summary
Set `is_active = true` for the 6 CE fiber challenges using the database insert tool (UPDATE statement).

### SQL
```sql
UPDATE challenges
SET is_active = true
WHERE id IN (
  '034e8cf3-8832-4c05-a572-67af46dc9971',
  'c8298ef1-d359-4536-958f-533e66f7ee4a',
  '5e9ace81-fcc3-49f9-9013-5321d2e04d56',
  'd8b601c3-ff40-46c6-aa4b-55da7711c8ce',
  '57da5f29-5a4e-4148-a738-319e7a33252c',
  '4ce440c1-be75-4700-a8fa-4a80f6d1fbde'
);
```

### Scope
One UPDATE statement, no code changes.

