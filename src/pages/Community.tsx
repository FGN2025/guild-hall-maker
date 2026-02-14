import { useState } from "react";
import { MessageSquare, Users, Megaphone, ThumbsUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopics, type CommunityTopic } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTopicDialog } from "@/components/community/CreateTopicDialog";
import { TopicDetail } from "@/components/community/TopicDetail";
import { formatDistanceToNow } from "date-fns";

const categoryColor: Record<string, string> = {
  "Team Recruitment": "text-neon-accent",
  Discussion: "text-primary",
  Announcement: "text-warning",
};

const Community = () => {
  const { user } = useAuth();
  const { data: topics, isLoading } = useTopics();
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | null>(null);

  const totalTopics = topics?.length ?? 0;
  const totalReplies = topics?.reduce((sum, t) => sum + t.reply_count, 0) ?? 0;
  const announcements = topics?.filter((t) => t.category === "Announcement").length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="py-8 container mx-auto px-4">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Connect & Discuss</p>
            <h1 className="font-display text-4xl font-bold text-foreground">Community</h1>
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
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : topics && topics.length > 0 ? (
            topics.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTopic(t)}
                className="p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-heading font-semibold text-foreground">{t.title}</p>
                  <p className="text-sm text-muted-foreground">
                    by <span className="text-foreground">{t.author_name}</span> ·{" "}
                    <span className={categoryColor[t.category] || "text-muted-foreground"}>{t.category}</span> ·{" "}
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
