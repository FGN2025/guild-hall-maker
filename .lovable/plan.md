
## Widen Featured Video to Match Ticker and Header

The Featured Video section is currently capped at `max-w-4xl` (896px), while the ticker and header use the full `container` width. This makes the video noticeably narrower.

### Change
Remove the `max-w-4xl` constraint from the Featured Video component so it uses the same `container mx-auto px-4` layout as the ticker -- matching widths across all three sections.

### Technical Detail
In `src/components/FeaturedVideo.tsx`, change the wrapper `div` class from `container mx-auto px-4 max-w-4xl` to `container mx-auto px-4` in both the loading skeleton and the main render.
