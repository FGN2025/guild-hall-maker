

# Test Plan: New User Registration Workflows

This plan covers end-to-end testing of the three onboarding paths built so far. No code changes are needed -- this is a manual QA checklist to execute against the live preview.

---

## Prerequisites (Setup Before Testing)

Before running the tests, ensure the following data exists in the backend:

1. **At least one active tenant** with ZIP codes assigned in `tenant_zip_codes` (e.g., ZIP `12345` mapped to "Acme Broadband").
2. **A second tenant** mapped to the same ZIP (to test the multi-provider dropdown).
3. **One tenant with `require_subscriber_validation = true`** (toggle via Admin > Tenants).
4. **A matching subscriber record** in `tenant_subscribers` for that tenant (e.g., first_name: "Jane", last_name: "Doe", zip_code: "12345").
5. **An active bypass code** in `bypass_codes` (e.g., code `TEST2026`).
6. **A ZIP code with no tenant coverage** (e.g., `99999` or any valid US ZIP not in `tenant_zip_codes`).

---

## Test 1: Happy Path -- Single Provider, No Subscriber Validation

1. Navigate to `/auth` and click "Don't have an account? Sign up."
2. Enter a ZIP code that maps to exactly **one** tenant (with `require_subscriber_validation = false`).
3. Click **Verify Location**.
4. **Expected**: Green success message appears. The single provider is auto-selected and displayed (name + logo).
5. Click **Continue**.
6. **Expected**: Account creation form appears (Display Name, Email, Password, Terms).
7. Fill in valid details and submit.
8. **Expected**: "Check your email to confirm your account!" toast. A lead is created in `user_service_interests` for that tenant only.

## Test 2: Happy Path -- Multiple Providers, Select ISP

1. Enter a ZIP code that maps to **two or more** tenants.
2. Click **Verify Location**.
3. **Expected**: Green success message + a dropdown labeled "Select your provider" appears.
4. Try clicking **Continue** without selecting a provider.
5. **Expected**: Button is disabled (providers exist but none selected).
6. Select a provider from the dropdown.
7. Click **Continue**.
8. **Expected**: Proceeds to account form (or subscriber verification if that tenant requires it).

## Test 3: Subscriber Verification -- Valid Match

1. Enter a ZIP mapped to a tenant that has `require_subscriber_validation = true`.
2. Verify location, select that provider, click Continue.
3. **Expected**: "Verify Subscriber" step appears with First Name, Last Name, and optional Account Number fields.
4. Enter the matching name from `tenant_subscribers` (e.g., "Jane" / "Doe").
5. Click **Verify & Continue**.
6. **Expected**: Proceeds to account creation form.

## Test 4: Subscriber Verification -- No Match

1. Repeat Test 3 setup but enter a **non-matching** name (e.g., "Fake" / "Person").
2. Click **Verify & Continue**.
3. **Expected**: Red error: "We couldn't find a matching subscriber record. Please check your information and try again."
4. Click "Back to provider selection".
5. **Expected**: Returns to the ZIP/provider step with prior data intact.

## Test 5: No Providers -- Fallback Invite Code

1. Enter a valid ZIP that has **no tenant coverage** (e.g., `90210` if not mapped).
2. Click **Verify Location**.
3. **Expected**: "No providers found in your area" info box. Invite code input + "Request Access" button appear. The **Continue** button is gone.
4. Enter the active bypass code (e.g., `TEST2026`).
5. Click **Verify**.
6. **Expected**: Proceeds to account creation form. The bypass code's `times_used` increments by 1.

## Test 6: No Providers -- Access Request Submission

1. Repeat the no-provider ZIP check from Test 5.
2. Instead of entering a code, click **Request Access**.
3. **Expected**: Form expands with Name and Email fields.
4. Enter an email and click **Submit Request**.
5. **Expected**: Green confirmation: "Request Submitted!" with instructions to return later with an invite code.
6. Verify in the backend that a new row exists in `access_requests` with status `pending`.
7. Verify admin users received an in-app notification linking to `/admin/access-requests`.

## Test 7: Admin Approves Access Request

1. Log in as a Super Admin and navigate to **Admin > Access Requests**.
2. **Expected**: The pending request from Test 6 appears in the table.
3. Click **Approve**.
4. **Expected**: A single-use bypass code is generated in `bypass_codes`. The request status changes to `approved`. An approval email is sent to the requester with the code.
5. Log out. Return to `/auth`, sign up, enter the same no-coverage ZIP, and use the newly generated code.
6. **Expected**: Code validates and user proceeds to account creation.

## Test 8: Upfront Bypass Code (Pre-Check)

1. On the signup ZIP step, enter any ZIP code **and** an invite code in the "Invite Code (optional)" field before clicking Verify Location.
2. Click **Verify Location**.
3. **Expected**: If the bypass code is valid, registration proceeds regardless of ZIP coverage. The provider selection and subscriber verification steps are skipped entirely.

## Test 9: Admin Toggle for Subscriber Validation

1. Log in as Super Admin, go to **Admin > Tenants**.
2. Find a tenant and toggle "Require subscriber validation" **on**.
3. **Expected**: The `require_subscriber_validation` column updates to `true`.
4. Sign up as a new user selecting that tenant -- subscriber verify step should now appear.
5. Toggle it **off** and repeat -- subscriber verify step should be skipped.

---

## Edge Cases to Verify

- **Invalid ZIP** (e.g., `00000` or `ABCDE`): Smarty API should reject it with an error message.
- **Expired bypass code**: Should return "Invalid or expired invite code."
- **Maxed-out bypass code** (`times_used >= max_uses`): Should also fail validation.
- **Duplicate access request**: Submitting the same email + ZIP twice should either succeed silently or show a clear message.
- **Display name already taken**: The "Already taken" indicator should appear and block account creation.

