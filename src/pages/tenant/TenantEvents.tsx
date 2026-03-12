import { useState } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantEvents, type TenantEvent } from "@/hooks/useTenantEvents";
import { useGames } from "@/hooks/useGames";
import { useDiscordRoles } from "@/hooks/useDiscordRoles";
import { useImageLimits } from "@/hooks/useImageLimits";
import { validateAndToast } from "@/lib/imageValidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import PrizePoolSelector from "@/components/tournaments/PrizePoolSelector";
import { Plus, Calendar as CalendarIcon, Users, Trash2, Eye, EyeOff, Pencil, ExternalLink, Megaphone, Zap, ShieldCheck, Upload, ImageIcon, X, FileText } from "lucide-react";
import { format, format as formatDate } from "date-fns";
import { cn } from "@/lib/utils";
import CampaignCodeLinker from "@/components/tenant/CampaignCodeLinker";
import { useTenantMarketingAssets } from "@/hooks/useTenantMarketingAssets";
import { buildTenantEventPromo, renderPromoToBlob } from "@/components/marketing/TenantPromoPickerDialog";
import AssetEditorDialog from "@/components/media/AssetEditorDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-primary/10 text-primary",
  in_progress: "bg-accent/20 text-accent-foreground",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const TenantEvents = () => {
  const { tenantInfo } = useTenantAdmin();
  const { user } = useAuth();
  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useTenantEvents(tenantInfo?.tenantId);
  const { data: games = [] } = useGames();
  const { uploadAsset } = useTenantMarketingAssets();
  const { getPreset } = useImageLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TenantEvent | null>(null);
  const [promoEvent, setPromoEvent] = useState<TenantEvent | null>(null);
  const [quickCreating, setQuickCreating] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [modRequestTarget, setModRequestTarget] = useState<TenantEvent | null>(null);
  const [modRequesting, setModRequesting] = useState(false);
  const promoData = promoEvent ? buildTenantEventPromo(promoEvent, tenantInfo?.primaryColor) : null;

  const { roles: discordRoles, loading: rolesLoading } = useDiscordRoles(dialogOpen);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    game: "",
    description: "",
    format: "single_elimination",
    max_participants: 16,
    prize_pool: "",
    prize_type: "none",
    prize_id: "",
    points_participation: "2",
    discord_role_id: "",
    prize_pct_first: 50,
    prize_pct_second: 30,
    prize_pct_third: 20,
    end_date: "",
    rules: "",
    is_public: false,
    registration_open: false,
    social_copy: "",
  });
  const [startDates, setStartDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState("12:00");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateAndToast(file, getPreset("tournamentHero"));
    if (!valid) { e.target.value = ""; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm({
      name: "", game: "", description: "", format: "single_elimination",
      max_participants: 16, prize_pool: "", prize_type: "none", prize_id: "",
      points_participation: "2", discord_role_id: "",
      prize_pct_first: 50, prize_pct_second: 30, prize_pct_third: 20,
      end_date: "", rules: "", is_public: false, registration_open: false, social_copy: "",
    });
    setStartDates([]);
    setStartTime("12:00");
    setImageFile(null);
    setImagePreview(null);
    setEditingEvent(null);
  };

  const openEdit = (e: TenantEvent) => {
    setEditingEvent(e);
    setForm({
      name: e.name,
      game: e.game,
      description: e.description ?? "",
      format: e.format,
      max_participants: e.max_participants,
      prize_pool: e.prize_pool ?? "",
      prize_type: e.prize_type ?? "none",
      prize_id: e.prize_id ?? "",
      points_participation: String(e.points_participation ?? 2),
      discord_role_id: e.discord_role_id ?? "",
      prize_pct_first: e.prize_pct_first ?? 50,
      prize_pct_second: e.prize_pct_second ?? 30,
      prize_pct_third: e.prize_pct_third ?? 20,
      end_date: e.end_date ? e.end_date.slice(0, 16) : "",
      rules: e.rules ?? "",
      is_public: e.is_public,
      registration_open: e.registration_open,
      social_copy: e.social_copy ?? "",
    });
    if (e.start_date) {
      const d = new Date(e.start_date);
      setStartDates([d]);
      setStartTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
    setImagePreview(e.image_url ?? null);
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    let image_url: string | undefined = imagePreview ?? undefined;

    if (imageFile) {
      setUploadingImage(true);
      const ext = imageFile.name.split(".").pop() ?? "png";
      const filePath = `events/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("app-media").upload(filePath, imageFile, { contentType: imageFile.type });
      if (!error) {
        const { data } = supabase.storage.from("app-media").getPublicUrl(filePath);
        image_url = data.publicUrl;
        if (user) {
          await supabase.from("media_library").insert({
            user_id: user.id, file_name: imageFile.name, file_path: filePath,
            file_type: "image", mime_type: imageFile.type, file_size: imageFile.size,
            url: data.publicUrl, category: "events", tags: ["event-hero", form.name.trim()],
          } as any);
        }
      }
      setUploadingImage(false);
    }

    const sortedDates = [...startDates].sort((a, b) => a.getTime() - b.getTime());

    const buildPayload = (date: Date, eventName: string) => {
      const combinedDate = new Date(date);
      const [hours, minutes] = startTime.split(":").map(Number);
      combinedDate.setHours(hours, minutes, 0, 0);

      return {
        name: eventName,
        game: form.game.trim(),
        description: form.description || null,
        format: form.format,
        max_participants: form.max_participants,
        prize_pool: form.prize_pool || null,
        prize_type: form.prize_type,
        prize_id: form.prize_type === "physical" && form.prize_id ? form.prize_id : null,
        points_participation: parseInt(form.points_participation) || 2,
        discord_role_id: form.discord_role_id || null,
        prize_pct_first: form.prize_pct_first,
        prize_pct_second: form.prize_pct_second,
        prize_pct_third: form.prize_pct_third,
        start_date: combinedDate.toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        rules: form.rules || null,
        image_url: image_url || null,
        is_public: form.is_public,
        registration_open: form.registration_open,
        social_copy: form.social_copy || null,
      };
    };

    if (editingEvent) {
      const payload = buildPayload(sortedDates[0] || new Date(), form.name.trim());
      updateEvent.mutate({ id: editingEvent.id, ...payload }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    } else {
      for (const date of sortedDates) {
        const eventName = sortedDates.length > 1
          ? `${form.name.trim()} - ${formatDate(date, "MMM d")}`
          : form.name.trim();
        createEvent.mutate(buildPayload(date, eventName), {
          onSuccess: () => { setDialogOpen(false); resetForm(); },
        });
      }
    }
  };

  const handleQuickCreate = async (event: TenantEvent) => {
    setQuickCreating(event.id);
    try {
      const promo = buildTenantEventPromo(event, tenantInfo?.primaryColor);
      const blob = await renderPromoToBlob(promo);
      const file = new File([blob], `event-promo-${Date.now()}.png`, { type: "image/png" });
      await uploadAsset.mutateAsync({ file, label: `${event.name} Promo` });
    } catch (err: any) {
      // toast handled by mutation
    } finally {
      setQuickCreating(null);
    }
  };

  const handleModeratorRequest = async () => {
    if (!modRequestTarget || !user?.email) return;
    setModRequesting(true);
    try {
      const { error } = await supabase.functions.invoke("send-notification-email", {
        body: {
          type: "moderator_request",
          event_name: modRequestTarget.name,
          event_date: modRequestTarget.start_date,
          tenant_name: tenantInfo?.tenantName ?? "Unknown",
          user_email: user.email,
        },
      });
      if (error) throw error;
      toast.success("Moderator request sent to FGN support!");
    } catch (err: any) {
      toast.error("Failed to send request. Please try again.");
      console.error(err);
    } finally {
      setModRequesting(false);
      setModRequestTarget(null);
    }
  };

  const togglePublish = (e: TenantEvent) => {
    const newStatus = e.status === "published" ? "draft" : "published";
    updateEvent.mutate({ id: e.id, status: newStatus, is_public: newStatus === "published" });
  };

  const selectedGame = games.find((g) => g.name === form.game);
  const hasGamePdf = selectedGame?.tournament_rules_url;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm">Create and manage your branded events</p>
        </div>
        <div className="flex gap-2">
          {tenantInfo?.tenantSlug && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/events/${tenantInfo.tenantSlug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Public Page
              </a>
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Event</Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Event Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-card border-border font-body" placeholder="e.g. Friday Night Showdown" maxLength={100} />
                </div>

                {/* Game dropdown */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Game *</Label>
                  <Select value={form.game} onValueChange={(v) => setForm({ ...form, game: v })}>
                    <SelectTrigger className="bg-card border-border font-body">
                      <SelectValue placeholder="Select a game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((g) => (
                        <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="bg-card border-border font-body min-h-[80px]" maxLength={500} placeholder="Event description..." rows={3} />
                </div>

                {/* Format + Max Participants */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-heading text-sm">Format</Label>
                    <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                      <SelectTrigger className="bg-card border-border font-body"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_elimination">Single Elimination</SelectItem>
                        <SelectItem value="double_elimination">Double Elimination</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="swiss">Swiss</SelectItem>
                        <SelectItem value="battle_royale">Battle Royale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-heading text-sm">Max Participants</Label>
                    <Input type="number" min={2} max={256} value={form.max_participants}
                      onChange={(e) => setForm({ ...form, max_participants: +e.target.value })}
                      className="bg-card border-border font-body" />
                  </div>
                </div>

                {/* Start Date(s) + Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-heading text-sm">Start Date(s) *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(
                          "w-full justify-start text-left font-body bg-card border-border",
                          startDates.length === 0 && "text-muted-foreground"
                        )}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDates.length === 0
                            ? "Pick date(s)"
                            : startDates.length === 1
                              ? formatDate(startDates[0], "PPP")
                              : `${startDates.length} dates selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="multiple"
                          selected={startDates}
                          onSelect={(dates) => setStartDates(dates || [])}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {startDates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[...startDates].sort((a, b) => a.getTime() - b.getTime()).map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {formatDate(d, "MMM d")}
                            <button type="button" onClick={() => setStartDates(prev => prev.filter((_, idx) => idx !== i))}
                              className="hover:text-destructive transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-heading text-sm">Start Time *</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                      className="bg-card border-border font-body" />
                  </div>
                </div>

                {/* End Date (event-specific) */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">End Date</Label>
                  <Input type="datetime-local" value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="bg-card border-border font-body" />
                </div>

                {/* Prize Pool Selector */}
                <PrizePoolSelector
                  prizeType={form.prize_type}
                  onPrizeTypeChange={(v) => setForm({ ...form, prize_type: v })}
                  prizePool={form.prize_pool}
                  onPrizePoolChange={(v) => setForm({ ...form, prize_pool: v })}
                  prizeId={form.prize_id}
                  onPrizeIdChange={(v) => setForm({ ...form, prize_id: v })}
                  pointsFirst={0}
                  pointsSecond={0}
                  pointsThird={0}
                  prizePctFirst={form.prize_pct_first}
                  prizePctSecond={form.prize_pct_second}
                  prizePctThird={form.prize_pct_third}
                  onPrizePctFirstChange={(v) => setForm({ ...form, prize_pct_first: v })}
                  onPrizePctSecondChange={(v) => setForm({ ...form, prize_pct_second: v })}
                  onPrizePctThirdChange={(v) => setForm({ ...form, prize_pct_third: v })}
                />

                {/* Hero Image */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Hero Image</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-sm font-heading text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      <Upload className="h-4 w-4" />
                      {imageFile ? imageFile.name : "Upload image"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    <Button type="button" variant="outline" size="sm"
                      className="font-heading gap-2 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => setMediaPickerOpen(true)}>
                      <ImageIcon className="h-4 w-4" /> Media Library
                    </Button>
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="h-10 w-10 rounded object-cover border border-border" />
                    )}
                  </div>
                  <MediaPickerDialog
                    open={mediaPickerOpen}
                    onOpenChange={setMediaPickerOpen}
                    onSelect={(url) => { setImageFile(null); setImagePreview(url); }}
                  />
                </div>

                {/* Participation Points */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Participation Points</Label>
                  <p className="text-xs text-muted-foreground">Points awarded per match played</p>
                  <Input type="number" min={0} value={form.points_participation}
                    onChange={(e) => setForm({ ...form, points_participation: e.target.value })}
                    className="bg-card border-border font-body max-w-[120px]" />
                </div>

                {/* Discord Role */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Discord Role (on registration)</Label>
                  <Select value={form.discord_role_id} onValueChange={(v) => setForm({ ...form, discord_role_id: v })}>
                    <SelectTrigger className="bg-card border-border font-body">
                      <SelectValue placeholder={rolesLoading ? "Loading roles…" : "None"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {discordRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Automatically assign this Discord role when a player registers</p>
                </div>

                {/* Rules with PDF auto-link */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Rules</Label>
                  {hasGamePdf && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground">{selectedGame!.name} has standard rules PDF</span>
                      <Button type="button" variant="outline" size="sm" className="ml-auto text-xs h-7"
                        onClick={() => setForm({ ...form, rules: selectedGame!.tournament_rules_url! })}>
                        Use Game Rules PDF
                      </Button>
                    </div>
                  )}
                  {form.rules && /^https?:\/\/.+\.pdf(\?.*)?$/i.test(form.rules) ? (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border">
                      <FileText className="h-4 w-4 text-primary" />
                      <a href={form.rules} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate">View Rules PDF</a>
                      <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-xs"
                        onClick={() => setForm({ ...form, rules: "" })}>Switch to Freeform</Button>
                    </div>
                  ) : (
                    <Textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })}
                      className="bg-card border-border font-body min-h-[80px]" maxLength={2000} placeholder="Event rules..." rows={3} />
                  )}
                </div>

                {/* Social Copy (event-specific) */}
                <div className="space-y-2">
                  <Label className="font-heading text-sm">Social Copy</Label>
                  <Textarea value={form.social_copy} onChange={(e) => setForm({ ...form, social_copy: e.target.value })}
                    className="bg-card border-border font-body" rows={2} placeholder="Pre-written social media text..." />
                </div>

                {/* Campaign Code Linker (edit only) */}
                {editingEvent && (
                  <CampaignCodeLinker
                    eventId={editingEvent.id}
                    eventTitle={editingEvent.name}
                    tenantId={tenantInfo?.tenantId ?? null}
                  />
                )}

                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <Label>Registration Open</Label>
                  <Switch checked={form.registration_open} onCheckedChange={(c) => setForm({ ...form, registration_open: c })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Public (visible on event page)</Label>
                  <Switch checked={form.is_public} onCheckedChange={(c) => setForm({ ...form, is_public: c })} />
                </div>

                <Button onClick={handleSubmit}
                  disabled={!form.name || !form.game || startDates.length === 0 || createEvent.isPending || updateEvent.isPending || uploadingImage}
                  className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5">
                  {uploadingImage ? "Uploading…" : editingEvent ? "Save Changes" : startDates.length > 1 ? `Create ${startDates.length} Events` : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No events yet. Create your first event to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-display">{event.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(event.start_date), "MMM d, yyyy h:mm a")}
                      {event.game && <Badge variant="outline" className="ml-1">{event.game}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[event.status] ?? ""}>{event.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Users className="h-4 w-4" /> Max {event.max_participants} participants
                  {event.format && <span className="ml-2">• {event.format.replace(/_/g, " ")}</span>}
                  {event.prize_pool && <span className="ml-2">• {event.prize_pool}</span>}
                </div>
                {event.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>}
                <CampaignCodeLinker
                  eventId={event.id}
                  eventTitle={event.name}
                  tenantId={tenantInfo?.tenantId ?? null}
                  readOnly
                />
                <div className="flex gap-2 flex-wrap mt-3">
                  <Button size="sm" variant="outline" onClick={() => handleQuickCreate(event)} disabled={quickCreating === event.id}>
                    <Zap className="h-3.5 w-3.5 mr-1" /> {quickCreating === event.id ? "Creating…" : "Quick Promo"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPromoEvent(event)}><Megaphone className="h-3.5 w-3.5 mr-1" /> Edit Promo</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(event)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublish(event)}>
                    {event.status === "published" ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Unpublish</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Publish</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setModRequestTarget(event)}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Request Moderator
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(event.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {promoData && (
        <AssetEditorDialog
          open={!!promoEvent}
          onOpenChange={(o) => { if (!o) setPromoEvent(null); }}
          baseImageUrl={promoData.imageUrl}
          initialTexts={promoData.texts}
          onSave={async (blob) => {
            const file = new File([blob], `event-promo-${Date.now()}.png`, { type: "image/png" });
            await uploadAsset.mutateAsync({ file, label: `${promoEvent!.name} Promo` });
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteEvent.mutate(deleteTarget); setDeleteTarget(null); }}
      />

      <ConfirmDialog
        open={!!modRequestTarget}
        onOpenChange={(o) => { if (!o) setModRequestTarget(null); }}
        title="Request Moderator"
        description={`Send a moderator request to FGN support for "${modRequestTarget?.name ?? ""}"? Support will respond to ${user?.email ?? "your email"}.`}
        confirmLabel={modRequesting ? "Sending…" : "Send Request"}
        onConfirm={handleModeratorRequest}
      />
    </div>
  );
};

export default TenantEvents;
