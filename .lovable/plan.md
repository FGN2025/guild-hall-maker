

## Add "Contact Us" form to the For Providers page

### Summary
Add a second CTA button ("Schedule a Meeting") in the hero section next to the existing "Get Started" button, and a new contact form section at the bottom of the page where broadband providers can submit their details to request a meeting.

### Changes

**1. Database: Create `provider_inquiries` table**
- Columns: `id`, `first_name`, `last_name`, `email`, `phone`, `role` (dropdown: Broadband Operator, Marketing, Executive, Other), `message`, `preferred_date`, `preferred_time`, `created_at`
- No RLS needed beyond default deny — only inserts via edge function or anon insert policy
- Add an anon INSERT policy so the form works without authentication

**2. Update `src/pages/ForProviders.tsx`**
- Add a second button in the hero next to "Get Started — $850/mo":
  ```
  Schedule a Meeting (variant="outline", scrolls to #contact-form)
  ```
- Add a new "Contact Us" section (`id="contact-form"`) between the signup form section and the footer, containing:
  - Full Name (first + last in a row)
  - Email (required)
  - Phone (optional)
  - "I am a…" dropdown (Broadband Operator, Marketing Director, Executive, Other)
  - Message textarea
  - Preferred Date + Time fields (optional)
  - Submit button
- On submit: insert into `provider_inquiries` table, show success toast
- Use zod validation consistent with existing form patterns

### Files touched
| File | Change |
|------|--------|
| Migration | Create `provider_inquiries` table with anon insert policy |
| `src/pages/ForProviders.tsx` | Add hero button + contact form section |

