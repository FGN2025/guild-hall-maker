import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestDetail } from "@/hooks/useQuestDetail";
import { useQuestEnrollment } from "@/hooks/useQuestEnrollment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PageBackground from "@/components/PageBackground";
import TaskChecklist from "@/components/challenges/TaskChecklist";
import EvidenceUpload from "@/components/challenges/EvidenceUpload";
import EditQuestDialog from "@/components/quests/EditQuestDialog";
import StoryNarrative from "@/components/quests/StoryNarrative";
import ChainBreadcrumb from "@/components/quests/ChainBreadcrumb";
import QuestRankBadge from "@/components/quests/QuestRankBadge";
import { usePlayerQuestXP } from "@/hooks/usePlayerQuestXP";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Clock, Gamepad2, CheckCircle2, Send, Image as ImageIcon, Trash2, Pencil, Sparkles, Lock } from "lucide-react";
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

const QuestDetail = () => {
  usePageTitle("Quest Detail");
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { quest, tasks, chainSiblings, isLoading } = useQuestDetail(id);
  const { totalXP } = usePlayerQuestXP();
  const {
    enrollment, evidence, enrollmentLoading,
    enroll, enrolling,
    submitEvidence, submittingEvidence,
    submitForReview, submittingForReview,
    deleteEvidence, deletingEvidence,
  } = useQuestEnrollment(id);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quests").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quest deleted");
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      navigate("/quests");
    },
    onError: () => toast.error("Failed to delete quest"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Quest not found.</p>
        <Link to="/quests" className="text-primary hover:underline mt-2 inline-block">Back to Quests</Link>
      </div>
    );
  }

  const q = quest as any;
  const gameName = q.games?.name;
  const coverUrl = q.cover_image_url || q.games?.cover_image_url || "/placeholder.svg";
  const evidenceTaskIds = new Set(evidence.map((e) => e.task_id).filter(Boolean));
  const tasksComplete = tasks.length > 0 ? tasks.filter((t) => evidenceTaskIds.has(t.id)).length : 0;
  const progress = tasks.length > 0 ? (tasksComplete / tasks.length) * 100 : 0;
  const status = enrollment?.status ? statusLabel[enrollment.status] : null;
  const canUpload = enrollment && ["enrolled", "in_progress", "rejected"].includes(enrollment.status);
  const canSubmit = enrollment && evidence.length > 0 && ["enrolled", "in_progress", "rejected"].includes(enrollment.status);
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const chainInfo = q.quest_chains;
  const hasChain = !!q.chain_id && chainInfo;

  return (
    <>
      <PageBackground pageSlug="quests" />
      <div className="space-y-6 pb-12">
        <Link to="/quests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Quests
        </Link>

        {/* Chain Breadcrumb */}
        {hasChain && chainSiblings.length > 0 && (
          <ChainBreadcrumb
            chainName={chainInfo.name}
            chainOrder={q.chain_order}
            siblings={chainSiblings}
            currentQuestId={q.id}
          />
        )}

        {/* Hero */}
        <div className="relative group rounded-xl overflow-hidden h-52 md:h-64 cursor-pointer" onClick={() => setLightboxOpen(true)}>
          <span className="absolute top-3 right-3 z-10 text-xs text-white/60 bg-black/40 px-2 py-1 rounded-md flex items-center gap-1 group-hover:text-white/90 transition-colors">
            <ImageIcon className="h-3 w-3" /> Click for full view
          </span>
          <img src={coverUrl} alt={q.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {gameName && (
                <Badge variant="secondary" className="gap-1">
                  <Gamepad2 className="h-3 w-3" /> {gameName}
                </Badge>
              )}
              <Badge className={difficultyColor[q.difficulty] || difficultyColor.beginner}>
                {q.difficulty?.charAt(0).toUpperCase() + q.difficulty?.slice(1)}
              </Badge>
              {q.estimated_minutes && (
                <Badge variant="outline" className="text-white/80 border-white/20 gap-1">
                  <Clock className="h-3 w-3" /> ~{q.estimated_minutes} min
                </Badge>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white">{q.name}</h1>
          </div>
        </div>

        {/* Admin action bar */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit Quest
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Story Intro */}
            {q.story_intro && <StoryNarrative text={q.story_intro} variant="intro" />}

            {q.description && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-2">Description</h2>
                  <p className="text-muted-foreground font-body whitespace-pre-wrap">{q.description}</p>
                </CardContent>
              </Card>
            )}

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

                      return (
                        <div key={e.id} className="relative group space-y-1">
                          <a href={e.file_url} target="_blank" rel="noopener noreferrer">
                            <div className="rounded-lg border border-border overflow-hidden aspect-video bg-muted">
                              {e.file_type === "image" ? (
                                <img src={e.file_url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : e.file_type === "video" ? (
                                <video src={e.file_url} controls className="w-full h-full object-cover" onClick={(ev) => ev.preventDefault()} />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </a>
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

            {/* Story Outro (shown after completion) */}
            {enrollment?.status === "completed" && q.story_outro && (
              <StoryNarrative text={q.story_outro} variant="outro" />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Points</span>
                    <span className="font-mono font-semibold text-foreground">+{q.points_first}</span>
                  </div>
                  {q.xp_reward > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> XP Reward
                      </span>
                      <span className="font-mono font-semibold text-primary">+{q.xp_reward} XP</span>
                    </div>
                  )}
                  {q.start_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Starts</span>
                      <span className="text-foreground">{new Date(q.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {q.end_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ends</span>
                      <span className="text-foreground">{new Date(q.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {q.requires_evidence && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Evidence</span>
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    </div>
                  )}
                </div>

                {status && (
                  <Badge className={`w-full justify-center py-1.5 ${status.color}`}>
                    {status.label}
                  </Badge>
                )}

                {!enrollment && !enrollmentLoading && (
                  user ? (
                    <Button onClick={() => enroll()} disabled={enrolling} className="w-full gap-2">
                      {enrolling ? "Enrolling..." : "Enroll in Quest"}
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

                {enrollment?.status === "completed" && (
                  <div className="text-center py-2">
                    <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-1" />
                    <p className="text-sm text-green-400 font-medium">Quest Complete!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chain Info Card */}
            {hasChain && (
              <Card className="border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Part of Chain
                  </h3>
                  <p className="text-sm text-muted-foreground">{chainInfo.name}</p>
                  {chainInfo.bonus_points > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Complete all quests for <span className="font-mono text-primary">+{chainInfo.bonus_points} bonus pts</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
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
          <img src={coverUrl} alt={q.name} className="w-full h-auto rounded-lg object-contain max-h-[85vh]" />
        </DialogContent>
      </Dialog>

      {isAdmin && quest && (
        <>
          <EditQuestDialog
            quest={quest}
            open={editOpen}
            onOpenChange={setEditOpen}
            invalidateQueryKey={["quest-detail", id!]}
          />
          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Quest</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{q.name}" and all associated data. This action cannot be undone.
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

export default QuestDetail;
