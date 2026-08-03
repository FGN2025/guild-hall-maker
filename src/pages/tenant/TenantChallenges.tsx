import { useMemo, useState } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import {
  useTenantChallengeSchedules,
  useChallengeCatalog,
  scheduleStatus,
  type TenantChallengeSchedule,
  type ScheduledChallengeInfo,
} from "@/hooks/useTenantChallengeSchedules";
import { useTenantMarketingAssets } from "@/hooks/useTenantMarketingAssets";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Calendar as CalendarIcon, Trash2, Pencil, Zap, Search, Trophy } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { composePromoLayout } from "@/lib/promo/composePromoLayout";
import { renderPromoSceneToBlob } from "@/lib/promo/renderPromoBrowser";
import usePageTitle from "@/hooks/usePageTitle";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  upcoming: "bg-accent/20 text-accent-foreground",
  open: "bg-primary/10 text-primary",
  closed: "bg-muted text-muted-foreground",
};

const emptyForm = {
  challenge_id: "",
  starts_at: undefined as Date | undefined,
  ends_at: undefined as Date | undefined,
  headline: "",
  promo_copy: "",
  is_featured: false,
};

const DatePick = ({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(value, "PPP") : <span>{placeholder}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
    </PopoverContent>
  </Popover>
);

const TenantChallenges = () => {
  usePageTitle("Challenges");
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId;
  const { schedules, isLoading, createSchedule, updateSchedule, deleteSchedule } =
    useTenantChallengeSchedules(tenantId);
  const { data: catalog = [] } = useChallengeCatalog(!!tenantId);
  const { uploadAsset } = useTenantMarketingAssets();
  const { createCampaign } = useMarketingCampaigns();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TenantChallengeSchedule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [quickCreating, setQuickCreating] = useState<string | null>(null);

  const filteredCatalog = useMemo(() => {
    if (!search) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.games?.name ?? "").toLowerCase().includes(q),
    );
  }, [catalog, search]);

  const selectedChallenge = catalog.find((c) => c.id === form.challenge_id) ?? null;

  /** Default headline so staff don't hand-type (and misspell) the tenant name. */
  const defaultHeadline = useMemo(() => {
    if (!selectedChallenge) return "";
    const tenantName = tenantInfo?.tenantName?.trim();
    return tenantName ? `${tenantName} — ${selectedChallenge.name}` : selectedChallenge.name;
  }, [selectedChallenge, tenantInfo?.tenantName]);

  const openCreate = (challengeId?: string) => {
    setEditing(null);
    setHeadlineTouched(false);
    setForm({ ...emptyForm, challenge_id: challengeId ?? "" });
    setDialogOpen(true);
  };


  const openEdit = (s: TenantChallengeSchedule) => {
    setEditing(s);
    setForm({
      challenge_id: s.challenge_id,
      starts_at: new Date(s.starts_at),
      ends_at: new Date(s.ends_at),
      headline: s.headline ?? "",
      promo_copy: s.promo_copy ?? "",
      is_featured: s.is_featured,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.challenge_id || !form.starts_at || !form.ends_at) {
      toast.error("Pick a challenge and both dates");
      return;
    }
    if (form.ends_at <= form.starts_at) {
      toast.error("End date must be after the start date");
      return;
    }
    const payload = {
      challenge_id: form.challenge_id,
      starts_at: form.starts_at.toISOString(),
      ends_at: form.ends_at.toISOString(),
      headline: form.headline || null,
      promo_copy: form.promo_copy || null,
      is_featured: form.is_featured,
    };
    if (editing) {
      await updateSchedule.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createSchedule.mutateAsync(payload);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  /** Quick Create parity with tenant events: compose a promo scene from the
   *  scheduled challenge, render it, and link it to a draft campaign. */
  const handleQuickCreate = async (s: TenantChallengeSchedule) => {
    const c = s.challenges;
    if (!c || !tenantId) return;
    setQuickCreating(s.id);
    try {
      const totalPoints = (c.points_first ?? 0) + (c.points_second ?? 0) + (c.points_third ?? 0);
      const scene = composePromoLayout({
        event: {
          name: s.headline || c.name,
          game: c.games?.name ?? null,
          start_date: s.starts_at,
          prize_pool: totalPoints > 0 ? String(totalPoints) : null,
          prize_type: totalPoints > 0 ? "value" : "none",
        },
        tenantPrimaryColor: tenantInfo?.primaryColor,
        tenantAccentColor: tenantInfo?.accentColor,
        format: "portrait",
        beatLabel: "Challenge",
      });
      scene.backgroundUrl = c.cover_image_url || c.games?.cover_image_url || null;

      const blob = await renderPromoSceneToBlob(scene);

      let campaignId: string | undefined;
      try {
        campaignId = await createCampaign.mutateAsync({
          title: `${c.name} — Promo`,
          description: s.promo_copy || `Promo campaign for the "${c.name}" challenge.`,
          social_copy: s.promo_copy || null,
          category: "social_media",
          tenant_id: tenantId,
          status: "pending_review",
          source_challenge_id: s.challenge_id,
          idempotency_key: `promo:challenge:${tenantId}:${s.id}`,
        });
      } catch {
        // Duplicate key or RLS block — still keep the rendered asset.
      }

      const file = new File([blob], `challenge-promo-${Date.now()}.png`, { type: "image/png" });
      await uploadAsset.mutateAsync({
        file,
        label: `${c.name} Promo`,
        campaignId,
        backgroundUrl: scene.backgroundUrl,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create promo");
    } finally {
      setQuickCreating(null);
    }
  };

  const catalogCard = (c: ScheduledChallengeInfo) => (
    <Card key={c.id} className="bg-card/90 backdrop-blur-sm">
      <CardContent className="p-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-heading font-semibold truncate">{c.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {c.games?.name ?? "No game"} · {c.difficulty}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            {(c.points_first ?? 0) + (c.points_second ?? 0) + (c.points_third ?? 0)} pts
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => openCreate(c.id)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Schedule
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">Challenges</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Open platform challenges to your players for a set date window, and promote them.
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4 mr-1" /> Schedule Challenge
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-sm uppercase tracking-widest text-muted-foreground">
          Your Scheduled Windows
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : schedules.length === 0 ? (
          <Card className="bg-card/90 backdrop-blur-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nothing scheduled yet. Pick a challenge from the catalog below.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {schedules.map((s) => {
              const st = scheduleStatus(s);
              return (
                <Card key={s.id} className="bg-card/90 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <CardTitle className="text-base font-heading">
                        {s.headline || s.challenges?.name || "Challenge"}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {s.is_featured && <Badge variant="outline">Featured</Badge>}
                        <Badge className={statusStyles[st]}>{st}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {s.challenges?.name}
                      {s.challenges?.games?.name ? ` · ${s.challenges.games.name}` : ""}
                    </p>
                    <p className="text-sm">
                      {format(new Date(s.starts_at), "PP")} — {format(new Date(s.ends_at), "PP")}
                    </p>
                    {s.promo_copy && <p className="text-sm text-muted-foreground">{s.promo_copy}</p>}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickCreate(s)}
                        disabled={quickCreating === s.id}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1" />
                        {quickCreating === s.id ? "Creating…" : "Quick Promo"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-heading text-sm uppercase tracking-widest text-muted-foreground">
            Platform Challenge Catalog
          </h2>
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search challenges"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">{filteredCatalog.map(catalogCard)}</div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Schedule" : "Schedule Challenge"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Challenge</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.challenge_id}
                onChange={(e) => setForm({ ...form, challenge_id: e.target.value })}
                disabled={!!editing}
              >
                <option value="">Select a challenge…</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.games?.name ? ` — ${c.games.name}` : ""}
                  </option>
                ))}
              </select>
              {selectedChallenge?.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {selectedChallenge.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Opens</Label>
                <DatePick
                  value={form.starts_at}
                  onChange={(d) => setForm({ ...form, starts_at: d })}
                  placeholder="Start date"
                />
              </div>
              <div className="space-y-2">
                <Label>Closes</Label>
                <DatePick
                  value={form.ends_at}
                  onChange={(d) => setForm({ ...form, ends_at: d })}
                  placeholder="End date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Headline (optional)</Label>
              <Input
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="August Fiber Sprint"
              />
            </div>
            <div className="space-y-2">
              <Label>Promo copy (optional)</Label>
              <Textarea
                value={form.promo_copy}
                onChange={(e) => setForm({ ...form, promo_copy: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="featured">Feature for my players</Label>
              <Switch
                id="featured"
                checked={form.is_featured}
                onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createSchedule.isPending || updateSchedule.isPending}
              >
                {editing ? "Save Changes" : "Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Remove Schedule"
        description="Players in your tenant will no longer be gated by this window. Existing enrollments are kept."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteSchedule.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};

export default TenantChallenges;
