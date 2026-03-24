import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Scroll, Search, ArrowUp, Printer, ArrowLeft, CheckSquare, Upload,
  Award, Zap, Link as LinkIcon, BookOpen, Gamepad2, Shield, TrendingUp,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { useGuideMedia } from "@/hooks/useGuideMedia";

const sectionData: { id: string; icon: typeof Scroll; title: string; bullets: string[] }[] = [
  {
    id: "what-are-quests",
    icon: Scroll,
    title: "What Are Quests?",
    bullets: [
      "Quests are structured multi-task objectives with their own catalog, separate from challenges.",
      "Each quest has a name, description, difficulty level, and a set of tasks to complete.",
      "Quests are designed to guide players through learning experiences, skill-building activities, or community engagement goals.",
      "Browse active quests at /quests. Each quest card shows its difficulty, point rewards, task count, and enrollment status.",
    ],
  },
  {
    id: "enrolling",
    icon: Shield,
    title: "Enrolling in Quests",
    bullets: [
      "Click on any quest to view its full detail page with description, tasks, and reward information.",
      "Hit Enroll to sign up. Enrollment is instant and your status is tracked.",
      "Your enrollment status progresses: enrolled → in_progress → completed.",
      "You can be enrolled in multiple quests simultaneously.",
    ],
  },
  {
    id: "tasks-evidence",
    icon: CheckSquare,
    title: "Tasks & Evidence",
    bullets: [
      "Task List — Each quest includes a series of tasks displayed in order. Tasks have titles and descriptions explaining what to do.",
      "Evidence Upload — Upload screenshots, videos, or files as proof of completing each task.",
      "Per-Task Tracking — Each task's evidence is reviewed independently. You'll see per-task status badges (pending, approved, rejected).",
      "Moderator Review — A moderator reviews each piece of evidence and may leave feedback notes.",
      "Re-Upload — If evidence is rejected, review the feedback, delete the rejected evidence, and upload an improved version.",
    ],
  },
  {
    id: "per-task-points",
    icon: Zap,
    title: "Per-Task Point Payouts",
    bullets: [
      "How It Works — Points are awarded per task, not as a lump sum at the end. Each time a moderator approves a task's evidence, you earn points immediately.",
      "Points Per Task — Each approved task earns the quest's 'points per task' value. For example, a quest with 5 tasks and 1 point per task awards 1 point each time a task is approved = 5 total.",
      "Instant Notification — When a task is approved, you receive an instant notification confirming the approval and the points earned.",
      "No Double-Paying — The system prevents duplicate payouts. Each task can only award points once per enrollment.",
      "Total Possible — The quest detail sidebar shows '+X per task' and the total possible points (points × task count) so you know exactly what you can earn.",
      "Completion — When all tasks are done and the moderator marks the quest as 'completed,' the quest completion is recorded for chain progression and achievement tracking. Points have already been earned per-task.",
    ],
  },
  {
    id: "quest-chains",
    icon: LinkIcon,
    title: "Quest Chains",
    bullets: [
      "Sequential Progression — Quests can be organized into chains where you must complete Quest A before Quest B unlocks.",
      "Chain Navigation — Each chain shows a progress bar and quest-by-quest breadcrumb. Locked quests display a lock icon until the prerequisite is completed.",
      "Chain Progress — Your progress through a chain is tracked automatically. The chain card shows how many quests you've completed.",
      "Chain Completion Bonus — Finishing every quest in a chain awards bonus points and may unlock a special achievement badge.",
      "Finding Chains — Quest chains appear at the top of the Quests page with their overall progress indicators.",
    ],
  },
  {
    id: "xp-ranks",
    icon: TrendingUp,
    title: "XP & Rank System",
    bullets: [
      "Completing quests earns XP that feeds into a separate ranking system independent of season points.",
      "Five Tiers — Novice (0–99 XP), Apprentice (100–299 XP), Journeyman (300–599 XP), Expert (600–999 XP), Master (1000+ XP).",
      "Rank Display — Your current quest rank and XP progress bar are shown at the top of the Quests page and on your player profile.",
      "Rank Badge — Your rank badge appears next to your name in quest-related contexts, showing your progression level.",
      "XP Sources — XP comes from quest completions. The amount is set per-quest by the creator.",
    ],
  },
  {
    id: "story-narratives",
    icon: BookOpen,
    title: "Story Narratives",
    bullets: [
      "Flavor Text — Some quests and chains feature story intro and outro text that adds context and narrative to your journey.",
      "Story Intro — Displayed when you enroll in a quest, setting the scene for what you're about to do.",
      "Story Outro — Shown upon completion, wrapping up the narrative and congratulating your achievement.",
      "Chain Narratives — Quest chains can have overarching story themes that connect individual quests into a cohesive journey.",
      "AI-Enhanced — Quest creators can use AI to enhance narrative descriptions for richer storytelling.",
    ],
  },
  {
    id: "tips-faq",
    icon: Gamepad2,
    title: "Tips & FAQ",
    bullets: [
      "Complete quests in chain order — Locked quests won't accept evidence until prerequisites are done.",
      "Upload clear evidence — Moderators approve faster when screenshots and videos clearly show task completion.",
      "Check your XP — Visit the Quests page to see your current rank and how much XP you need for the next tier.",
      "Enable notifications — Turn on 'New Quests' notifications in Profile Settings to be alerted when quests are published.",
      "FAQ: How are quest points different from season points? — Quest per-task payouts add to your season points. XP is a separate progression system.",
      "FAQ: Can I redo a quest? — Each quest can only be completed once per player.",
      "FAQ: What happens if a chain quest is rejected? — Only the individual task evidence is rejected. Fix and re-upload it; your other approved tasks remain.",
      "FAQ: Do quest chains have time limits? — That depends on the individual quests in the chain. Check each quest's details for dates.",
      "Tip: Quest chains with completion bonuses offer the best point-to-effort ratio on the platform!",
    ],
  },
];

const QuestGuide = () => {
  usePageTitle("Quest Guide");
  const [search, setSearch] = useState("");
  const [showTop, setShowTop] = useState(false);
  const { mediaBySection } = useGuideMedia("quests");

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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quest Guide — FGN</title>
<style>body{font-family:system-ui,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}h1{font-size:24px}h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}.section{page-break-inside:avoid;margin-bottom:16px}ul{padding-left:20px;margin:4px 0}li{margin:4px 0}@media print{body{padding:20px}}</style></head><body>
<h1>Quest Guide</h1><p style="color:#888;font-size:12px">How quests, chains, and XP work on FGN.</p>${sectionBlocks}</body></html>`;
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
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider gradient-text mb-2">Quest Guide</h1>
            <p className="text-muted-foreground">Everything about quests — tasks, per-task point payouts, chains, XP, and ranks.</p>
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

export default QuestGuide;
