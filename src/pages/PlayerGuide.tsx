import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "lucide-react";

const sections = [
  {
    id: "getting-started",
    icon: UserPlus,
    title: "Getting Started",
    content: (
      <>
        <p className="mb-3">Welcome to FGN! Here's how to set up your account and get rolling:</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Sign Up</strong> — Create your account using your email address. You'll be asked to verify your email before signing in.</li>
          <li><strong className="text-foreground">Set Your Profile</strong> — Head to <em>Profile Settings</em> to choose a display name, gamer tag, and avatar. Your gamer tag is how other players will recognize you.</li>
          <li><strong className="text-foreground">Explore</strong> — Use the sidebar to navigate between tournaments, games, the community forum, and more.</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground italic">
          Tip: Pick a memorable gamer tag early — it shows up on leaderboards, brackets, and community posts.
        </p>
      </>
    ),
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    content: (
      <>
        <p className="mb-3">Your Dashboard is your personal command center.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Stats Cards</strong> — See your wins, losses, tournaments played, and current season points at a glance.</li>
          <li><strong className="text-foreground">Registered Tournaments</strong> — View upcoming tournaments you've signed up for with quick links to details and brackets.</li>
          <li><strong className="text-foreground">Recent Matches</strong> — Review your latest match results including scores and opponents.</li>
        </ul>
      </>
    ),
  },
  {
    id: "tournaments",
    icon: Trophy,
    title: "Tournaments",
    content: (
      <>
        <p className="mb-3">Tournaments are the heart of FGN. Here's everything you need to know:</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Browse</strong> — View all available tournaments with their game, format, prize pool, and participant count.</li>
          <li><strong className="text-foreground">Search & Filter</strong> — Use the search bar and filters to find tournaments by game, status, or format.</li>
          <li><strong className="text-foreground">Register</strong> — Click on a tournament to view details, then hit <em>Register</em> to join. You can unregister before the tournament starts.</li>
          <li><strong className="text-foreground">Brackets</strong> — Once a tournament is in progress, view the live bracket to see matchups and results.</li>
          <li><strong className="text-foreground">Create</strong> — You can create your own tournaments by clicking the <em>Create Tournament</em> button. Set the game, format, max participants, rules, and prize pool.</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground italic">
          Tip: Register early — popular tournaments fill up fast!
        </p>
      </>
    ),
  },
  {
    id: "calendar",
    icon: CalendarDays,
    title: "Calendar",
    content: (
      <>
        <p className="mb-3">The Calendar gives you a visual overview of all scheduled tournaments.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Monthly View</strong> — See which tournaments are happening on each day of the month.</li>
          <li><strong className="text-foreground">Quick Details</strong> — Click on any tournament event to see its details and jump to the full tournament page.</li>
        </ul>
      </>
    ),
  },
  {
    id: "games",
    icon: Gamepad2,
    title: "Games",
    content: (
      <>
        <p className="mb-3">Browse the FGN game catalog to discover supported titles.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Game Cards</strong> — Each game shows its cover art, category, and platform tags.</li>
          <li><strong className="text-foreground">Game Details</strong> — Click into a game to see its description, guide content (if available), and related tournaments.</li>
          <li><strong className="text-foreground">Categories</strong> — Games are organized by category (FPS, Battle Royale, Sports, Fighting, etc.).</li>
        </ul>
      </>
    ),
  },
  {
    id: "community",
    icon: Users,
    title: "Community",
    content: (
      <>
        <p className="mb-3">The Community forum is where players connect, share tips, and discuss games.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Create a Topic</strong> — Start a new discussion thread by choosing a category and writing your post.</li>
          <li><strong className="text-foreground">Reply</strong> — Join existing conversations by adding your thoughts to any topic.</li>
          <li><strong className="text-foreground">Like</strong> — Show appreciation for great posts by hitting the like button.</li>
          <li><strong className="text-foreground">Categories</strong> — Topics are organized into categories like General, Strategy, LFG (Looking for Group), and more.</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground italic">
          Tip: Pinned topics at the top often contain important announcements — check them first!
        </p>
      </>
    ),
  },
  {
    id: "leaderboard",
    icon: Shield,
    title: "Leaderboard",
    content: (
      <>
        <p className="mb-3">See how you stack up against other players.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">All-Time Rankings</strong> — View the overall leaderboard based on cumulative performance.</li>
          <li><strong className="text-foreground">Seasonal Rankings</strong> — Switch to the current season to see who's on top right now.</li>
          <li><strong className="text-foreground">Sort & Filter</strong> — Sort by points, wins, or win rate to find the metrics that matter to you.</li>
          <li><strong className="text-foreground">Player Profiles</strong> — Click on any player to view their full profile, stats, and match history.</li>
        </ul>
      </>
    ),
  },
  {
    id: "season-stats",
    icon: BarChart3,
    title: "Season Stats",
    content: (
      <>
        <p className="mb-3">Track your performance across seasons with detailed analytics.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Season Overview</strong> — See your points, wins, losses, and tournaments played for the current season.</li>
          <li><strong className="text-foreground">Charts</strong> — Visual charts show your progression and performance trends over time.</li>
          <li><strong className="text-foreground">Historical Data</strong> — Compare your performance across past seasons to track your growth.</li>
        </ul>
      </>
    ),
  },
  {
    id: "compare",
    icon: Swords,
    title: "Compare Players",
    content: (
      <>
        <p className="mb-3">Go head-to-head with any player to compare stats side by side.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Select Players</strong> — Search for and select two players to compare.</li>
          <li><strong className="text-foreground">Side-by-Side Stats</strong> — View wins, losses, points, and other metrics in a clear comparison layout.</li>
          <li><strong className="text-foreground">Match History</strong> — See head-to-head results if the two players have faced each other.</li>
          <li><strong className="text-foreground">Share</strong> — Copy the comparison link to share with friends or on the community forum.</li>
        </ul>
      </>
    ),
  },
  {
    id: "achievements",
    icon: Award,
    title: "Achievements & Badges",
    content: (
      <>
        <p className="mb-3">Earn badges and unlock achievements as you compete and grow.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Milestone Tiers</strong> — Achievements come in four tiers: Bronze, Silver, Gold, and Platinum.</li>
          <li><strong className="text-foreground">Progress Tracking</strong> — Some achievements track your progress (e.g., "Win 10 matches") so you can see how close you are.</li>
          <li><strong className="text-foreground">Special Badges</strong> — Admins can award special recognition badges for outstanding contributions or sportsmanship.</li>
          <li><strong className="text-foreground">Achievements Leaderboard</strong> — See who has earned the most badges across the platform.</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground italic">
          Tip: Check the Badges page regularly — new achievements may be added each season!
        </p>
      </>
    ),
  },
  {
    id: "ai-coach",
    icon: BrainCircuit,
    title: "AI Coach",
    content: (
      <>
        <p className="mb-3">Get personalized coaching and tips from your AI assistant.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Open the Coach</strong> — Click the <em>AI Coach</em> link in the sidebar or use the floating coach button in the bottom-right corner.</li>
          <li><strong className="text-foreground">Ask Questions</strong> — Ask about strategies, game mechanics, tournament tips, or anything gaming-related.</li>
          <li><strong className="text-foreground">Game-Specific Help</strong> — Select a game context to get advice tailored to that specific title.</li>
          <li><strong className="text-foreground">Conversation History</strong> — Your past conversations are saved so you can revisit previous coaching sessions.</li>
        </ul>
      </>
    ),
  },
  {
    id: "profile-settings",
    icon: Settings,
    title: "Profile Settings",
    content: (
      <>
        <p className="mb-3">Manage your account and personalize your profile.</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Display Name</strong> — Set the name that appears on your profile and in community posts.</li>
          <li><strong className="text-foreground">Gamer Tag</strong> — Your unique identifier shown on leaderboards and tournament brackets.</li>
          <li><strong className="text-foreground">Avatar</strong> — Upload a profile picture to make your account stand out.</li>
          <li><strong className="text-foreground">Password</strong> — Use the password reset flow to update your login credentials.</li>
        </ul>
      </>
    ),
  },
];

const PlayerGuide = () => {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider gradient-text mb-2">
          Player Guide
        </h1>
        <p className="text-muted-foreground">
          Everything you need to know about using FGN — from account setup to climbing the leaderboard.
        </p>
      </div>

      <div className="glass-panel rounded-lg p-4 md:p-6">
        <Accordion type="multiple" className="space-y-1">
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="border-border/50">
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
    </div>
  );
};

export default PlayerGuide;
