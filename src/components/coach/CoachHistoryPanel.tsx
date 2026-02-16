import { Trash2, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CoachConversation } from "@/hooks/useCoachConversations";

interface CoachHistoryPanelProps {
  conversations: CoachConversation[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}

export default function CoachHistoryPanel({
  conversations,
  loading,
  activeId,
  onSelect,
  onDelete,
  onNewChat,
}: CoachHistoryPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onNewChat}
        >
          + New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            No saved conversations yet. Start chatting to save one!
          </p>
        ) : (
          <div className="py-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors",
                  activeId === c.id && "bg-accent"
                )}
                onClick={() => onSelect(c.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate text-foreground">
                    {c.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
