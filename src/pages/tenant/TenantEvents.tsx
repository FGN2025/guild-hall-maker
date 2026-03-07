import { useState } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantEvents, type TenantEvent } from "@/hooks/useTenantEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, Users, Trash2, Eye, EyeOff, Pencil, ExternalLink, Megaphone } from "lucide-react";
import { format } from "date-fns";
import CampaignCodeLinker from "@/components/tenant/CampaignCodeLinker";
import { useTenantMarketingAssets } from "@/hooks/useTenantMarketingAssets";
import { buildTenantEventPromo } from "@/components/marketing/TenantPromoPickerDialog";
import AssetEditorDialog from "@/components/media/AssetEditorDialog";


const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-primary/10 text-primary",
  in_progress: "bg-accent/20 text-accent-foreground",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const TenantEvents = () => {
  const { tenantInfo } = useTenantAdmin();
  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useTenantEvents(tenantInfo?.tenantId);
  const { uploadAsset } = useTenantMarketingAssets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TenantEvent | null>(null);
  const [promoEvent, setPromoEvent] = useState<TenantEvent | null>(null);
  const promoData = promoEvent ? buildTenantEventPromo(promoEvent) : null;

  const [form, setForm] = useState({
    name: "",
    game: "",
    description: "",
    format: "single_elimination",
    max_participants: 16,
    prize_pool: "",
    start_date: "",
    end_date: "",
    rules: "",
    is_public: false,
    registration_open: false,
    social_copy: "",
  });

  const resetForm = () => {
    setForm({
      name: "", game: "", description: "", format: "single_elimination",
      max_participants: 16, prize_pool: "", start_date: "", end_date: "",
      rules: "", is_public: false, registration_open: false, social_copy: "",
    });
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
      start_date: e.start_date ? e.start_date.slice(0, 16) : "",
      end_date: e.end_date ? e.end_date.slice(0, 16) : "",
      rules: e.rules ?? "",
      is_public: e.is_public,
      registration_open: e.registration_open,
      social_copy: e.social_copy ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      prize_pool: form.prize_pool || null,
      description: form.description || null,
      rules: form.rules || null,
      social_copy: form.social_copy || null,
    };

    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...payload }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    } else {
      createEvent.mutate(payload, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    }
  };

  const togglePublish = (e: TenantEvent) => {
    const newStatus = e.status === "published" ? "draft" : "published";
    updateEvent.mutate({ id: e.id, status: newStatus, is_public: newStatus === "published" });
  };

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
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Event Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Game *</Label><Input value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Format</Label>
                    <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_elimination">Single Elimination</SelectItem>
                        <SelectItem value="double_elimination">Double Elimination</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="swiss">Swiss</SelectItem>
                        <SelectItem value="free_for_all">Free for All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Max Participants</Label><Input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: +e.target.value })} /></div>
                </div>
                <div><Label>Prize Pool</Label><Input value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: e.target.value })} placeholder="e.g. $500" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date *</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <div><Label>Rules</Label><Textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} rows={3} /></div>
                <div><Label>Social Copy</Label><Textarea value={form.social_copy} onChange={(e) => setForm({ ...form, social_copy: e.target.value })} rows={2} placeholder="Pre-written social media text..." /></div>
                {editingEvent && (
                  <CampaignCodeLinker
                    eventId={editingEvent.id}
                    eventTitle={editingEvent.name}
                    tenantId={tenantInfo?.tenantId ?? null}
                  />
                )}
                <div className="flex items-center justify-between">
                  <Label>Registration Open</Label>
                  <Switch checked={form.registration_open} onCheckedChange={(c) => setForm({ ...form, registration_open: c })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Public (visible on event page)</Label>
                  <Switch checked={form.is_public} onCheckedChange={(c) => setForm({ ...form, is_public: c })} />
                </div>
                <Button onClick={handleSubmit} disabled={!form.name || !form.start_date || createEvent.isPending || updateEvent.isPending} className="w-full">
                  {editingEvent ? "Save Changes" : "Create Event"}
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
                      <Calendar className="h-4 w-4" />
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
                  <Button size="sm" variant="outline" onClick={() => setPromoEvent(event)}><Megaphone className="h-3.5 w-3.5 mr-1" /> Promo</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(event)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublish(event)}>
                    {event.status === "published" ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Unpublish</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Publish</>}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this event?")) deleteEvent.mutate(event.id); }}>
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
    </div>
  );
};

export default TenantEvents;
