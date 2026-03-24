import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Target, Search, ArrowUp, Printer, ArrowLeft, CalendarDays, CheckSquare,
  Upload, Eye, Award, Bell, Gamepad2, Shield, Clock,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { useGuideMedia } from "@/hooks/useGuideMedia";

const sectionData: { id: string; icon: typeof Target; title: string; bullets: string[] }[] = [
  {
    id: "what-are-challenges",
    icon: Target,
    title: "What Are Challenges?",
    bullets: [
      "Challenges are task-based objectives that earn you bonus season points outside of tournament play.",
      "Think of them as mini-missions — complete specific tasks, upload proof, and earn rewards.",
      "Challenges are created by admins and moderators and can be tied to specific games or open to all.",
      "Unlike tournaments (which are bracket-based competitions), challenges are individual achievement goals.",
    ],
  },
  {
    id: "types-difficulty",
    icon: CalendarDays,
    title: "Types & Difficulty",
    bullets: [
      "Challenge Types — Daily, Weekly, Monthly, and One-Time challenges rotate regularly to keep things fresh.",
      "Difficulty Levels — Each challenge is rated Beginner, Intermediate, or Advanced so you can find ones that match your skill level.",
      "Estimated Time — Every challenge shows an estimated completion time in minutes so you can plan accordingly.",
      "Game-Specific vs. Open — Some challenges require playing a specific game; others are open to any title on the platform.",
      "Featured Challenges — Admins can mark challenges as 'featured' to highlight important or time-sensitive objectives.",
    ],
  },
  {
    id: "enrolling",
    icon: Shield,
    title: "Enrolling in Challenges",
    bullets: [
      "Browse — Visit /challenges to see all active challenges with their difficulty, type, point rewards, and enrollment counts.",
      "Enroll — Click on a challenge to view its full details, then hit Enroll to sign up. Enrollment is instant.",
      "Max Enrollments — Some challenges limit how many players can participate. Enroll early before spots fill up!",
      "Max Completions — Certain challenges also limit how many players can complete them, adding a competitive urgency.",
      "Status Tracking — After enrolling, your status shows as 'enrolled.' It progresses through 'in_progress' and eventually 'completed' as you work through tasks.",
    ],
  },
  {
    id: "task-checklists",
    icon: CheckSquare,
    title: "Task Checklists",
    bullets: [
      "Multi-Step Objectives — Many challenges include a task checklist — a series of individual steps you need to complete.",
      "Task Display — Each task shows its title and description. Tasks are displayed in order on the challenge detail page.",
      "Independent Tracking — Each task is tracked separately. You can upload evidence for individual tasks without completing all of them.",
      "Progress Visibility — The challenge detail page shows which tasks you've submitted evidence for and their review status (pending, approved, rejected).",
    ],
  },
  {
    id: "evidence-upload",
    icon: Upload,
    title: "Evidence Upload",
    bullets: [
      "Proof of Completion — Challenges that require evidence need you to upload screenshots, videos, or other files proving you completed each task.",
      "Supported Formats — Upload images (JPEG, PNG, WebP) or video files as evidence.",
      "Per-Task Upload — If the challenge has a task checklist, upload evidence for each individual task.",
      "Re-Upload — You can delete and re-upload evidence before the review is finalized if you need a better screenshot.",
      "File Size — Keep uploads reasonable in size. Large video files may take longer to process.",
      "Notes — Add optional notes when uploading evidence to explain context to the reviewer.",
    ],
  },
  {
    id: "review-process",
    icon: Eye,
    title: "Review Process",
    bullets: [
      "Moderator Review — After you submit evidence, a moderator reviews each item individually.",
      "Per-Task Status — Each piece of evidence gets its own status: Pending (awaiting review), Approved (accepted), or Rejected (not accepted).",
      "Reviewer Feedback — Moderators can leave notes explaining why evidence was approved or rejected.",
      "Rejection Recovery — If evidence is rejected, review the feedback, then delete and re-upload improved evidence.",
      "Approval Notification — When a moderator approves your submission, you receive an instant notification confirming approval and the points earned.",
      "Timeline — Review times vary depending on moderator availability. Most reviews happen within 24–48 hours.",
    ],
  },
  {
    id: "points-rewards",
    icon: Award,
    title: "Points & Rewards",
    bullets: [
      "Completion Points — Each challenge lists the base points you earn for completing it.",
      "Placement Bonuses — Some challenges award bonus points for 1st, 2nd, and 3rd place finishers.",
      "Participation Points — Even if you don't fully complete a challenge, participation points reward your effort.",
      "Season Integration — All challenge points count toward the seasonal leaderboard alongside tournament points.",
      "Prize Shop — Accumulated points from challenges can be redeemed in the Prize Shop for real rewards.",
      "Achievement Badges — Completing certain challenges may unlock achievement badges displayed on your profile.",
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications & Alerts",
    bullets: [
      "New Challenge Alert — When a new challenge is published, all players receive a notification with the challenge name and point reward.",
      "Approval Alert — Instant notification when your evidence is approved, including the points you earned.",
      "Email Notifications — Key events also trigger email notifications. Manage these from Profile Settings.",
      "Notification Preferences — Toggle 'New Challenges' and other notification types on/off from Profile Settings → Notifications.",
    ],
  },
  {
    id: "tips-faq",
    icon: Gamepad2,
    title: "Tips & FAQ",
    bullets: [
      "Read the full description before enrolling — Understand what's expected so you can plan your approach.",
      "Upload clear evidence — Crisp screenshots and short video clips get approved faster than blurry or ambiguous uploads.",
      "Check estimated time — Use the time estimate to decide if a challenge fits your schedule.",
      "Act fast on limited challenges — Those with max completions or enrollments fill up quickly.",
      "FAQ: Can I do multiple challenges at once? — Yes! You can be enrolled in as many challenges as you like.",
      "FAQ: What if my evidence is rejected? — Read the moderator's feedback, delete the rejected evidence, and upload a better version.",
      "FAQ: Do challenge points expire? — Points are tied to the current season. Check season dates for details.",
      "Tip: Challenges with task checklists and evidence uploads are the fastest way to earn season points!",
    ],
  },
];

const ChallengeGuide = () => {
  usePageTitle("Challenge Guide");
  const [search, setSearch] = useState("");
  const [showTop, setShowTop] = useState(false);
  const { mediaBySection } = useGuideMedia("challenges");

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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Challenge Guide — FGN</title>
<style>body{font-family:system-ui,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:auto;font-size:13px}h1{font-size:24px}h2{font-size:16px;margin-top:24px;border-bottom:2px solid #0cc;padding-bottom:4px}.section{page-break-inside:avoid;margin-bottom:16px}ul{padding-left:20px;margin:4px 0}li{margin:4px 0}@media print{body{padding:20px}}</style></head><body>
<h1>Challenge Guide</h1><p style="color:#888;font-size:12px">How challenges work on FGN.</p>${sectionBlocks}</body></html>`;
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
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider gradient-text mb-2">Challenge Guide</h1>
            <p className="text-muted-foreground">Everything about challenges — enrollment, evidence, reviews, and rewards.</p>
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

export default ChallengeGuide;
