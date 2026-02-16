import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useGames, Game } from "@/hooks/useGames";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BrainCircuit,
  Send,
  Trash2,
  Loader2,
  Gamepad2,
  ChevronDown,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  const { messages, isLoading, sendMessage, clearChat } = useCoachChat(selectedGame);
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
            <BrainCircuit className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold text-sm text-foreground truncate">
              {selectedGame ? selectedGame.name : "AI Coach"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Gamepad2 className="h-4 w-4" />
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
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={clearChat}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

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
      </div>
    </>
  );
}
