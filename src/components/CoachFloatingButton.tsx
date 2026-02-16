import { useRef, useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useCoachConversations } from "@/hooks/useCoachConversations";
import { useGames, Game } from "@/hooks/useGames";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import {
  BrainCircuit,
  Send,
  Trash2,
  Loader2,
  Gamepad2,
  ChevronDown,
  X,
  Download,
  FileText,
  History,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import CoachHistoryPanel from "@/components/coach/CoachHistoryPanel";

const defaultSuggestions: Record<string, string[]> = {
  general: [
    "How do I improve my game sense?",
    "Best warm-up routines?",
    "How do I deal with tilt?",
  ],
  "Rocket League": [
    "How do I improve my aerials?",
    "How should I rotate in 3v3?",
    "Best training packs for dribbling?",
  ],
  "Valorant": [
    "How do I improve crosshair placement?",
    "Best agents for solo queue?",
    "How do I lurk effectively?",
  ],
  "Fortnite": [
    "How do I build faster?",
    "Best drop strategy?",
    "How to win endgame fights?",
  ],
  "League of Legends": [
    "How do I improve my CS?",
    "When should I roam as mid?",
    "How to track enemy jungler?",
  ],
};

function getSuggestions(gameName: string | null): string[] {
  if (!gameName) return defaultSuggestions.general;
  return defaultSuggestions[gameName] || [
    `Best strategies for ${gameName}?`,
    `How do I improve at ${gameName}?`,
    `Beginner tips for ${gameName}?`,
  ];
}

export default function CoachFloatingButton() {
  const [open, setOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConvIdRef = useRef<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuth();

  const {
    conversations,
    loading: historyLoading,
    fetchConversations,
    createConversation,
    loadMessages,
    saveMessage,
    deleteConversation,
  } = useCoachConversations();

  // Keep ref in sync
  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const persistence = {
    onUserMessage: useCallback(async (content: string) => {
      if (!user) return;
      let convId = activeConvIdRef.current;
      if (!convId) {
        convId = await createConversation(
          selectedGame?.id || null,
          content.slice(0, 60)
        );
        if (convId) {
          activeConvIdRef.current = convId;
          setActiveConversationId(convId);
        }
      }
      if (convId) await saveMessage(convId, "user", content);
    }, [user, createConversation, selectedGame, saveMessage]),
    onAssistantMessage: useCallback(async (content: string) => {
      const convId = activeConvIdRef.current;
      if (convId) {
        await saveMessage(convId, "assistant", content);
      }
    }, [saveMessage]),
  };

  const { messages, isLoading, sendMessage, clearChat, setMessagesFromHistory } =
    useCoachChat(selectedGame, persistence);
  const { data: games } = useGames();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleGameSelect = (game: Game | null) => {
    setSelectedGame(game);
    clearChat();
    setActiveConversationId(null);
  };

  const handleNewChat = () => {
    clearChat();
    setActiveConversationId(null);
    setShowHistory(false);
  };

  const handleLoadConversation = useCallback(async (id: string) => {
    const msgs = await loadMessages(id);
    setMessagesFromHistory(msgs);
    setActiveConversationId(id);
    setShowHistory(false);
  }, [loadMessages, setMessagesFromHistory]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      clearChat();
      setActiveConversationId(null);
    }
  }, [deleteConversation, activeConversationId, clearChat]);

  const handleExport = () => {
    const gameName = selectedGame?.name || "General";
    const date = new Date().toISOString().slice(0, 10);
    const header = `# AI Coach Chat — ${gameName}\n_Exported on ${date}_\n`;
    const body = messages
      .map((m) => `**${m.role === "user" ? "You" : "Coach"}:** ${m.content}`)
      .join("\n\n---\n\n");
    const content = `${header}\n---\n\n${body}\n`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-coach-${gameName.toLowerCase().replace(/\s+/g, "-")}-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const gameName = selectedGame?.name || "General";
    const date = new Date().toISOString().slice(0, 10);
    const msgHtml = messages
      .map(
        (m) =>
          `<div class="${m.role}" style="margin-bottom:16px"><span class="label">${m.role === "user" ? "You" : "Coach"}:</span> ${m.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</div>`
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI Coach — ${gameName}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:700px;margin:auto}
  h1{font-size:22px;margin-bottom:4px} .date{color:#888;font-size:13px;margin-bottom:24px}
  .label{font-weight:700} .user{color:#333} .assistant{color:#0a7;border-left:3px solid #0cc;padding-left:12px}
  @media print{body{padding:20px}}
</style></head><body>
<h1>AI Coach Chat — ${gameName}</h1>
<p class="date">Exported on ${date}</p>
<hr/>
${msgHtml}
</body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }
  };

  const suggestions = getSuggestions(selectedGame?.name || null);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          "bg-primary text-primary-foreground hover:scale-110",
          "ring-2 ring-primary/30 hover:ring-primary/60",
          open && "scale-0 opacity-0 pointer-events-none"
        )}
        aria-label="Open AI Coach"
      >
        <BrainCircuit className="h-6 w-6" />
        <span className="absolute inset-0 rounded-full animate-ping bg-primary/20 pointer-events-none" />
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed z-50 flex flex-col transition-all duration-300 origin-bottom-right",
          isMobile
            ? "inset-0"
            : "bottom-6 right-6 w-[400px] h-[540px] rounded-2xl",
          "bg-background/80 backdrop-blur-xl border border-border shadow-2xl",
          open
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-90 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {showHistory ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <BrainCircuit className="h-5 w-5 text-primary shrink-0" />
            )}
            <span className="font-semibold text-sm text-foreground truncate">
              {showHistory ? "Chat History" : selectedGame ? selectedGame.name : "AI Coach"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!showHistory && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 max-w-[160px]">
                      <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">
                        {selectedGame ? selectedGame.name : "All Games"}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[260px] overflow-y-auto">
                    <DropdownMenuItem onClick={() => handleGameSelect(null)} className={!selectedGame ? "bg-accent" : ""}>
                      All Games
                    </DropdownMenuItem>
                    {games?.map((g) => (
                      <DropdownMenuItem
                        key={g.id}
                        onClick={() => handleGameSelect(g)}
                        className={selectedGame?.id === g.id ? "bg-accent" : ""}
                      >
                        {g.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => { setShowHistory(true); fetchConversations(); }}
                    title="Chat history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                )}
                {messages.length > 0 && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Download chat">
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExport}>
                          <Download className="h-3.5 w-3.5 mr-2" />
                          Markdown (.md)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPdf}>
                          <FileText className="h-3.5 w-3.5 mr-2" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleNewChat}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* History or Chat */}
        {showHistory ? (
          <CoachHistoryPanel
            conversations={conversations}
            loading={historyLoading}
            activeId={activeConversationId}
            onSelect={handleLoadConversation}
            onDelete={handleDeleteConversation}
            onNewChat={handleNewChat}
          />
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 px-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3 px-2">
                  <div className="p-3 rounded-full bg-primary/10">
                    {selectedGame ? (
                      <Gamepad2 className="h-8 w-8 text-primary" />
                    ) : (
                      <BrainCircuit className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[260px]">
                    {selectedGame
                      ? `Ask about ${selectedGame.name} strategies, mechanics & more.`
                      : "Select a game or ask general esports questions."}
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl px-3 py-2 text-xs",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-card-foreground"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-xs prose-invert max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-xl px-3 py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-3 py-2.5 border-t border-border shrink-0">
              <div className="flex gap-2 items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedGame ? `Ask about ${selectedGame.name}...` : "Ask your coach..."}
                  className="h-9 text-xs bg-card"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isLoading || !input.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
