import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useReplies, useCreateReply, useToggleLike, type CommunityTopic } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const categoryColor: Record<string, string> = {
  "Team Recruitment": "text-neon-accent",
  Discussion: "text-primary",
  Announcement: "text-warning",
};

interface TopicDetailProps {
  topic: CommunityTopic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TopicDetail = ({ topic, open, onOpenChange }: TopicDetailProps) => {
  const { user } = useAuth();
  const { data: replies, isLoading } = useReplies(topic?.id ?? null);
  const createReply = useCreateReply();
  const toggleLike = useToggleLike();
  const [replyBody, setReplyBody] = useState("");

  if (!topic) return null;

  const handleReply = () => {
    if (!replyBody.trim()) return;
    createReply.mutate(
      { parentId: topic.id, body: replyBody.trim() },
      {
        onSuccess: () => {
          setReplyBody("");
          toast.success("Reply posted!");
        },
        onError: () => toast.error("Failed to post reply"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{topic.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            by <span className="text-foreground">{topic.author_name}</span> ·{" "}
            <span className={categoryColor[topic.category] ?? "text-muted-foreground"}>{topic.category}</span> ·{" "}
            {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
          </p>
        </DialogHeader>

        <div className="py-4 border-b border-border">
          <p className="text-foreground whitespace-pre-wrap">{topic.body}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <button
              onClick={() => user && toggleLike.mutate(topic.id)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ThumbsUp className="h-3.5 w-3.5" /> {topic.like_count}
            </button>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {topic.reply_count}
            </span>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-3 py-2">
          <h3 className="font-heading font-semibold text-foreground text-sm">Replies</h3>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : replies && replies.length > 0 ? (
            replies.map((r) => (
              <div key={r.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.body}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>
                    {r.author_name} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                  <button
                    onClick={() => user && toggleLike.mutate(r.id)}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <ThumbsUp className="h-3 w-3" /> {r.like_count}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No replies yet. Be the first!</p>
          )}
        </div>

        {/* Reply form */}
        {user && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
            />
            <Button onClick={handleReply} disabled={createReply.isPending} size="sm">
              {createReply.isPending ? "Posting..." : "Reply"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
