

## Add "Data Center" Game to the Catalog

### What
Insert a new game record for "Data Center" — a data center technician simulation game on Steam that will be used for building challenges.

### Details
- **Name**: Data Center
- **Slug**: data-center
- **Category**: General (simulation-style; no exact "Simulation" category exists in the current list)
- **Steam App ID**: 4170200
- **Platform Tags**: PC
- **is_active**: true
- **display_order**: 46 (next after current max of 45)
- **Description**: A data center technician simulation game where players manage and maintain data center infrastructure.

### Implementation
Single SQL INSERT into the `games` table using the data insert tool. No code changes needed.

```sql
INSERT INTO games (name, slug, category, steam_app_id, platform_tags, is_active, display_order, description)
VALUES (
  'Data Center',
  'data-center',
  'General',
  '4170200',
  ARRAY['PC'],
  true,
  46,
  'A data center technician simulation game where players build, manage, and maintain data center infrastructure. Available on Steam.'
);
```

