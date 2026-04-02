import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import usePageTitle from "@/hooks/usePageTitle";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import { useChallengeEnrollment } from "@/hooks/useChallengeEnrollment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PageBackground from "@/components/PageBackground";
import TaskChecklist from "@/components/challenges/TaskChecklist";
import EvidenceUpload from "@/components/challenges/EvidenceUpload";
import EditChallengeDialog from "@/components/challenges/EditChallengeDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AchievementBadgeDisplay from "@/components/shared/AchievementBadgeDisplay";
import { ArrowLeft, Clock, Users, Signal, Gamepad2, CheckCircle2, Send, Image as ImageIcon, Trash2, Pencil, Copy, ExternalLink, Play, LogOut } from "lucide-react";
import { useCopyContent } from "@/hooks/useCopyContent";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusLabel: Record<string, { label: string; color: string }> = {
  enrolled: { label: "Enrolled", color: "bg-blue-500/20 text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-yellow-500/20 text-yellow-400" },
  submitted: { label: "Submitted for Review", color: "bg-purple-500/20 text-purple-400" },
  completed: { label: "Completed ✓", color: "bg-green-500/20 text-green-400" },
  rejected: { label: "Needs Revision", color: "bg-red-500/20 text-red-400" },
};

/** Shape returned by useChallengeDetail for a single challenge row joined with games */
type ChallengeRow = NonNullable<ReturnType<typeof useChallengeDetail>["challenge"]>;

const ChallengeDetail = () => {
  usePageTitle("Challenge Detail");
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { challenge, tasks, isLoading } = useChallengeDetail(id);
  const {
    enrollment, evidence, enrollmentLoading,
    enroll, enrolling,
    submitEvidence, submittingEvidence,
    submitForReview, submittingForReview,
    deleteEvidence, deletingEvidence,
    unenroll, unenrolling,
  } = useChallengeEnrollment(id);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [unenrollConfirmOpen, setUnenrollConfirmOpen] = useState(false);
  const { copying, copyToQuest } = useCopyContent();

  // Fetch completion record to check academy sync status
  const { data: completion } = useQuery({
    queryKey: ["challenge-completion", id, user?.id],
    enabled: !!id && !!user && enrollment?.status === "completed",
    queryFn: async () => {
      const { data } = await supabase
        .from("challenge_completions")
        .select("id, academy_synced, academy_sync_note, academy_next_step")
        .eq("user_id", user!.id)
        .eq("challenge_id", id!)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("challenges").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge deleted");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      navigate("/challenges");
    },
    onError: () => toast.error("Failed to delete challenge"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Challenge not found.</p>
        <Link to="/challenges" className="text-primary hover:underline mt-2 inline-block">Back to Challenges</Link>
      </div>
    );
  }

  const c = challenge as ChallengeRow;
  const gameName = c.games?.name;
  const coverUrl = c.cover_image_url || c.games?.cover_image_url || "/placeholder.svg";
  const evidenceTaskIds = new Set(evidence.map((e) => e.task_id).filter(Boolean));
  const tasksComplete = tasks.length > 0 ? tasks.filter((t) => evidenceTaskIds.has(t.id)).length : 0;
  const progress = tasks.length > 0 ? (tasksComplete / tasks.length) * 100 : 0;
  const status = enrollment?.status ? statusLabel[enrollment.status] : null;
  const canUpload = enrollment && ["enrolled", "in_progress", "rejected"].includes(enrollment.status);
  const canSubmit = enrollment && evidence.length > 0 && ["enrolled", "in_progress", "rejected"].includes(enrollment.status);
  const canUnenroll = enrollment && ["enrolled", "in_progress", "rejected"].includes(enrollment.status);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <>
      <PageBackground pageSlug="challenges" />
      <div className="space-y-6 pb-12">
        <Link to="/challenges" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Challenges
        </Link>

        {/* Hero */}
        <div className="relative group rounded-xl overflow-hidden h-52 md:h-64 cursor-pointer" onClick={() => setLightboxOpen(true)}>
          <span className="absolute top-3 right-3 z-10 text-xs text-white/60 bg-black/40 px-2 py-1 rounded-md flex items-center gap-1 group-hover:text-white/90 transition-colors">
            <ImageIcon className="h-3 w-3" /> Click for full view
          </span>
          <img src={coverUrl} alt={c.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {gameName && (
                <Badge variant="secondary" className="gap-1">
                  <Gamepad2 className="h-3 w-3" /> {gameName}
                </Badge>
              )}
              <Badge className={difficultyColor[c.difficulty] || difficultyColor.beginner}>
                {c.difficulty?.charAt(0).toUpperCase() + c.difficulty?.slice(1)}
              </Badge>
              {c.estimated_minutes && (
                <Badge variant="outline" className="text-white/80 border-white/20 gap-1">
                  <Clock className="h-3 w-3" /> ~{c.estimated_minutes} min
                </Badge>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white">{c.name}</h1>
          </div>
        </div>

        {/* Admin action bar */}
        {(isAdmin || isModerator) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit Challenge
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyToQuest(id!)} disabled={copying}>
              <Copy className="h-4 w-4" /> {copying ? "Copying..." : "Copy to Quest"}
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {c.description && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-2">Description</h2>
                  <p className="text-muted-foreground font-body whitespace-pre-wrap">{c.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Tasks */}
            {tasks.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  {enrollment && (
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Task Progress</span>
                        <span className="font-mono text-foreground">{tasksComplete}/{tasks.length}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  <TaskChecklist
                    tasks={tasks}
                    evidenceTaskIds={evidenceTaskIds}
                    canUpload={!!canUpload}
                    onUploadEvidence={(taskId) => {
                      setActiveTaskId(taskId);
                      setEvidenceOpen(true);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Evidence gallery */}
            {evidence.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-display text-sm font-semibold text-foreground mb-3">
                    Submitted Evidence ({evidence.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {evidence.map((e) => {
                      const evidenceStatus = e.status || "pending";
                      const statusColor = evidenceStatus === "approved"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : evidenceStatus === "rejected"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
                      const taskForEvidence = tasks.find((t) => t.id === e.task_id);

                      const ytMatch = e.file_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
                      const twitchClipMatch = e.file_url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
                      const twitchVideoMatch = e.file_url.match(/twitch\.tv\/videos\/(\d+)/);

                      return (
                        <div key={e.id} className="relative group space-y-1">
                          <div className="rounded-lg border border-border overflow-hidden aspect-video bg-muted">
                            {e.file_type === "image" ? (
                              <a href={e.file_url} target="_blank" rel="noopener noreferrer">
                                <img src={e.file_url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </a>
                            ) : e.file_type === "video" ? (
                              <video src={e.file_url} controls className="w-full h-full object-cover" />
                            ) : e.file_type === "video_link" && ytMatch ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                                title="YouTube video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                              />
                            ) : e.file_type === "video_link" && twitchClipMatch ? (
                              <iframe
                                src={`https://clips.twitch.tv/embed?clip=${twitchClipMatch[1]}&parent=${window.location.hostname}`}
                                title="Twitch clip"
                                allowFullScreen
                                className="w-full h-full"
                              />
                            ) : e.file_type === "video_link" && twitchVideoMatch ? (
                              <iframe
                                src={`https://player.twitch.tv/?video=${twitchVideoMatch[1]}&parent=${window.location.hostname}`}
                                title="Twitch video"
                                allowFullScreen
                                className="w-full h-full"
                              />
                            ) : e.file_type === "video_link" ? (
                              <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-full gap-2 hover:bg-accent/50 transition-colors">
                                <ExternalLink className="h-8 w-8 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Open video link</span>
                              </a>
                            ) : (
                              <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-full">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                          {canUpload && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteEvidence(e.id)}
                              disabled={deletingEvidence}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Badge className={`text-[10px] px-1.5 py-0 ${statusColor}`}>{evidenceStatus}</Badge>
                            {taskForEvidence && <span className="text-[10px] text-muted-foreground truncate">{taskForEvidence.title}</span>}
                          </div>
                          {e.notes && <p className="text-xs text-muted-foreground line-clamp-1">{e.notes}</p>}
                          {e.reviewer_notes && (
                            <p className="text-xs text-muted-foreground italic line-clamp-2">
                              Feedback: {e.reviewer_notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Points</span>
                    <span className="font-mono font-semibold text-foreground">+{c.points_first}</span>
                  </div>
                  {c.start_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Starts</span>
                      <span className="text-foreground">{new Date(c.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {c.end_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ends</span>
                      <span className="text-foreground">{new Date(c.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {c.requires_evidence && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Evidence</span>
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    </div>
                  )}
                </div>

                {c.achievement_id && (
                  <div>
                    <span className="text-xs text-muted-foreground mb-1 block">Earn on Completion</span>
                    <AchievementBadgeDisplay achievementId={c.achievement_id} />
                  </div>
                )}

                {status && (
                  <Badge className={`w-full justify-center py-1.5 ${status.color}`}>
                    {status.label}
                  </Badge>
                )}

                {!enrollment && !enrollmentLoading && (
                  user ? (
                    <Button onClick={() => enroll()} disabled={enrolling} className="w-full gap-2">
                      {enrolling ? "Enrolling..." : "Enroll in Challenge"}
                    </Button>
                  ) : (
                    <Button onClick={() => navigate("/auth")} className="w-full gap-2">
                      Sign In to Participate
                    </Button>
                  )
                )}

                {canUpload && tasks.length === 0 && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setActiveTaskId(undefined);
                      setEvidenceOpen(true);
                    }}
                  >
                    <ImageIcon className="h-4 w-4" /> Upload Evidence
                  </Button>
                )}

                {canSubmit && (
                  <Button
                    variant="secondary"
                    className="w-full gap-2"
                    onClick={() => submitForReview()}
                    disabled={submittingForReview}
                  >
                    <Send className="h-4 w-4" />
                    {submittingForReview ? "Submitting..." : "Submit for Review"}
                  </Button>
                )}

                {canUnenroll && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setUnenrollConfirmOpen(true)}
                    disabled={unenrolling}
                  >
                    <LogOut className="h-4 w-4" />
                    {unenrolling ? "Unenrolling..." : "Unenroll"}
                  </Button>

                {enrollment?.status === "completed" && (
                  <div className="text-center py-2 space-y-3">
                    <div>
                      <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-1" />
                      <p className="text-sm text-green-400 font-medium">Challenge Complete!</p>
                    </div>
                    {/* Academy next step — personalized or fallback */}
                    {(() => {
                      const nextStep = (completion as any)?.academy_next_step
                        || (c.academy_next_step_url ? { title: c.academy_next_step_label || "Continue on FGN Academy", url: c.academy_next_step_url, description: "Further skills development is available on FGN Academy." } : null);

                      if (nextStep?.url) {
                        return (
                          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-left space-y-2">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              🎓 Continue Your Training
                            </p>
                            <p className="text-xs text-muted-foreground">{nextStep.description || "Take the next step in your skills development journey."}</p>
                            <a
                              href={nextStep.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 underline"
                            >
                              {nextStep.title || "Open on FGN Academy"} →
                            </a>
                          </div>
                        );
                      }

                      // Fallback: not synced, show generic signup
                      if (completion && !(completion as any).academy_synced) {
                        return (
                          <div className="bg-accent/30 border border-accent/50 rounded-lg p-3 text-left">
                            <p className="text-xs text-muted-foreground">
                              📚 Track your skills on{" "}
                              <a
                                href="https://fgn.academy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:text-primary/80"
                              >
                                FGN Academy
                              </a>{" "}
                              — sign up with the same email to earn credentials and build your Skill Passport.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <EvidenceUpload
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        taskId={activeTaskId}
        taskTitle={activeTask?.title}
        onSubmit={submitEvidence}
      />

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
          <img src={coverUrl} alt={c.name} className="w-full h-auto rounded-lg object-contain max-h-[85vh]" />
        </DialogContent>
      </Dialog>

      {(isAdmin || isModerator) && challenge && (
        <>
          <EditChallengeDialog
            challenge={challenge}
            open={editOpen}
            onOpenChange={setEditOpen}
            invalidateQueryKey={["challenge-detail", id!]}
          />
          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{c.name}" and all associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
};

export default ChallengeDetail;
