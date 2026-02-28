

## Update Discord Client Secret

### What we'll do

Update the `DISCORD_CLIENT_SECRET` backend secret with the new value you provided: `d52dca7308c6ab4d0bc8d1ae54453490303951442220703f259e3111717c8def`

After updating, we'll test the Discord OAuth callback to confirm the `invalid_client` error is resolved.

### Steps

1. Update the `DISCORD_CLIENT_SECRET` secret with the new value
2. Test the edge function to verify the token exchange no longer returns `invalid_client`

### Important Note

For security, you should avoid sharing secrets in plain text in chat. Once this is working, consider resetting the secret in the Discord Developer Portal and updating it through the secure secrets prompt.

