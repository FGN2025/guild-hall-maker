import { useState } from "react";
import { MessageSquare, Users, Megaphone, ThumbsUp, Pin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopics, useCommunityRealtime, useTogglePin, type CommunityTopic } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTopicDialog } from "@/components/community/CreateTopicDialog";
import { TopicDetail } from "@/components/community/TopicDetail";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";
import usePageTitle from "@/hooks/usePageTitle";

const categoryColor: Record<string, string> = {
  "Team Recruitment": "text-neon-accent",
  Discussion: "text-primary",
  Announcement: "text-warning",
};

const Community = () => {
  usePageTitle("Community");
  const { user, isAdmin } = useAuth();
  useCommunityRealtime();
  const { data: topics, isLoading } = useTopics();
  const togglePin = useTogglePin();
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | null>(null);

  const totalTopics = topics?.length ?? 0;
  const totalReplies = topics?.reduce((sum, t) => sum + t.reply_count, 0) ?? 0;
  const announcements = topics?.filter((t) => t.category === "Announcement").length ?? 0;

  return (
    <>
      <PageBackground pageSlug="community" />
      <div className="space-y-6 relative z-10">
        <PageHero pageSlug="community" />
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2 page-heading">Connect & Discuss</p>
            <h1 className="font-display text-4xl font-bold text-foreground page-heading">Community</h1>
          </div>
          {user && <CreateTopicDialog />}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: MessageSquare, label: "Topics", value: totalTopics },
            { icon: Users, label: "Replies", value: totalReplies },
            { icon: Megaphone, label: "Announcements", value: announcements },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center glow-card">
              <s.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground font-heading">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg font-bold text-foreground">Recent Topics</h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : topics && topics.length > 0 ? (
            topics.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => setSelectedTopic(t)}
                className="p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-center gap-2">
                  {t.is_pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                  <div>
                    <p className="font-heading font-semibold text-foreground">{t.title}</p>
                    <p className="text-sm text-muted-foreground">
                      by <span className="text-foreground">{t.author_name}</span> ·{" "}
                      <span className={categoryColor[t.category] || "text-muted-foreground"}>{t.category}</span> ·{" "}
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin.mutate(
                          { postId: t.id, pinned: !t.is_pinned },
                          {
                            onSuccess: () => toast.success(t.is_pinned ? "Unpinned" : "Pinned"),
                            onError: () => toast.error("Failed to update pin"),
                          }
                        );
                      }}
                      className={`flex items-center gap-1 hover:text-primary transition-colors ${t.is_pinned ? "text-primary" : ""}`}
                      title={t.is_pinned ? "Unpin topic" : "Pin topic"}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  )}
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {t.reply_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> {t.like_count}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-heading">No topics yet</p>
              <p className="text-sm">Be the first to start a conversation!</p>
            </div>
          )}
        </div>
      </div>

      <TopicDetail topic={selectedTopic} open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)} />
    </div>
  );
};

export default Community;
