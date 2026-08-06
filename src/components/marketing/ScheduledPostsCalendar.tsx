import { useState } from "react";
import { useScheduledPosts, ScheduledPost } from "@/hooks/useScheduledPosts";
import { useDraftDecision } from "@/hooks/useDraftDecision";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/hooks/canvas/canvasTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Facebook, Instagram, Twitter, Linkedin, CalendarIcon, X, Clock, ExternalLink, AlertTriangle, Check } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { StoredImage } from "@/components/marketing/StoredImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
};

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending_review: {
    label: "Awaiting approval",
    variant: "outline",
    className: "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  pending: { label: "Scheduled", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  rejected: {
    label: "Rejected",
    variant: "outline",
    className: "border-destructive/60 bg-destructive/10 text-destructive",
  },
  cancelled: { label: "Cancelled", variant: "outline" },
};

interface Props {
  tenantId?: string | null;
}

const ScheduledPostsCalendar = ({ tenantId }: Props) => {
  const { posts, isLoading, cancelPost, reschedulePost } = useScheduledPosts(tenantId);
  const { tenantInfo } = useTenantAdmin();
  const decide = useDraftDecision(tenantId);
  const role = tenantInfo?.tenantRole;
  const canDecide = role === "admin" || role === "manager";

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [detailPost, setDetailPost] = useState<ScheduledPost | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const postsForDate = selectedDate
    ? posts.filter((p) => isSameDay(parseISO(p.scheduled_at), selectedDate))
    : [];

  const pendingDates = posts
    .filter((p) => p.status === "pending" || p.status === "pending_review")
    .map((p) => parseISO(p.scheduled_at));

  const handleCancel = async (id: string) => {
    await cancelPost.mutateAsync(id);
    setDetailPost(null);
  };

  const handleReschedule = async () => {
    if (!detailPost || !newDate) return;
    const original = parseISO(detailPost.scheduled_at);
    newDate.setHours(original.getHours(), original.getMinutes());
    await reschedulePost.mutateAsync({ id: detailPost.id, scheduled_at: newDate.toISOString() });
    setRescheduleOpen(false);
    setDetailPost(null);
  };

  const handleApprove = async () => {
    if (!detailPost) return;
    await decide.mutateAsync(
      { row: { id: detailPost.id, kind: "scheduled_post" }, approve: true, note: null },
      {
        onSuccess: () => {
          setDetailPost((p) => (p ? { ...p, status: "pending" } : p));
        },
      },
    );
  };

  const handleReject = async () => {
    if (!detailPost) return;
    if (!rejectNote.trim()) {
      toast.error("Add a feedback note so the agent can revise.");
      return;
    }
    await decide.mutateAsync(
      { row: { id: detailPost.id, kind: "scheduled_post" }, approve: false, note: rejectNote },
      {
        onSuccess: () => {
          setDetailPost((p) => (p ? { ...p, status: "rejected", feedback_note: rejectNote } as ScheduledPost : p));
          setRejectOpen(false);
          setRejectNote("");
        },
      },
    );
  };

  const detailStatusMeta = detailPost ? STATUS_STYLES[detailPost.status] : null;
  const detailIsDecidable =
    !!detailPost && (detailPost.status === "pending_review" || detailPost.status === "rejected");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">Scheduled Posts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your upcoming social media posts.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <Card className="shrink-0">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("p-3 pointer-events-auto")}
              modifiers={{ hasPost: pendingDates }}
              modifiersStyles={{
                hasPost: { fontWeight: "bold", textDecoration: "underline", textDecorationColor: "hsl(var(--primary))" },
              }}
            />
          </CardContent>
        </Card>

        {/* Posts list */}
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-heading text-muted-foreground">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : postsForDate.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No posts scheduled for this date.</p>
          ) : (
            postsForDate.map((post) => {
              const status = STATUS_STYLES[post.status] || STATUS_STYLES.pending;
              return (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setDetailPost(post)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className="h-8 w-8 rounded flex items-center justify-center text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: PLATFORM_COLORS[post.platform] }}
                    >
                      {PLATFORM_ICONS[post.platform]}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{PLATFORM_LABELS[post.platform]}</span>
                        <Badge variant={status.variant} className={cn("text-[10px]", status.className)}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(post.scheduled_at), "h:mm a")}
                      </p>
                      {post.caption && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{post.caption}</p>
                      )}
                    </div>
                    {(post.image_path || post.image_url) && (
                      <StoredImage
                        path={post.image_path}
                        fallbackUrl={post.image_url}
                        className="h-12 w-12 rounded object-cover shrink-0"
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Post Detail Dialog */}
      <Dialog open={!!detailPost} onOpenChange={(open) => { if (!open) setDetailPost(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              {detailPost && PLATFORM_ICONS[detailPost.platform]}
              Scheduled Post
            </DialogTitle>
          </DialogHeader>
          {detailPost && (
            <div className="space-y-4">
              {(detailPost.image_path || detailPost.image_url) && (
                <StoredImage
                  path={detailPost.image_path}
                  fallbackUrl={detailPost.image_url}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{PLATFORM_LABELS[detailPost.platform]}</span>
                  <Badge variant={detailStatusMeta?.variant || "secondary"} className={detailStatusMeta?.className}>
                    {detailStatusMeta?.label || detailPost.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {format(parseISO(detailPost.scheduled_at), "PPP 'at' h:mm a")}
                </p>
                {detailPost.caption && (
                  <p className="text-sm bg-muted rounded-lg p-3">{detailPost.caption}</p>
                )}
                {detailPost.feedback_note && (
                  <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
                    <span className="font-semibold">Previous feedback:</span> {detailPost.feedback_note}
                  </div>
                )}
                {detailPost.error_message && (
                  <p className="text-sm text-destructive flex items-start gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {detailPost.error_message}
                  </p>
                )}
                {detailPost.post_url && (
                  <a
                    href={detailPost.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Post
                  </a>
                )}
                {detailIsDecidable && !canDecide && (
                  <p className="text-xs text-muted-foreground italic">
                    Read-only: only tenant admins and managers can approve or reject drafts.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailIsDecidable && canDecide && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setRejectNote(""); setRejectOpen(true); }}
                  disabled={decide.isPending}
                >
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={handleApprove} disabled={decide.isPending}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
              </>
            )}
            {detailPost?.status === "pending" && (
              <>
                <Button variant="outline" onClick={() => { setNewDate(parseISO(detailPost.scheduled_at)); setRescheduleOpen(true); }}>
                  <CalendarIcon className="h-4 w-4 mr-1" /> Reschedule
                </Button>
                <Button variant="destructive" onClick={() => handleCancel(detailPost.id)} disabled={cancelPost.isPending}>
                  <X className="h-4 w-4 mr-1" /> Cancel Post
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Reject with feedback</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Explain what needs to change so the agent can revise this draft.
          </p>
          <Textarea
            placeholder="Feedback for the agent (required)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={decide.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={decide.isPending || !rejectNote.trim()}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Reschedule Post</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={newDate}
            onSelect={setNewDate}
            disabled={(date) => date < new Date()}
            className={cn("p-3 pointer-events-auto")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={!newDate || reschedulePost.isPending}>
              <Check className="h-4 w-4 mr-1" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledPostsCalendar;
