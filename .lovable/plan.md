

## Update Discord Credentials for New App

### Overview
Replace the old Discord Client ID in the database and update the backend secrets with credentials from the new Discord application.

### Steps

1. **Update the `discord_client_id` in `app_settings` table** with the new value: `1477107974810898502`

2. **Update backend secrets** (secure prompt for each):
   - `DISCORD_CLIENT_ID` -- the new Client ID
   - `DISCORD_CLIENT_SECRET` -- from the new app's OAuth2 page
   - `DISCORD_BOT_TOKEN` -- from the new app's Bot page

3. **Test the Discord linking flow** end-to-end to confirm the `invalid_client` error is resolved

### No Code Changes Required
The edge function and frontend code remain unchanged -- only the database setting and backend secrets need updating.

