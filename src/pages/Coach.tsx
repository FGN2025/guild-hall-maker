import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useGames, Game } from "@/hooks/useGames";
import { BrainCircuit, Send, Trash2, Loader2, Gamepad2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const defaultSuggestions: Record<string, string[]> = {
  general: [
    "How do I improve my game sense?",
    "What are the best warm-up routines?",
    "How do I deal with tilt?",
  ],
  "Rocket League": [
    "How do I improve my aerial game?",
    "How should I rotate in 3v3?",
    "What are the best training packs for dribbling?",
  ],
  "Valorant": [
    "How do I improve my crosshair placement?",
    "What agents are best for solo queue?",
    "How do I lurk effectively?",
  ],
  "Fortnite": [
    "How do I improve my building speed?",
    "What's the best drop strategy?",
    "How do I win more endgame fights?",
  ],
  "League of Legends": [
    "How do I improve my CS?",
    "When should I roam as mid?",
    "How do I track the enemy jungler?",
  ],
};

function getSuggestions(gameName: string | null): string[] {
  if (!gameName) return defaultSuggestions.general;
  return defaultSuggestions[gameName] || [
    `What are the best strategies for ${gameName}?`,
    `How do I improve at ${gameName}?`,
    `What should beginners focus on in ${gameName}?`,
  ];
}

export default function Coach() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const { messages, isLoading, sendMessage, clearChat } = useCoachChat(selectedGame);
  const { data: games } = useGames();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">FGN AI Coach</h1>
            <p className="text-xs text-muted-foreground">
              {selectedGame ? `Coaching: ${selectedGame.name}` : "General esports coaching"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Game Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Gamepad2 className="h-4 w-4" />
                <span className="hidden sm:inline">{selectedGame?.name || "All Games"}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
              <DropdownMenuItem onClick={() => handleGameSelect(null)} className={!selectedGame ? "bg-accent" : ""}>
                All Games (General)
              </DropdownMenuItem>
              {games?.map((game) => (
                <DropdownMenuItem
                  key={game.id}
                  onClick={() => handleGameSelect(game)}
                  className={selectedGame?.id === game.id ? "bg-accent" : ""}
                >
                  {game.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              {selectedGame ? (
                <Gamepad2 className="h-12 w-12 text-primary" />
              ) : (
                <BrainCircuit className="h-12 w-12 text-primary" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {selectedGame ? `${selectedGame.name} Coach` : "Ask your AI Coach"}
            </h2>
            <p className="text-muted-foreground max-w-md text-sm">
              {selectedGame
                ? `Get specialized coaching for ${selectedGame.name}. Ask about strategies, mechanics, and improvement plans.`
                : "Select a game above for specialized coaching, or ask general esports questions."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 py-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-card-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none">
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
              <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedGame ? `Ask about ${selectedGame.name}...` : "Ask your coach anything..."}
            className="min-h-[44px] max-h-[120px] resize-none bg-card"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
