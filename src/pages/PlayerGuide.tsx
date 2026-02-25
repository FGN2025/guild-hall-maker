import { useState, useMemo, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Trophy,
  CalendarDays,
  Gamepad2,
  Users,
  Shield,
  BarChart3,
  Swords,
  Award,
  BrainCircuit,
  Settings,
  UserPlus,
  Search,
  ArrowUp,
  Printer,
  Image,
  Cookie,
} from "lucide-react";

const sectionData: { id: string; icon: typeof Shield; title: string; bullets: string[] }[] = [
  {
    id: "getting-started",
    icon: UserPlus,
    title: "Getting Started",
    bullets: [
      "Sign Up — Create your account using your email address. You'll receive a verification email before you can sign in.",
      "ZIP Code Check — During registration, enter your ZIP code to see if a broadband provider in the FGN network serves your area. If a match is found, you'll be connected automatically.",
      "Bypass Codes — If you have a special bypass code (from staff or an event), you can skip ZIP verification entirely.",
      "Set Your Profile — Head to Profile Settings to choose a display name, gamer tag, and avatar. Your gamer tag is how other players recognize you on leaderboards, brackets, and community posts.",
      "Explore — Use the sidebar to navigate between tournaments, games, the community forum, leaderboard, and more.",
      "Tip: Pick a memorable gamer tag early — it shows up everywhere on the platform.",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    bullets: [
      "Your Dashboard is your personal command center, showing everything at a glance.",
      "Stats Cards — See your total wins, losses, tournaments played, and current season points.",
      "Registered Tournaments — View upcoming tournaments you've signed up for with quick links to details and brackets.",
      "Recent Matches — Review your latest match results including scores, opponents, and outcomes.",
      "Quick Navigation — Jump to any section of the platform directly from the dashboard.",
    ],
  },
  {
    id: "tournaments",
    icon: Trophy,
    title: "Tournaments",
    bullets: [
      "Tournaments are the heart of FGN — compete, earn points, and climb the leaderboard.",
      "Browse — View all available tournaments with their game, format, prize pool, entry fee, and participant count.",
      "Search & Filter — Use the search bar and filters to find tournaments by game, status (Upcoming, Open, In Progress, Completed), or format.",
      "Register — Click on a tournament to view its full details (rules, description, prize pool), then hit Register to join. You can unregister before the tournament starts.",
      "Tournament Detail Pages — Each tournament has a dedicated page at /tournaments/:id with all information, registration controls, and bracket links. These URLs are shareable.",
      "Brackets — Once a tournament is in progress, view the live single-elimination bracket to see matchups, scores, and results. Winners advance automatically.",
      "Create Your Own — Click Create Tournament to set up your own event with game, format, max participants, rules, prize pool, entry fee, date/time, and hero image.",
      "Editing — Tournament creators can update details after creation via the Edit dialog.",
      "Season Points — Points are awarded automatically when a tournament completes, based on your placement.",
      "Tip: Register early — popular tournaments fill up fast!",
    ],
  },
  {
    id: "calendar",
    icon: CalendarDays,
    title: "Calendar",
    bullets: [
      "The Calendar (/calendar) gives you a visual monthly overview of all scheduled tournaments.",
      "Monthly View — See which tournaments are happening on each day of the month at a glance.",
      "Quick Details — Click on any tournament event to see its details and jump directly to the full tournament page.",
      "Planning — Use the calendar to plan your schedule and avoid conflicts between tournaments.",
    ],
  },
  {
    id: "games",
    icon: Gamepad2,
    title: "Games",
    bullets: [
      "Browse the FGN game catalog to discover all supported titles.",
      "Game Cards — Each game shows its cover art, category, and platform tags (PC, Console, Mobile, etc.).",
      "Categories — Games are organized by genre: FPS, Battle Royale, Sports, Fighting, MOBA, MMORPG, RPG, Card Game, Racing, Simulation, Strategy, Party, Puzzle, Adventure, and more.",
      "Game Details — Click into a game to see its full description and guide content (markdown-formatted tips and strategies).",
      "Related Tournaments — Game detail pages show tournaments linked to that specific game.",
      "Tip: Game guides feed directly into the AI Coach — the more guide content available, the better coaching advice you'll get.",
    ],
  },
  {
    id: "community",
    icon: Users,
    title: "Community Forum",
    bullets: [
      "The Community forum (/community) is where players connect, share tips, and discuss games.",
      "Create a Topic — Start a new discussion thread by choosing a category and writing your post.",
      "Categories — Topics are organized into categories like General, Strategy, LFG (Looking for Group), and more for easy browsing.",
      "Reply — Join existing conversations by adding your thoughts to any topic. Discussions are fully threaded.",
      "Like — Show appreciation for great posts by hitting the like button.",
      "Pinned Topics — Pinned topics at the top often contain important announcements — check them first!",
      "Sharing — Share comparison links, tournament results, and coaching insights directly in the forum.",
    ],
  },
  {
    id: "leaderboard",
    icon: Shield,
    title: "Leaderboard",
    bullets: [
      "See how you stack up against other players on the Leaderboard (/leaderboard).",
      "All-Time Rankings — View the overall leaderboard based on cumulative performance across all seasons.",
      "Seasonal Rankings — Switch to the current season to see who's on top right now.",
      "Sort Options — Sort by points, wins, or win rate to find the metrics that matter most to you.",
      "Time Filters — Filter rankings by time period (7 days, 30 days, 90 days) for recent performance snapshots.",
      "Game & Tournament Filters — Narrow down rankings by specific games or tournaments.",
      "Search — Use client-side search to quickly find specific players by name or gamer tag.",
      "Player Profiles — Click on any player to view their full profile, detailed stats, and match history.",
      "Real-Time Updates — Rankings update in real time as tournament results are recorded.",
    ],
  },
  {
    id: "season-stats",
    icon: BarChart3,
    title: "Season Stats",
    bullets: [
      "Track your performance across seasons with detailed analytics at /season-stats.",
      "Season Overview — See your points, wins, losses, and tournaments played for the current active season.",
      "Visual Charts — Performance charts show your progression and trends over time.",
      "Historical Data — Compare your performance across past seasons to track your growth.",
      "Season Snapshots — When a season ends, your final rank and stats are preserved as a historical snapshot.",
      "Export — Season stats can be exported for offline analysis and record-keeping.",
    ],
  },
  {
    id: "compare",
    icon: Swords,
    title: "Compare Players",
    bullets: [
      "Go head-to-head with any player to compare stats side by side at /compare.",
      "Select Players — Search for and select two players to compare using the player selector.",
      "Side-by-Side Stats — View wins, losses, points, win rate, and other metrics in a clear comparison layout.",
      "Radar Chart — A radar chart visualization highlights strengths and weaknesses across multiple dimensions.",
      "Head-to-Head History — See direct match results if the two players have faced each other in tournaments.",
      "Shareable URLs — Comparison states are saved in the URL query parameters, so you can copy and share the link with friends or on the community forum.",
      "Persistent State — Navigating away and coming back preserves your comparison via the URL.",
    ],
  },
  {
    id: "achievements",
    icon: Award,
    title: "Achievements & Badges",
    bullets: [
      "Earn badges and unlock achievements as you compete and grow.",
      "Milestone Tiers — Achievements come in four tiers: Bronze, Silver, Gold, and Platinum, representing increasing levels of accomplishment.",
      "Progress Tracking — Many achievements track your progress automatically (e.g., 'Win 10 matches' shows 7/10) so you can see how close you are.",
      "Auto-Criteria — Milestones based on wins, streaks, matches played, win rate, tournament championships, and more are evaluated automatically when you view your profile.",
      "Special Recognition — Admins can award unique 'Special Recognition' badges for outstanding contributions or sportsmanship, displayed with distinctive purple styling and sparkle icons.",
      "Award Notes — Special badges may include a personal note from the admin explaining why they were awarded.",
      "Achievements Leaderboard — See who has earned the most badges across the platform.",
      "Tip: Check the Achievements page regularly — new achievements may be added each season!",
    ],
  },
  {
    id: "ai-coach",
    icon: BrainCircuit,
    title: "AI Coach",
    bullets: [
      "Get personalized coaching and tips from your AI esports assistant.",
      "Access — Click the AI Coach link in the sidebar, or use the floating coach button (FAB) in the bottom-right corner of any page.",
      "Game Selection — Choose a specific game from the prominent dropdown to get advice tailored to that title's mechanics and meta. The coach uses category-specific frameworks (Shooter, MOBA, Fighting, etc.).",
      "Ask Anything — Ask about strategies, game mechanics, tournament preparation, team compositions, counter-picks, or anything gaming-related.",
      "Knowledge Sources — The coach's advice is grounded in game-specific guides and external knowledge bases for accurate, up-to-date information.",
      "Streaming Responses — Replies stream in real time for a natural conversational experience.",
      "Context-Aware Suggestions — The coach offers category-specific conversation starters based on your selected game.",
      "Conversation History — Your past conversations are saved automatically so you can revisit previous coaching sessions anytime.",
      "Export Sessions — Export coaching conversations as .md or .pdf files for offline reference.",
      "Tip: The more specific your question, the better the coaching advice. Include game name, situation, and what you've already tried.",
    ],
  },
  {
    id: "player-profile",
    icon: Users,
    title: "Player Profiles",
    bullets: [
      "Every player has a public profile page accessible from the leaderboard, brackets, or community posts.",
      "Stats Grid — View key performance metrics including wins, losses, win rate, points, and tournaments played.",
      "Match History — A detailed table of recent matches showing opponents, scores, and outcomes.",
      "Rank Progression — A chart showing how your rank has changed over time across seasons.",
      "Achievements Display — All earned badges are showcased on your profile, including special recognition awards.",
      "Head-to-Head List — See your most frequent opponents and your record against each one.",
      "Automatic Updates — Your profile stats update in real time as you participate in tournaments.",
    ],
  },
  {
    id: "profile-settings",
    icon: Settings,
    title: "Profile Settings",
    bullets: [
      "Manage your account and personalize your profile from the Profile Settings page.",
      "Display Name — Set the name that appears on your profile, in community posts, and in match results.",
      "Gamer Tag — Your unique identifier shown on leaderboards, tournament brackets, and player comparisons.",
      "Avatar — Upload a profile picture to make your account stand out across the platform.",
      "ZIP Code — Update your ZIP code to ensure correct broadband provider matching.",
      "Password — Use the password reset flow to update your login credentials securely.",
    ],
  },
  {
    id: "media-library",
    icon: Image,
    title: "Media Library",
    bullets: [
      "The Media Library (/media) provides access to platform images and assets.",
      "Browse — View uploaded images organized by category and tags.",
      "AI Image Generation — Generate custom images using built-in AI capabilities for your creative needs.",
      "Usage — Images from the library can be used for tournament hero images and other platform content.",
    ],
  },
];

const PlayerGuide = () => {
  const [search, setSearch] = useState("");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sections = useMemo(() =>
    sectionData.map((s) => ({
      ...s,
      content: (
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          {s.bullets.map((b, i) => {
            const dashIdx = b.indexOf(" — ");
            if (dashIdx > 0) {
              return (
                <li key={i}>
                  <strong className="text-foreground">{b.slice(0, dashIdx)}</strong>
                  {" — "}{b.slice(dashIdx + 3)}
                </li>
              );
            }
            return <li key={i}>{b}</li>;
          })}
        </ul>
      ),
    })),
  []);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.bullets.some((b) => b.toLowerCase().includes(q))
    );
  }, [search, sections]);

  const handlePrint = () => {
    const sectionBlocks = sectionData
      .map((s) => {
        const items = s.bullets.map((b) => `<li>${b}</li>`).join("");
        return `<div class="section"><h2>${s.title}</h2><ul>${items}</ul></div>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Player Guide — FGN</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}
  h1{font-size:24px;margin-bottom:2px} h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}
  .section{page-break-inside:avoid;margin-bottom:16px}
  ul{padding-left:20px;margin:4px 0} li{margin:4px 0}
  @media print{body{padding:20px}}
</style></head><body>
<h1>Player Guide</h1>
<p style="color:#888;font-size:12px">Everything you need to know about using FGN — from account setup to climbing the leaderboard.</p>
${sectionBlocks}
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider gradient-text mb-2">
            Player Guide
          </h1>
          <p className="text-muted-foreground">
            Everything you need to know about using FGN — from account setup to climbing the leaderboard.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0 gap-2">
          <Printer className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredSections.length > 0 && (
        <nav className="glass-panel rounded-lg px-4 py-3">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-widest text-primary mb-2">Table of Contents</h2>
          <ul className="columns-2 gap-x-6 text-sm space-y-1">
            {filteredSections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#section-${s.id}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <s.icon className="h-3.5 w-3.5 shrink-0" />
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {filteredSections.length > 0 ? (
        <div className="glass-panel rounded-lg p-4 md:p-6">
          <Accordion type="multiple" defaultValue={search.trim() ? filteredSections.map(s => s.id) : []} key={search} className="space-y-1">
            {filteredSections.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                id={`section-${section.id}`}
                className="border-border/50 scroll-mt-4"
              >
                <AccordionTrigger className="hover:no-underline gap-3 text-left">
                  <span className="flex items-center gap-3">
                    <section.icon className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-display font-semibold tracking-wide">{section.title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pl-8">
                  {section.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">No results found for &ldquo;{search}&rdquo;</p>
      )}

      {showTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default PlayerGuide;
