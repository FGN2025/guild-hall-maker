

## Add Discord Server Secrets

Two secrets need to be stored so the backend function can automatically assign the "Verified Player" role when players link their Discord accounts.

### Secrets to Add

1. **DISCORD_GUILD_ID** -- Your FGN Discord server ID (the number from the URL: `989943710013870140`)
2. **DISCORD_VERIFIED_ROLE_ID** -- The role ID you copied from Server Settings

### What Happens

No code changes are needed. The existing backend function already checks for these two values and uses them to call the Discord API. Once stored, any player who links their Discord will automatically receive the "Verified Player" role in your server.

### Prerequisite Check

Before adding: confirm the bot's role is positioned **above** the "Verified Player" role in your Discord server's role hierarchy (Server Settings > Roles -- drag the bot role higher than the Verified Player role). Without this, Discord will reject the role assignment silently.

