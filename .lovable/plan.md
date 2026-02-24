
# Update Branding in index.html

Replace all default "Lovable" branding with FGN branding across the `index.html` file.

## Changes (single file: `index.html`)

| Tag | Current Value | New Value |
|-----|--------------|-----------|
| `<title>` | Lovable App | FGN - Fibre Gaming Network |
| `meta[name="description"]` | Lovable Generated Project | Competitive gaming tournaments, leaderboards, and community for the Fibre Gaming Network |
| `meta[name="author"]` | Lovable | Fibre Gaming Network |
| `meta[property="og:title"]` | Lovable App | FGN - Fibre Gaming Network |
| `meta[property="og:description"]` | Lovable Generated Project | Competitive gaming tournaments, leaderboards, and community for the Fibre Gaming Network |
| `meta[name="twitter:title"]` | Lovable App | FGN - Fibre Gaming Network |
| `meta[name="twitter:description"]` | Lovable Generated Project | Competitive gaming tournaments, leaderboards, and community for the Fibre Gaming Network |
| `meta[name="twitter:site"]` | @Lovable | @FibreGaming (or remove if no Twitter handle exists) |

The OG/Twitter image URLs will remain unchanged (they point to the current preview screenshot). These can be updated later with a custom FGN branded social image.

## Technical Details

All changes are in `index.html` lines 6-24. No other files need modification.
