

## Restrict Ticker Width to Match Header

### Change
Update `src/components/TickerEmbed.tsx` to wrap the embed div inside a `container mx-auto px-4` wrapper, matching the Navbar's layout constraints.

### Technical Detail
In `TickerEmbed.tsx`, change the return JSX from:
```tsx
<section className="w-full">
  <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
</section>
```
to:
```tsx
<section className="w-full">
  <div className="container mx-auto px-4">
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
  </div>
</section>
```

This single-file change ensures the ticker content aligns with the header width on all screen sizes.

