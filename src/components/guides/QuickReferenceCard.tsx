import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpenCheck } from "lucide-react";

/**
 * Audience-aware Quick Reference card shown at the top of every guide.
 * Each audience opts into the tabs that are relevant to them.
 */
export type QuickRefAudience =
  | "player"
  | "admin"
  | "moderator"
  | "tenant"
  | "challenge"
  | "quest"
  | "tournament";

interface QuickReferenceCardProps {
  audience: QuickRefAudience;
  /** Optional intro line specific to the guide */
  intro?: ReactNode;
}

// ── Shared reference data ──────────────────────────────────────────────────────

type Capability = {
  capability: string;
  // y/r/n  — checkmark / read-only / none
  player: "y" | "r" | "n";
  moderator: "y" | "r" | "n";
  marketing: "y" | "r" | "n";
  admin: "y" | "r" | "n";
  tenantAdmin: "y" | "r" | "n";
  tenantManager: "y" | "r" | "n";
  tenantMarketing: "y" | "r" | "n";
};

const ROLE_CAPABILITIES: Capability[] = [
  { capability: "Compete in tournaments / challenges / quests", player: "y", moderator: "y", marketing: "y", admin: "y", tenantAdmin: "y", tenantManager: "y", tenantMarketing: "y" },
  { capability: "Create / edit tournaments", player: "n", moderator: "y", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Score matches / advance brackets", player: "n", moderator: "y", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Approve challenge / quest evidence", player: "n", moderator: "y", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Adjust player points", player: "n", moderator: "y", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Manage prize redemptions", player: "n", moderator: "y", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Award / revoke achievements", player: "n", moderator: "y", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Manage games catalog & AI Guide Writer", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Manage users & roles", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "View registration / enrollment counts", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Manage tenants / billing integrations", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "y", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Manage tenant ZIP codes & subscribers", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "y", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Manage tenant team & invitations", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "y", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Tenant Stripe billing & cloud gaming seats", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "y", tenantManager: "n", tenantMarketing: "n" },
  { capability: "Tenant events: create / publish", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "y", tenantManager: "y", tenantMarketing: "y" },
  { capability: "Tenant leads pipeline", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "y", tenantManager: "y", tenantMarketing: "n" },
  { capability: "Tenant codes (campaign / access / verify)", player: "n", moderator: "n", marketing: "n", admin: "y", tenantAdmin: "y", tenantManager: "n", tenantMarketing: "r" },
  { capability: "Tenant marketing assets & web pages", player: "n", moderator: "n", marketing: "y", admin: "y", tenantAdmin: "y", tenantManager: "n", tenantMarketing: "y" },
  { capability: "Platform marketing campaigns / calendar embeds", player: "n", moderator: "n", marketing: "y", admin: "y", tenantAdmin: "n", tenantManager: "n", tenantMarketing: "n" },
];

const ACHIEVEMENT_TIERS = [
  { tier: "Bronze", typical: "Onboarding milestones", example: "First win, first tournament" },
  { tier: "Silver", typical: "Sustained activity", example: "10 wins, 5 tournaments" },
  { tier: "Gold", typical: "Veteran / dedicated", example: "50 wins, 3 championships" },
  { tier: "Platinum", typical: "Elite / mastery", example: "100 wins, season champion" },
];

const QUEST_RANKS = [
  { rank: "Novice", xp: "0–99 XP" },
  { rank: "Apprentice", xp: "100–299 XP" },
  { rank: "Journeyman", xp: "300–599 XP" },
  { rank: "Expert", xp: "600–999 XP" },
  { rank: "Master", xp: "1000+ XP" },
];

const POINTS_ECONOMY = [
  { source: "Tournament placement", awarded: "On tournament completion", payout: "Per-tier (1st / 2nd / 3rd / participation)" },
  { source: "Challenge completion", awarded: "On moderator approval", payout: "Lump sum + optional placement bonus" },
  { source: "Quest tasks", awarded: "Per task on approval", payout: "Points-per-task × approved tasks" },
  { source: "Quest chain bonus", awarded: "On final quest approval", payout: "Chain bonus + optional achievement" },
  { source: "Manual moderator/admin adjustment", awarded: "Immediate", payout: "Configurable, audited with reason" },
  { source: "Prize Shop redemption", awarded: "On approval", payout: "Deducts only from points_available" },
];

const TOURNAMENT_FLOW = [
  { state: "Upcoming", who: "Organizer", note: "Visible but registration not yet open" },
  { state: "Open", who: "Players", note: "Registrations accepted up to max" },
  { state: "In Progress", who: "Moderator", note: "Bracket generated, scores entered" },
  { state: "Completed", who: "System", note: "Points awarded automatically by placement" },
  { state: "Cancelled", who: "Organizer", note: "Terminal — no points awarded" },
];

const CHALLENGE_FLOW = [
  { state: "Enrolled", who: "Player", note: "Player signs up" },
  { state: "In Progress", who: "Player", note: "Evidence being uploaded per task" },
  { state: "Submitted", who: "Player", note: "Sent for moderator review (locks unenrollment)" },
  { state: "Approved / Completed", who: "Moderator", note: "Points awarded, FGN Academy synced" },
  { state: "Rejected", who: "Moderator", note: "Returned with per-evidence feedback for re-upload" },
];

// ── UI helpers ────────────────────────────────────────────────────────────────

const Cell = ({ v }: { v: "y" | "r" | "n" }) => (
  <span
    aria-label={v === "y" ? "Full access" : v === "r" ? "Read-only" : "No access"}
    className={
      v === "y"
        ? "text-primary font-bold"
        : v === "r"
        ? "text-amber-500 font-semibold"
        : "text-muted-foreground/40"
    }
  >
    {v === "y" ? "✓" : v === "r" ? "◐" : "—"}
  </span>
);

function RoleMatrix() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Capability</TableHead>
            <TableHead className="text-center">Player</TableHead>
            <TableHead className="text-center">Mod</TableHead>
            <TableHead className="text-center">Marketing</TableHead>
            <TableHead className="text-center">Admin</TableHead>
            <TableHead className="text-center">Tenant Admin</TableHead>
            <TableHead className="text-center">Tenant Mgr</TableHead>
            <TableHead className="text-center">Tenant Mktg</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROLE_CAPABILITIES.map((row) => (
            <TableRow key={row.capability}>
              <TableCell className="font-medium">{row.capability}</TableCell>
              <TableCell className="text-center"><Cell v={row.player} /></TableCell>
              <TableCell className="text-center"><Cell v={row.moderator} /></TableCell>
              <TableCell className="text-center"><Cell v={row.marketing} /></TableCell>
              <TableCell className="text-center"><Cell v={row.admin} /></TableCell>
              <TableCell className="text-center"><Cell v={row.tenantAdmin} /></TableCell>
              <TableCell className="text-center"><Cell v={row.tenantManager} /></TableCell>
              <TableCell className="text-center"><Cell v={row.tenantMarketing} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground mt-2">
        <span className="text-primary font-bold">✓</span> Full access &nbsp;·&nbsp;
        <span className="text-amber-500 font-semibold">◐</span> Read-only &nbsp;·&nbsp;
        <span className="text-muted-foreground/60">—</span> No access. Staff (Admin, Moderator, Marketing) are exempt from Discord linking, ZIP gates, and onboarding wizards.
      </p>
    </div>
  );
}

function TierTables() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-display font-semibold text-sm uppercase tracking-widest text-primary mb-2">
          Achievement tiers
        </h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>Typical use</TableHead>
              <TableHead>Example</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ACHIEVEMENT_TIERS.map((t) => (
              <TableRow key={t.tier}>
                <TableCell><Badge variant="outline" className="font-heading">{t.tier}</Badge></TableCell>
                <TableCell>{t.typical}</TableCell>
                <TableCell className="text-muted-foreground">{t.example}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h4 className="font-display font-semibold text-sm uppercase tracking-widest text-primary mb-2">
          Quest XP ranks
        </h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>XP threshold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {QUEST_RANKS.map((r) => (
              <TableRow key={r.rank}>
                <TableCell><Badge variant="outline" className="font-heading">{r.rank}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{r.xp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:col-span-2">
        <h4 className="font-display font-semibold text-sm uppercase tracking-widest text-primary mb-2">
          Points economy at a glance
        </h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>When awarded</TableHead>
              <TableHead>Payout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {POINTS_ECONOMY.map((p) => (
              <TableRow key={p.source}>
                <TableCell className="font-medium">{p.source}</TableCell>
                <TableCell className="text-muted-foreground">{p.awarded}</TableCell>
                <TableCell className="text-muted-foreground">{p.payout}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-2">
          The wallet holds two balances: <strong className="text-foreground">points</strong> (lifetime — drives leaderboards & rank) and <strong className="text-foreground">points_available</strong> (spendable in the Prize Shop). Spendable points are deducted only when a redemption is approved.
        </p>
      </div>
    </div>
  );
}

function FlowTable({ rows, title }: { rows: { state: string; who: string; note: string }[]; title: string }) {
  return (
    <div>
      <h4 className="font-display font-semibold text-sm uppercase tracking-widest text-primary mb-2">{title}</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Triggered by</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.state}>
              <TableCell><Badge variant="outline" className="font-heading">{r.state}</Badge></TableCell>
              <TableCell>{r.who}</TableCell>
              <TableCell className="text-muted-foreground">{r.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuickReferenceCard({ audience, intro }: QuickReferenceCardProps) {
  const showRoles =
    audience === "admin" ||
    audience === "moderator" ||
    audience === "tenant" ||
    audience === "player";
  const showTiers = audience !== "tournament";
  const showTournamentFlow = audience === "tournament" || audience === "admin" || audience === "moderator";
  const showChallengeFlow =
    audience === "challenge" || audience === "quest" || audience === "admin" || audience === "moderator";

  // Pick a sensible default tab
  const defaultTab = showRoles ? "roles" : showTiers ? "tiers" : "flow";

  return (
    <section className="glass-panel rounded-lg p-4 md:p-6 border border-primary/30 space-y-4">
      <header className="flex items-center gap-2">
        <BookOpenCheck className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold tracking-wider uppercase text-sm text-primary">
          Quick Reference
        </h2>
      </header>
      {intro && <p className="text-sm text-muted-foreground">{intro}</p>}

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          {showRoles && <TabsTrigger value="roles">Role × Capability</TabsTrigger>}
          {showTiers && <TabsTrigger value="tiers">Tiers & Points</TabsTrigger>}
          {(showTournamentFlow || showChallengeFlow) && <TabsTrigger value="flow">Status Flows</TabsTrigger>}
        </TabsList>

        {showRoles && (
          <TabsContent value="roles" className="pt-4">
            <RoleMatrix />
          </TabsContent>
        )}

        {showTiers && (
          <TabsContent value="tiers" className="pt-4">
            <TierTables />
          </TabsContent>
        )}

        {(showTournamentFlow || showChallengeFlow) && (
          <TabsContent value="flow" className="pt-4 space-y-6">
            {showTournamentFlow && (
              <FlowTable rows={TOURNAMENT_FLOW} title="Tournament status flow" />
            )}
            {showChallengeFlow && (
              <FlowTable rows={CHALLENGE_FLOW} title="Challenge / Quest enrollment flow" />
            )}
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
