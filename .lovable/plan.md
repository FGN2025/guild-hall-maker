

# Update Notebook Connection with Real Credentials

## What will be done

### 1. Update the `OPEN_NOTEBOOK_PASSWORD` secret
The password has been corrected to `FGN2025!!` (two exclamation marks). The secret will be updated accordingly.

### 2. Replace the test connection in the database
Delete the existing placeholder connection (`https://httpbin.org / Test Notebook`) and insert the verified real connection:

| Field | Value |
|-------|-------|
| Name | FGN Esports Coach |
| API URL | `http://72.62.168.228:5055` |
| Notebook ID | `notebook:f8y4zed28cky7uibdoia` |
| Health Status | healthy |

### 3. Verify connectivity
After updating the secret, test the connection through the `notebook-proxy` edge function to confirm the new password works.

## Technical details

- Update `OPEN_NOTEBOOK_PASSWORD` secret to the corrected value `FGN2025!!`
- Delete test row (id: `8b5872cb-...`) from `admin_notebook_connections`
- Insert real connection row with pre-populated health status and timestamp
- Re-deploy `notebook-proxy` edge function to pick up the new secret value
- Run a health check call to verify end-to-end connectivity

