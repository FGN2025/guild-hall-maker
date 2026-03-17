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
  Trophy,
  Target,
  Sparkles,
  Server,
  BarChart3,
  Gift,
  Bot,
  Users,
  Shield,
  CheckCircle,
  TrendingUp,
  Rocket,
  Search,
  Printer,
  ArrowUp,
  BookOpen,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import usePageTitle from "@/hooks/usePageTitle";

const sectionData: { id: string; icon: typeof Trophy; title: string; content: string[] }[] = [
  {
    id: "executive-summary",
    icon: BookOpen,
    title: "Executive Summary",
    content: [
      "The FGN Esports Platform is a turnkey competitive gaming solution designed for schools, community centers, libraries, and youth-serving organizations.",
      "It provides a complete toolkit for organizing tournaments, challenges, and story-driven quests — all within a supervised, moderated environment.",
      "Institutions gain access to automated bracket management, seasonal leaderboards, achievement badges, a prize shop, dedicated game servers, an AI coaching assistant, and a moderated community forum.",
      "The platform is fully web-based with no software installation required. Participants access everything through a browser.",
      "Tenant onboarding allows each organization to operate a branded sub-portal with its own events, ZIP-based enrollment, marketing tools, and subscriber integrations.",
      "FGN bridges the gap between recreational gaming and structured, skill-building competitive programming — turning screen time into measurable achievement.",
    ],
  },
  {
    id: "the-problem",
    icon: AlertTriangle,
    title: "The Problem: Untapped Engagement Potential",
    content: [
      "Youth Engagement Gap — Schools and community organizations struggle to attract and retain teen and young-adult participants in after-school and weekend programs.",
      "Unstructured Gaming — Young people spend significant time gaming but without structure, goal-setting, or skill development frameworks.",
      "Digital Literacy Disconnect — Many institutions lack the tools and expertise to channel gaming interest into productive, measurable learning outcomes.",
      "Resource Constraints — Building a competitive gaming program from scratch requires tournament software, moderation systems, reward structures, and technical infrastructure that most organizations cannot afford or staff.",
      "Safety Concerns — Parents and administrators worry about unsupervised online interactions, inappropriate content, and the lack of accountability in gaming environments.",
      "Measurement Difficulty — Without proper tooling, it is nearly impossible to track participation, engagement trends, and individual growth across a competitive program.",
    ],
  },
  {
    id: "the-solution",
    icon: Lightbulb,
    title: "The Solution: Structured Competitive Gaming",
    content: [
      "FGN transforms recreational gaming into an organized, goal-oriented activity program with clear progression paths.",
      "Tournaments provide the competitive backbone — automated brackets, seeded matchups, and seasonal rankings give participants a professional-grade competitive experience.",
      "Challenges offer task-based objectives with evidence submission, teaching accountability and follow-through. Moderators review evidence and provide feedback.",
      "Quests introduce story-driven multi-step progressions with XP ranks (Novice → Apprentice → Journeyman → Expert → Master), creating long-term engagement hooks.",
      "The Achievement Badge system rewards milestones across all activity types, providing visible recognition that motivates continued participation.",
      "Every interaction is logged, scored, and reportable — giving administrators the data they need to demonstrate program value to stakeholders.",
    ],
  },
  {
    id: "feature-tournaments",
    icon: Trophy,
    title: "Feature: Tournaments",
    content: [
      "Single-elimination bracket tournaments with automated seeding and match progression.",
      "Multi-date scheduling — create an entire season of tournaments from a single dialog using the multi-date calendar picker.",
      "Prize Modes — configure 'None', physical prizes linked to the Prize Shop, or point-value prizes with configurable percentage splits (default 50/30/20) for top finishers.",
      "Registration management with open/close controls and participant caps.",
      "Inline match scoring from the bracket view — winners are advanced automatically.",
      "Season points are awarded upon match completion, feeding into the seasonal leaderboard.",
      "Tournament reminders are sent automatically ~24 hours before start time.",
      "Bracket reset capability allows re-registration before any matches are completed.",
      "Public visibility — tournament listings, details, and brackets are viewable without an account.",
    ],
  },
  {
    id: "feature-challenges",
    icon: Target,
    title: "Feature: Challenges",
    content: [
      "Task-based objectives with configurable difficulty levels (Beginner, Intermediate, Advanced) and estimated completion times.",
      "Challenge types include Daily, Weekly, Monthly, and One-Time for varied engagement cadences.",
      "Multi-step task checklists — players complete individual tasks and upload evidence (screenshots or video highlights) per step.",
      "Evidence review workflow — moderators approve or reject individual evidence items with feedback notes.",
      "Enrollment tracking with status progression: Enrolled → In Progress → Submitted → Completed (or Rejected for revision).",
      "AI-enhanced descriptions improve challenge clarity and engagement using the platform's built-in AI capabilities.",
      "Cover images from the Media Library make each challenge visually distinct.",
      "Automatic notifications when challenges are published, evidence is reviewed, and completions are confirmed.",
      "Max enrollment limits allow controlled participation.",
    ],
  },
  {
    id: "feature-quests",
    icon: Sparkles,
    title: "Feature: Quests & Quest Chains",
    content: [
      "Story-driven multi-step progressions that create narrative engagement beyond simple task completion.",
      "XP Rewards — quests award experience points feeding into a five-tier rank system: Novice (0–99), Apprentice (100–299), Journeyman (300–599), Expert (600–999), Master (1000+).",
      "Quest Chains — sequential quest progressions with story intro/outro text, cover images, and bonus point rewards upon chain completion.",
      "Achievement Integration — completing a quest chain can automatically award a linked achievement badge.",
      "AI-Enhanced Narratives — auto-generate rich story text using the platform's AI, with optional RAG-powered game-specific context from connected knowledge bases.",
      "Same evidence-based workflow as challenges: enrollment, task completion, evidence upload, moderator review.",
      "Chain completion triggers are handled automatically by database triggers — no manual moderator action required.",
    ],
  },
  {
    id: "feature-servers",
    icon: Server,
    title: "Feature: Game Server Directory",
    content: [
      "Dedicated hosted game servers listed in a public directory at /servers.",
      "Each server card displays the game, IP address, port, live online/offline status, and player capacity.",
      "Live status monitoring via Pterodactyl and Shockbyte panel integrations with automatic health checks.",
      "One-click IP copy for easy connection — players don't need to remember server addresses.",
      "Connection instructions displayed directly on each server card.",
      "Servers are linked to the Games Catalog, inheriting cover images and metadata.",
      "AI-powered description enhancement for server listings.",
      "Ideal for institutions that want supervised, private gaming environments for their programs.",
    ],
  },
  {
    id: "feature-leaderboards",
    icon: BarChart3,
    title: "Feature: Leaderboards & Stats",
    content: [
      "Seasonal and all-time leaderboards ranked by points earned across tournaments, challenges, and quests.",
      "Player profiles with comprehensive stats: total wins, losses, win rate, tournaments played, challenges completed, and achievement badges.",
      "Season Stats page with per-game breakdowns and historical performance tracking.",
      "Player Comparison tool for head-to-head stat analysis between any two players.",
      "Ranked Ladders with ELO-based rating systems for persistent competitive rankings.",
      "Skill Insights panel providing AI-generated analysis of player strengths and improvement areas.",
      "CSV and PDF export of leaderboard data for reporting and external sharing.",
    ],
  },
  {
    id: "feature-prizes",
    icon: Gift,
    title: "Feature: Prize Shop",
    content: [
      "Points-based reward system where participants redeem earned points for prizes.",
      "Two-tier wallet: 'Points' (lifetime earned, for rankings) and 'Points Available' (spendable balance).",
      "Prize catalog with images, descriptions, point costs, and stock tracking.",
      "Redemption workflow: Request → Approved → Fulfilled (or Denied), with notifications at each step.",
      "Out-of-stock protection prevents approving redemptions for depleted prizes.",
      "Institutions can stock the prize catalog with physical rewards, gift cards, privileges, or experiences relevant to their community.",
    ],
  },
  {
    id: "feature-cloud-gaming",
    icon: Server,
    title: "Feature: Cloud Gaming",
    content: [
      "Browser-based cloud gaming access for subscribers — no hardware investment required.",
      "Powered by Blacknut Cloud Gaming (integration pending), offering a catalog of high-quality titles playable from any browser.",
      "Seat-based licensing model — institutions purchase individual subscriber seats at $29.99/month each.",
      "Tenant admins manage seat assignments from their Settings dashboard, with visual capacity tracking and subscriber selection.",
      "Tiered plans: Basic (up to 25 seats), Standard (up to 100 seats), Premium (unlimited) — matching institutional scale.",
      "Integrated billing via Stripe with automatic subscription management and webhook-based status synchronization.",
      "Auto-deactivation — when a seat subscription is canceled, access is revoked automatically with no admin action required.",
      "Designed as a premium add-on to the base tenant subscription, enabling institutions to offer cutting-edge gaming without local hardware.",
    ],
  },
  {
    id: "feature-coach",
    icon: Bot,
    title: "Feature: AI Coach",
    content: [
      "Built-in AI coaching assistant accessible via a floating button on every page.",
      "Game-specific strategy guidance powered by the platform's AI models — no API key required.",
      "Conversation history is saved per-user for ongoing coaching continuity.",
      "Optionally connected to game-specific knowledge bases (Notebooks) for deeper, context-aware coaching.",
      "Helps new players learn game strategies, understand tournament formats, and improve their skills.",
      "Provides a safe, private space for players to ask questions without peer pressure.",
    ],
  },
  {
    id: "feature-community",
    icon: Users,
    title: "Feature: Community Forum",
    content: [
      "Moderated discussion forum for participants to share strategies, organize practice sessions, and build community.",
      "Category-based organization for focused discussions.",
      "Pin important announcements or rules to the top of the forum.",
      "Like system for positive engagement.",
      "Moderator oversight ensures content adheres to the Acceptable Use Policy.",
      "Nested reply threads for organized conversations.",
    ],
  },
  {
    id: "implementation",
    icon: Rocket,
    title: "Implementation Models",
    content: [
      "Tenant Onboarding — Each institution is set up as a 'Tenant' on the platform with its own branded sub-portal, logo, and color scheme.",
      "Subscription Plans — Tenants subscribe via Stripe ($850/mo base plan) with self-service billing management, automatic status sync, and add-on capabilities like cloud gaming seats.",
      "ZIP-Based Enrollment — Define service area ZIP codes so that players who register from your area are automatically captured as leads.",
      "Staff Roles — Assign team members as Admins (full control), Managers (operations), or Marketing (promotional content).",
      "Moderator Assignment — Platform admins assign moderator roles to institution staff who manage day-to-day tournament and challenge operations.",
      "Subscriber Integration — Connect existing billing or membership systems (NISC, GLDS) to auto-import subscriber lists for verification.",
      "Cloud Gaming Add-On — Purchase browser-based gaming seats for subscribers at $29.99/mo each, with automatic billing and seat management.",
      "Event Pages — Published events appear on a public-facing page at /events/your-organization-slug, shareable with no login required.",
      "Web Pages — Create branded landing pages at /pages/your-organization-slug/page-name for program promotion.",
      "Calendar Embeds — Publish branded calendar widgets for embedding on your organization's website.",
      "Campaign Codes — Create registration codes for targeted campaigns, events, or partnerships with configurable usage limits and expiration.",
    ],
  },
  {
    id: "safety",
    icon: Shield,
    title: "Safety & Moderation",
    content: [
      "Acceptable Use Policy (AUP) — All users agree to the AUP upon registration, establishing clear behavioral expectations.",
      "Evidence Review — Every challenge and quest submission goes through moderator review before points are awarded, ensuring accountability.",
      "Content Moderation — Forum posts are monitored by moderators who can pin, remove, or flag inappropriate content.",
      "Discord Identity Verification — Players link their Discord accounts for identity verification and community integration.",
      "Ban System — Administrators can ban users by email, preventing re-registration and access.",
      "Access Request Review — ZIP-based or code-based registration can require manual admin approval before granting access.",
      "Role-Based Access Control — Row-level security policies ensure users only see data appropriate to their role.",
      "Encrypted Credentials — Integration credentials (billing systems, API keys) are encrypted at rest.",
      "Email Confirmation — Users must verify their email address before accessing the platform.",
      "Notification Preferences — Users control which notifications they receive, respecting communication preferences.",
    ],
  },
  {
    id: "metrics",
    icon: TrendingUp,
    title: "Success Metrics & Reporting",
    content: [
      "Participation Rates — Track total registrations, active players per season, and tournament/challenge enrollment trends.",
      "Engagement Depth — Measure challenges completed, quests progressed, forum posts, and average session frequency.",
      "Skill Growth — Monitor individual player improvement via season stats, ELO progression, and rank advancement.",
      "Program Reach — Use the lead pipeline and ZIP-code coverage reports to measure community penetration.",
      "Retention — Compare seasonal leaderboard participation across consecutive seasons to track long-term engagement.",
      "Exportable Reports — Leaderboard rankings, season stats, and user data are exportable as CSV or PDF for stakeholder presentations.",
      "Dashboard Metrics — Tenant dashboards show at-a-glance counts of players, subscribers, leads, and ZIP codes covered.",
    ],
  },
  {
    id: "getting-started",
    icon: CheckCircle,
    title: "Getting Started",
    content: [
      "Step 1 — Visit fibregamingnetwork.com/for-providers to self-register your organization. Enter your org name, contact email, admin name, and password.",
      "Step 2 — Complete payment via Stripe Checkout ($850/mo Tenant Basic plan). Your organization is automatically provisioned and activated upon successful payment.",
      "Step 3 — Log in to your Tenant portal, upload your logo, set brand colors, and configure your service area ZIP codes.",
      "Step 4 — Invite your staff and assign roles (Admin, Manager, Marketing, Moderator).",
      "Step 5 — Define your game catalog — select which games your program will feature for tournaments and challenges.",
      "Step 6 — Create your first tournament, challenge, or quest and publish it to your community.",
      "Step 7 — Share your public event page and registration link with participants.",
      "Step 8 — Monitor your dashboard, review submissions, and watch your competitive gaming community grow.",
      "For inquiries, contact us through the platform or reach out to your FGN representative.",
    ],
  },
];

const WhitePaper = () => {
  usePageTitle("White Paper — Community Gaming Platform");
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
        s.content.some((b) => b.toLowerCase().includes(q))
    );
  }, [search]);

  const handlePrint = () => {
    const sectionBlocks = sectionData
      .map((s) => {
        const items = s.content.map((b) => `<li>${b}</li>`).join("");
        return `<div class="section"><h2>${s.title}</h2><ul>${items}</ul></div>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>FGN Community Gaming Platform — White Paper</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}
  h1{font-size:24px;margin-bottom:2px} .subtitle{font-size:14px;color:#666;margin-bottom:24px}
  h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}
  .section{page-break-inside:avoid;margin-bottom:16px}
  ul{padding-left:20px;margin:4px 0} li{margin:4px 0}
  @media print{body{padding:20px}}
</style></head><body>
<h1>FGN Community Gaming Platform</h1>
<p class="subtitle">Bring Competitive Gaming to Your School, Library, or Community Center</p>
${sectionBlocks}
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground">
          Bring Competitive Gaming to Your Community
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A turnkey esports platform for schools, libraries, and community centers to run tournaments, challenges, and quests — safely and at scale.
        </p>
        <Button variant="outline" size="sm" onClick={handlePrint} className="mt-4 gap-2">
          <Printer className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* TOC */}
      {filteredSections.length > 0 && (
        <nav className="border border-border rounded-lg bg-card/50 px-4 py-3">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-widest text-primary mb-2">
            Table of Contents
          </h2>
          <ul className="columns-2 gap-x-6 text-sm space-y-1">
            {filteredSections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#wp-${s.id}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`wp-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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

      {/* Content */}
      {filteredSections.length > 0 ? (
        <Accordion
          type="multiple"
          defaultValue={search.trim() ? filteredSections.map((s) => s.id) : []}
          key={search}
          className="space-y-2"
        >
          {filteredSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              id={`wp-${section.id}`}
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
                  {section.content.map((b, i) => {
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
        <p className="text-muted-foreground text-sm text-center py-8">
          No results found for &ldquo;{search}&rdquo;
        </p>
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

export default WhitePaper;
