

## Test: Notification Preferences Suppression for Redemption Updates

This is a browser-based end-to-end verification with no code changes needed. The database triggers already use the `should_notify()` function to check user preferences before creating notifications.

### Test Steps

1. **Navigate to Profile Settings** and find the Notification Preferences section
2. **Disable the "Prize Redemption Updates" in-app toggle** -- this sets `in_app_enabled = false` for `redemption_update` in the `notification_preferences` table
3. **Navigate to the Prize Shop** and submit a new prize redemption (award points first if needed via Moderator Points)
4. **Navigate to Moderator Redemptions** and approve or deny the new request
5. **Verify no in-app notification appears** in the notification bell -- the `notify_redemption_status` trigger checks `should_notify(user_id, 'redemption_update', 'in_app')` and skips the INSERT when disabled
6. **Re-enable the toggle** and repeat to confirm notifications resume

### How It Works (Technical)

The `should_notify()` database function queries `notification_preferences` for the user + type + channel. If a row exists with `in_app_enabled = false`, it returns `false` and the trigger skips the notification INSERT. If no row exists, it defaults to `true` (opt-in by default).

