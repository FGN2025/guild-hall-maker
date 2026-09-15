-- Sync dispatcher signing secret to the user-entered webhook signing secret value
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'ecosystem_dispatch_secret'),
  '1896c118d8d955023865edef52637ed565a002bc66372d9d7ef85a0204b6ef91'
);