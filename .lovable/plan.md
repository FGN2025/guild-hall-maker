

## Update Database Tournament Prize Values to 10%

The hardcoded prizes on the homepage were already updated. Now the database-stored tournaments on the `/tournaments` page need the same treatment.

### Current Values and New Values

| Tournament | Current | New (10%) |
|---|---|---|
| Counter-Strike Pro League | $5,000 | $500 |
| League of Legends Championship | $8,000 | $800 |
| Minecraft Invitational | $1,000 | $100 |
| Test Championship | $5,000 | $500 |
| Test Tournament | $1,000 | $100 |
| Email Test Tournament | $100 | $10 |

### Implementation

Run a single SQL migration to update the `prize_pool` column for all six tournaments with their new 10% values.

