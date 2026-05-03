import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Trophy, Search, ArrowUp, Printer, ArrowLeft, CalendarDays, Users,
  Swords, Shield, Award, Settings, Gamepad2, BarChart3, Clock,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { useGuideMedia } from "@/hooks/useGuideMedia";
import QuickReferenceCard from "@/components/guides/QuickReferenceCard";

const sectionData: { id: string; icon: typeof Trophy; title: string; bullets: string[] }[] = [
  {
    id: "overview",
    icon: Trophy,
    title: "What Are Tournaments?",
    bullets: [
      "Tournaments are the core competitive experience on FGN — structured bracket events where players face off for season points, prizes, and glory.",
      "Format — All tournaments use a single-elimination bracket. Win your match to advance; lose and you're out.",
      "Season Integration — Points earned from tournament placements contribute to the seasonal leaderboard. Higher placements earn more points.",
      "Game-Specific — Each tournament is tied to a specific game from the FGN catalog. You'll see the game name and cover art on every tournament card.",
      "Who Can Create? — Admins and moderators can create tournaments. Players register and compete.",
    ],
  },
  {
    id: "finding",
    icon: Search,
    title: "Finding & Filtering Tournaments",
    bullets: [
      "Browse — The Tournaments page (/tournaments) lists all events with cover images, game, format, participant count, and status.",
      "Search — Use the search bar to find tournaments by name or game.",
      "Status Filters — Filter by Upcoming, Open (accepting registrations), In Progress, or Completed to see exactly what you need.",
      "Game Filters — Narrow results to a specific game if you only want to compete in certain titles.",
      "Shareable URLs — Every tournament has a dedicated page at /tournaments/:id that you can share with friends.",
    ],
  },
  {
    id: "registration",
    icon: Users,
    title: "Registration",
    bullets: [
      "Open Period — Tournaments accept registrations when their status is 'Open.' The organizer sets the window.",
      "How to Register — Click on a tournament card to view its details, then hit the Register button. You'll receive an instant confirmation notification.",
      "Max Participants — Most tournaments have a participant cap. Register early — popular events fill up fast!",
      "Entry Fee — Some tournaments have an entry fee listed on the detail page. Free tournaments show no fee.",
      "Unregister — Changed your mind? You can unregister before the tournament starts from the same detail page.",
      "Discord Requirement — Make sure your Discord account is linked before registering. Tournament communication happens through Discord.",
      "Tip: Enable 'Upcoming Tournament Reminder' notifications in Profile Settings to get a heads-up ~24 hours before your tournaments start.",
    ],
  },
  {
    id: "tournament-day",
    icon: Clock,
    title: "Tournament Day",
    bullets: [
      "Status Change — When the organizer starts the tournament, it moves to 'In Progress' and you'll receive a 'Tournament Starting Now!' notification.",
      "Check-In — Make sure you're available at the scheduled time. Late arrivals may forfeit their first match.",
      "Communication — Tournament organizers and moderators coordinate via Discord. Keep your Discord open and notifications enabled.",
      "Match Updates — You'll receive in-app and email notifications as your matches are completed and results recorded.",
    ],
  },
  {
    id: "brackets",
    icon: Swords,
    title: "Brackets & Matches",
    bullets: [
      "Bracket View — Once a tournament starts, visit /tournaments/:id/bracket to see the full single-elimination bracket.",
      "Match Cards — Each bracket match shows both players, their scores (once completed), and the winner highlighted.",
      "Advancement — Winners automatically advance to the next round. The bracket updates in real time.",
      "Bye Rounds — If the participant count isn't a power of 2, some players receive a 'bye' (automatic advancement) in the first round.",
      "Score Recording — Moderators record match scores. You'll see results as soon as they're entered.",
      "Bracket Reset — Tournament creators can reset the bracket before matches are completed, returning the event to Open status for re-seeding.",
    ],
  },
  {
    id: "points-prizes",
    icon: Award,
    title: "Points & Prizes",
    bullets: [
      "Season Points — Points are awarded automatically when a tournament completes, based on your final placement.",
      "Placement Tiers — 1st, 2nd, and 3rd place typically earn the most points. Participation points are also awarded to all competitors.",
      "Prize Pools — Some tournaments offer prize pools described on the detail page. Prizes may include physical items, gift cards, or platform perks.",
      "Leaderboard Impact — Tournament points feed directly into the seasonal leaderboard. Consistent top finishes rocket you up the rankings.",
      "Prize Shop — Accumulated season points can be redeemed in the Prize Shop for real rewards.",
    ],
  },
  {
    id: "multi-date",
    icon: CalendarDays,
    title: "Multi-Date Events",
    bullets: [
      "Some tournaments run on multiple dates — for example, a weekly series with the same format each week.",
      "Each date is listed as a separate event on the Tournaments page so you can register for the ones that fit your schedule.",
      "Calendar View — Use the Calendar (/calendar) for a visual monthly overview of all scheduled tournament dates.",
      "Tip: Check the calendar at the start of each month to plan your competitive schedule.",
    ],
  },
  {
    id: "creating",
    icon: Settings,
    title: "Creating Tournaments (Organizers)",
    bullets: [
      "Who Can Create — Admins and moderators can create tournaments using the Create Tournament button.",
      "Required Fields — Game, name, format, max participants, date/time, and description.",
      "Optional Fields — Prize pool, entry fee, hero image, rules PDF, and cover image from the Media Library.",
      "Editing — Tournament creators can update details after creation via the Edit dialog, as long as the tournament hasn't started.",
      "Managing — Navigate to /tournaments/:id/manage for advanced controls including bracket generation, score entry, and status management.",
    ],
  },
  {
    id: "tips",
    icon: Gamepad2,
    title: "Tips & FAQ",
    bullets: [
      "Register early — Popular tournaments fill up fast and some have limited participant slots.",
      "Link Discord before registering — It's required for all tournament communication.",
      "Check the bracket page during the tournament — It updates in real time as matches complete.",
      "Enable all tournament notifications — You'll get starting alerts, match results, and placement confirmations.",
      "Review game-specific rules — Each game may have unique tournament rules available as a PDF on the detail page.",
      "FAQ: Can I join multiple tournaments? — Yes! You can register for as many tournaments as you like, as long as they don't overlap.",
      "FAQ: What happens if I disconnect mid-match? — Contact the tournament moderator via Discord. They may allow a rematch at their discretion.",
      "FAQ: How are seeds determined? — Bracket seeding is random unless the organizer specifies otherwise.",
    ],
  },
];

const TournamentGuide = () => {
  usePageTitle("Tournament Guide");
  const [search, setSearch] = useState("");
  const [showTop, setShowTop] = useState(false);
  const { mediaBySection } = useGuideMedia("tournaments");

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sections = useMemo(() =>
    sectionData.map((s) => ({
      ...s,
      content: (
        <div className="space-y-4">
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
          {mediaBySection[s.id]?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {mediaBySection[s.id].map((m) => (
                <div key={m.id} className="space-y-1">
                  {m.file_type === "video" ? (
                    <video src={m.file_url} controls className="w-full rounded-md border border-border" />
                  ) : m.file_type === "image" ? (
                    <img src={m.file_url} alt={m.caption || ""} className="w-full rounded-md border border-border" />
                  ) : (
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                      📎 {m.caption || "Download file"}
                    </a>
                  )}
                  {m.caption && m.file_type !== "file" && (
                    <p className="text-xs text-muted-foreground italic">{m.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    })),
  [mediaBySection]);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.bullets.some((b) => b.toLowerCase().includes(q))
    );
  }, [search, sections]);

  const handlePrint = () => {
    const sectionBlocks = sectionData
      .map((s) => {
        const items = s.bullets.map((b) => `<li>${b}</li>`).join("");
        return `<div class="section"><h2>${s.title}</h2><ul>${items}</ul></div>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tournament Guide — FGN</title>
<style>body{font-family:system-ui,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}h1{font-size:24px}h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}.section{page-break-inside:avoid;margin-bottom:16px}ul{padding-left:20px;margin:4px 0}li{margin:4px 0}@media print{body{padding:20px}}</style></head><body>
<h1>Tournament Guide</h1><p style="color:#888;font-size:12px">Everything you need to know about FGN tournaments.</p>${sectionBlocks}</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="relative">
      <PageBackground pageSlug="guide" />
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 relative z-10">
        <Link to="/guide" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Player Guide
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider gradient-text mb-2">
              Tournament Guide
            </h1>
            <p className="text-muted-foreground">Everything you need to know about FGN tournaments — registration, brackets, points, and prizes.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0 gap-2">
            <Printer className="h-4 w-4" /> Export PDF
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search topics…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filteredSections.length > 0 && (
          <nav className="glass-panel rounded-lg px-4 py-3 border border-border/60">
            <h2 className="font-heading font-semibold text-sm uppercase tracking-widest text-primary mb-2">Table of Contents</h2>
            <ul className="columns-2 gap-x-6 text-sm space-y-1">
              {filteredSections.map((s) => (
                <li key={s.id}>
                  <a href={`#section-${s.id}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5"
                    onClick={(e) => { e.preventDefault(); document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                    <s.icon className="h-3.5 w-3.5 shrink-0" /> {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {filteredSections.length > 0 ? (
          <div className="glass-panel rounded-lg p-4 md:p-6 border border-border/60">
            <Accordion type="multiple" defaultValue={search.trim() ? filteredSections.map(s => s.id) : []} key={search} className="space-y-1">
              {filteredSections.map((section) => (
                <AccordionItem key={section.id} value={section.id} id={`section-${section.id}`} className="border-border/50 scroll-mt-4">
                  <AccordionTrigger className="hover:no-underline gap-3 text-left">
                    <span className="flex items-center gap-3">
                      <section.icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="font-display font-semibold tracking-wide">{section.title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed pl-8">{section.content}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">No results found for &ldquo;{search}&rdquo;</p>
        )}

        {showTop && (
          <Button variant="outline" size="icon" className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default TournamentGuide;
