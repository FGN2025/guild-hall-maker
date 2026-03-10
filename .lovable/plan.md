

## Remove "+" Signs from Player and Tournament Stats

Single-line change in `src/components/HeroSection.tsx` (lines 108-109):

Remove the trailing `+` from the Players and Tournaments value strings:
- Line 108: `${stats.players.toLocaleString()}+` → `${stats.players.toLocaleString()}`
- Line 109: `${stats.tournaments.toLocaleString()}+` → `${stats.tournaments.toLocaleString()}`

