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
  Shield,
  Trophy,
  Swords,
  Star,
  Target,
  Gift,
  TrendingUp,
  Bell,
  Search,
  Printer,
  ArrowUp,
  Users,
  LayoutDashboard,
  Award,
} from "lucide-react";

const sectionData: { id: string; icon: typeof Shield; title: string; bullets: string[] }[] = [
  {
    id: "overview",
    icon: Shield,
    title: "Moderator Role Overview",
    bullets: [
      "Moderators manage the day-to-day competitive lifecycle of the FGN platform.",
      "Access — The Moderator Dashboard is available at /moderator. Admins and Super Admins also have full access.",
      "Scope — Moderators handle tournaments, match scoring, player points, challenges, ranked ladders, prize redemptions, and community moderation.",
      "Sidebar — Use the Moderator Dashboard sidebar to navigate between Dashboard, Tournaments, Matches, Points, Challenges, Achievements, Ladders, Redemptions, and this Guide.",
      "Role Assignment — Moderator roles are assigned by Admins via Admin → Users using the role dropdown (User, Moderator, Marketing, Admin).",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Moderator Dashboard",
    bullets: [
      "The Moderator Dashboard provides a quick overview of platform activity relevant to your role.",
      "Quick Stats — See counts of active tournaments, pending redemptions, open challenges, and active ladders at a glance.",
      "Recent Activity — Review recently completed matches and newly registered players.",
      "Quick Links — Jump directly to any moderator function from the dashboard.",
    ],
  },
  {
    id: "tournaments",
    icon: Trophy,
    title: "Tournament Management",
    bullets: [
      "Navigate to Moderator → Tournaments to manage the tournament lifecycle.",
      "Creating — Set name, game, format, date/time, max participants, description, rules, prize configuration, entry fee, and hero image (sourced from the Media Library).",
      "Multi-Date Scheduling — Create multiple tournament instances from a single dialog using the multi-date calendar picker. Each selected date generates a separate tournament with an auto-appended date suffix (e.g., 'Friday Night Fights — Mar 14').",
      "Prize Modes — Choose between 'None', 'Physical Prize' (linked to a Prize Shop item), or 'Value' (numeric points displayed as 'pts').",
      "Value Prizes — In Value mode, the prize pool is split among the top three finishers using configurable percentages (default 50 / 30 / 20) that must sum to 100%.",
      "Status Flow — Upcoming → Open (registration) → In Progress → Completed (or Cancelled).",
      "View Modes — Toggle between List and Grid views for the tournament index. Your preference is persisted via URL history-based routing.",
      "Registrations — View registered players, approve or remove registrations before tournament start.",
      "Bracket Generation — Generate single-elimination brackets once registration closes. Players are seeded and matched automatically.",
      "Reset Bracket — Before any matches are completed, you can reset the bracket to delete all match data and return to Open status for re-registration.",
      "Inline Match Scoring — Score matches directly from the bracket view; winners are advanced automatically and season points are awarded on completion.",
      "Editing — Update tournament details at any time via the Edit dialog. Hero images can be swapped from the Media Library.",
    ],
  },
  {
    id: "matches",
    icon: Swords,
    title: "Match Scoring",
    bullets: [
      "Navigate to Moderator → Matches to record match results.",
      "Score Entry — Select a tournament, then enter scores for each match in the bracket.",
      "Winner Advancement — Winners are advanced automatically to the next round when scores are submitted.",
      "Notifications — Both players receive automatic notifications when a match result is recorded.",
      "Validation — Match scores require both player scores to be entered before submission.",
      "Tip: Double-check scores before submitting — match results affect season points and leaderboard standings.",
    ],
  },
  {
    id: "points",
    icon: Star,
    title: "Points & Wallet System",
    bullets: [
      "Navigate to Moderator → Points to manage player season points.",
      "Two-Tier Wallet — Players have two balances: 'Points' (lifetime earned, used for rankings) and 'Points Available' (spendable balance for the Prize Shop).",
      "Point Adjustments — Award or deduct points manually with a required reason for audit tracking.",
      "Adjustment Types — Adjustments are categorized (bonus, penalty, correction) for reporting clarity.",
      "Player Notifications — When you award or deduct points, the affected player is automatically notified via in-app notification and email (if enabled). Award notifications say 'Points Awarded' with the amount and reason; deductions say 'Points Deducted'. No manual notification step is required.",
      "Season Scope — Points are tied to the currently active season.",
      "Audit Trail — All manual adjustments are logged with the moderator who made them and a timestamp.",
      "Automatic Awards — Tournament placement points are awarded automatically and don't need manual entry.",
      "Spending — Points are only deducted from 'Points Available' when a moderator approves a prize redemption; pending or denied requests leave the balance unchanged.",
      "Leaderboard Export — Moderators (and Admins) can export Seasonal or All-Time player rankings as CSV or PDF from the Leaderboard page using the export buttons next to the search filter.",
    ],
  },
  {
    id: "challenges",
    icon: Target,
    title: "Challenges & Quests",
    bullets: [
      "Navigate to Moderator → Challenges & Quests to create and manage work-order style challenges and quests.",
      "Creating — Set name, description, point reward, game link, difficulty level (Beginner / Intermediate / Advanced), estimated completion time, type (Daily, Weekly, Monthly, or One-Time), and start/end dates.",
      "Cover Images — Upload a cover image or select one from the Media Library to make each challenge visually distinct on the player-facing cards.",
      "AI-Enhanced Descriptions — Click the AI enhance button to automatically improve challenge descriptions for clarity and engagement using the platform's AI capabilities.",
      "Tasks — Build multi-step task checklists within a challenge. Players must complete each task and upload evidence per step.",
      "Evidence Requirement — Toggle 'Requires Evidence' to mandate that players upload screenshots or video highlights as proof of completion.",
      "Evidence Review — Switch to the 'Evidence Review' tab to see all submitted enrollments. Each evidence item is shown individually with its task label, media preview (image or video), and current status.",
      "Per-Evidence Review — Approve or reject individual evidence items with optional feedback notes. Players see the status (pending/approved/rejected) and your feedback on each piece of evidence.",
      "Enrollment Tracking — Players enroll in challenges and their status flows through: Enrolled → In Progress → Submitted → Completed (or Rejected for revision).",
      "Player Evidence — Players can upload image screenshots or video highlights per task. They can also delete evidence before submitting for review.",
      "Bulk Actions — Use 'Approve All & Complete' to approve the entire enrollment at once, or 'Reject Enrollment' to send all items back for revision.",
      "Approval — When you approve an enrollment, a completion record is created and points are awarded to the player's season score automatically.",
      "Rejection — Rejecting sends the enrollment back to the player with your per-evidence feedback so they know exactly what needs revision.",
      "Completions — The legacy completions tab still allows direct point awards for simpler challenges without evidence workflows.",
      "Notifications — When a new active challenge is created, all registered players are automatically notified with the challenge name and point reward.",
      "Max Enrollments — Optionally limit how many players can enroll in a challenge.",
      "Active/Inactive — Toggle challenges on or off without deleting them.",
      "Quests Tab — Switch to the 'Quests' tab on the same page to create and manage quests. Quests follow the identical workflow (enrollment, evidence, review, completion) but are tracked separately.",
      "Quest Chains — The 'Chains' tab lets you build sequential quest progressions. Create a chain with a name, description, story intro/outro text, cover image, bonus points, and an optional achievement link. Assign quests to chains and set their order.",
      "AI-Enhanced Narratives — Use the Sparkles (✨) button on story_intro and story_outro fields to auto-generate rich narrative text. If the quest's game has a linked notebook connection (Admin → Notebooks), the AI uses RAG to pull game-specific context for higher quality output.",
      "XP Rewards — Quests award XP in addition to season points. XP feeds into a five-tier rank system: Novice (0–99), Apprentice (100–299), Journeyman (300–599), Expert (600–999), Master (1000+).",
      "Chain Completion — When a player finishes all quests in a chain, bonus points and an optional achievement badge are awarded automatically via database triggers — no manual action required.",
      "Post-Publication Task Editing — Admins and Moderators can add, edit, reorder, and remove tasks on existing challenges via the Edit dialog accessible from the challenge detail page.",
      "Approval Notifications — When you approve a challenge submission, the player automatically receives an in-app notification confirming approval and the points earned.",
      "Tip: Challenges and quests with clear task checklists and evidence requirements drive the most meaningful engagement!",
    ],
  },
  {
    id: "achievements",
    icon: Award,
    title: "Achievements & Badges",
    bullets: [
      "Navigate to Moderator → Achievements to create, edit, and manage achievement definitions and award badges to players.",
      "Full CRUD — Create new achievement definitions with name, description, icon, category, tier (Bronze/Silver/Gold/Platinum), optional auto-criteria, and display order.",
      "Visual Icon Picker — Choose from 15+ Lucide icons (trophy, flame, star, crown, target, shield, swords, zap, medal, award, sparkles, heart, gem, bolt, rocket) with live icon previews in the selector.",
      "Editing & Deleting — Update any achievement definition or remove outdated ones. Changes are reflected immediately across the platform.",
      "Manual Awarding — Award any achievement to a player with optional notes. Use the bulk-assignment tool to award badges to multiple players at once.",
      "Quick Create — Define a new badge and award it to a player in a single streamlined flow.",
      "Revoking — Remove incorrectly awarded badges from player profiles.",
      "Special Recognition — Create custom 'Special Recognition' badges that display with distinctive purple styling and sparkle icons on player profiles.",
      "Auto-Criteria — Set up automatic milestones (wins, streaks, matches, win rate, tournament championships) that are evaluated when players view their profiles.",
      "Unified Icons — All achievement icons render as actual Lucide SVG icons everywhere on the platform for consistent visual presentation.",
      "Safety — A confirmation dialog prevents accidental awards.",
      "Tip: Coordinate with admins on achievement tiers to create clear progression paths for players.",
    ],
  },
  {
    id: "ladders",
    icon: TrendingUp,
    title: "Ranked Ladders",
    bullets: [
      "Navigate to Moderator → Ladders to create and manage ranked ladders.",
      "Creating — Set name, description, and optionally link to a specific game.",
      "Player Entries — Players join ladders themselves from the public Ladders page; moderators manage entries (update ratings, record wins/losses).",
      "ELO Ratings — Each player starts at 1000 ELO. Ratings update based on match outcomes.",
      "Live Leaderboard — Each ladder has a live leaderboard sorted by rating showing wins, losses, and rank with player avatars.",
      "Multiple Ladders — The platform supports many simultaneous ladders (e.g., per-game ladders).",
    ],
  },
  {
    id: "redemptions",
    icon: Gift,
    title: "Prize Redemptions",
    bullets: [
      "Navigate to Moderator → Redemptions to review prize redemption requests and manage the prize catalog.",
      "Two Tabs — The page is split into 'Redemption Requests' (review queue) and 'Prize Catalog' (manage prizes).",
      "Review Queue — See all pending redemption requests with player name, prize, point cost, status badge, and submission date.",
      "Actions — Approve, fulfill (mark as delivered), or deny redemption requests. Approved items show a 'Mark Fulfilled' button.",
      "Out-of-Stock Guard — If a prize has zero remaining stock, the Approve button is disabled and an 'Out of stock' warning appears.",
      "Balance Impact — Points are only deducted from the player's spendable balance ('Points Available') upon approval. Denying a request leaves the balance unchanged.",
      "Notifications — Players are automatically notified when their redemption status changes (approved, fulfilled, or denied).",
      "Prize Catalog — Create prizes with name, description, point cost, optional image upload, and available quantity.",
      "Edit Prizes — Update any prize field (name, description, cost, quantity, image) via the edit button on each card.",
      "Delete Prizes — Remove prizes from the catalog with a confirmation dialog to prevent accidental deletion.",
      "Toggle Active — Use the switch on each prize card to toggle prizes active/inactive without deleting them.",
      "Stock Tracking — Available quantity is tracked and displayed on each prize card ('X left' or 'Unlimited').",
    ],
  },
  {
    id: "game-servers",
    icon: Shield,
    title: "Game Server Awareness",
    bullets: [
      "Moderators do not manage game servers directly — server administration is handled by Admins via Admin → Game Servers.",
      "Server Directory — Players can browse dedicated game servers at /servers (or /game-servers). Each server card shows the game, IP address, live status, and max player count.",
      "Player Support — If a player reports connection issues, direct them to the Game Servers page to verify the server is online and copy the correct IP address.",
      "Live Status — Server cards display real-time online/offline indicators pulled from panel integrations (Pterodactyl/Shockbyte). A green dot means the server is reachable.",
      "Linking to Events — When creating tournaments or challenges, consider mentioning the relevant game server in the description so players know where to practice or compete.",
      "Tip: Familiarize yourself with the active servers so you can assist players quickly during tournaments and events.",
    ],
  },
  {
    id: "community",
    icon: Users,
    title: "Community Moderation",
    bullets: [
      "Moderators can manage community forum content to enforce standards.",
      "Pinned Topics — Pin important announcements or discussions to the top of the forum.",
      "Content Oversight — Monitor discussions for violations of the Acceptable Use Policy.",
      "Categories — Help organize discussions by guiding players to use appropriate categories.",
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notification System",
    bullets: [
      "The platform generates automatic notifications — no manual action is needed from moderators beyond normal workflows.",
      "Tournament Starting — When you change a tournament to 'In Progress', all registered players are notified.",
      "Match Completed — Both players are notified when you record a match result.",
      "Challenge Published — All players are notified when you create a new active challenge.",
      "Redemption Updates — Players are notified when you approve, fulfill, or deny a redemption.",
      "Challenge Approved — When a moderator approves a challenge enrollment, the player receives a notification with the challenge name and points awarded.",
      "Points Adjusted — When you award or deduct points from the Points page, the player receives an automatic in-app notification and email with the amount and reason.",
      "Achievement Earned — Players are notified when badges are awarded.",
      "Scheduled Reminders — A background job sends tournament reminders ~24 hours before start time.",
      "Email Notifications — Key events also trigger email alerts via the notification system.",
      "Tip: Just do your normal workflows — the notification system handles player communication automatically.",
    ],
  },
];

const ModeratorGuide = () => {
  const [search, setSearch] = useState("");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sectionData;
    const q = search.toLowerCase();
    return sectionData.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.bullets.some((b) => b.toLowerCase().includes(q))
    );
  }, [search]);

  const handlePrint = () => {
    const sectionBlocks = sectionData
      .map((s) => {
        const items = s.bullets.map((b) => `<li>${b}</li>`).join("");
        return `<div class="section"><h2>${s.title}</h2><ul>${items}</ul></div>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Moderator Guide</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}
  h1{font-size:24px;margin-bottom:2px} h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}
  .section{page-break-inside:avoid;margin-bottom:16px}
  ul{padding-left:20px;margin:4px 0} li{margin:4px 0}
  @media print{body{padding:20px}}
</style></head><body>
<h1>Moderator Guide</h1>
<p style="color:#888;font-size:12px">Reference documentation for platform moderators.</p>
${sectionBlocks}
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Moderator Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            Reference documentation for platform moderators.
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
        <nav className="border border-border rounded-lg bg-card/50 px-4 py-3">
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
        <Accordion type="multiple" defaultValue={search.trim() ? filteredSections.map(s => s.id) : []} key={search} className="space-y-2">
          {filteredSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              id={`section-${section.id}`}
              className="border border-border rounded-lg px-4 bg-card/50 scroll-mt-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-heading font-semibold text-base">
                    {section.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed">
                <ul className="list-disc pl-5 space-y-2">
                  {section.bullets.map((b, i) => {
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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

export default ModeratorGuide;
