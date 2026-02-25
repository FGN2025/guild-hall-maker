

## Update Demo Prize Values to 10%

Three files contain hardcoded prize amounts that need to be reduced to 10% of their current values:

### 1. `src/components/FeaturedTournaments.tsx`
- Apex Legends Showdown: `$5,000` → `$500`
- Valorant Masters Cup: `$10,000` → `$1,000`
- Rocket League Blitz: `$2,500` → `$250`

### 2. `src/components/HeroSection.tsx`
- Total Prize Pool stat: `$85K` → `$8.5K`

### 3. `src/pages/Terms.tsx`
- Tax threshold reference (`$600`) -- this is a legal/IRS reference, not a demo prize, so it will **not** be changed.

