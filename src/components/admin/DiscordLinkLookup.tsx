import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserSearch } from "lucide-react";
import { toast } from "sonner";

interface LookupResult {
  user_id: string;
  display_name: string | null;
  discord_id: string | null;
  discord_username: string | null;
  discord_linked_at: string | null;
  email: string | null;
}

const DiscordLinkLookup = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LookupResult[] | null>(null);

  const runLookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("discord-link-lookup", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data?.results ?? []);
    } catch (err: any) {
      toast.error(err.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <UserSearch className="h-5 w-5 text-primary" /> Discord Link Lookup
        </CardTitle>
        <CardDescription>
          Find which player account currently holds a Discord username or ID. Use this when a player
          hits "already linked to another player".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Discord username or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runLookup()}
          />
          <Button onClick={runLookup} disabled={loading || !query.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {results && results.length === 0 && (
          <p className="text-sm text-muted-foreground">No profile holds that Discord identity.</p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.user_id} className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="font-heading text-foreground">{r.display_name || "(no display name)"}</div>
                <div className="text-muted-foreground break-all">{r.email || "(no email)"}</div>
                <div className="text-muted-foreground break-all">
                  Discord: {r.discord_username || "—"} · {r.discord_id || "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Linked {r.discord_linked_at ? new Date(r.discord_linked_at).toLocaleString() : "—"} ·
                  user {r.user_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscordLinkLookup;
