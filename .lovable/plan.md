

## Duplicate For Providers page at /4-providers

### Summary
Add a route alias so `/4-providers` serves the same page as `/for-providers`, fixing the incorrect link from the email campaign.

### Changes

**`src/App.tsx`**
- Add one new `<Route>` entry right after the existing `/for-providers` route:
  ```tsx
  <Route path="/4-providers" element={<ForProviders />} />
  ```

That's it — no new files needed. Both URLs will render the same component.

