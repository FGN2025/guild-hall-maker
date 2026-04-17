

## Add "The Farmer Was Replaced" to Games Catalog

### What
Insert a new game record for "The Farmer Was Replaced" — a programming/automation farming simulation on Steam.

### Details
- **Name**: The Farmer Was Replaced
- **Slug**: the-farmer-was-replaced
- **Category**: Simulation (closest match from existing categories)
- **Steam App ID**: 2060160
- **Platform Tags**: PC
- **is_active**: true
- **display_order**: 47 (next after Data Center at 46)
- **Description**: A programming and automation farming simulation by Timon Herzog / Metaroot where players write code to control a drone that automates farming tasks.

### Implementation
Single SQL INSERT into the `games` table using the data insert tool. No code changes needed.

```sql
INSERT INTO games (name, slug, category, steam_app_id, platform_tags, is_active, display_order, description)
VALUES (
  'The Farmer Was Replaced',
  'the-farmer-was-replaced',
  'Simulation',
  '2060160',
  ARRAY['PC'],
  true,
  47,
  'A programming and automation farming simulation by Timon Herzog / Metaroot. Players write code to control a drone that automates farming tasks — plant, harvest, and optimize using real programming logic.'
);
```

