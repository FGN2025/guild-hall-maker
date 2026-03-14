import { useState } from "react";
import { useGameServers, useServerStatus, type GameServer } from "@/hooks/useGameServers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Server, Copy, ChevronDown, Users, Gamepad2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import usePageTitle from "@/hooks/usePageTitle";

function StatusDot({ server }: { server: GameServer }) {
  const hasPanelConfig = server.panel_type === "pterodactyl";
  const { data, isLoading } = useServerStatus(server.id, hasPanelConfig);

  if (!hasPanelConfig) return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" title="No live status" />;
  if (isLoading) return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40 animate-pulse" />;
  if (!data || data.is_online === null) return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />;

  return (
    <span className={`h-2.5 w-2.5 rounded-full ${data.is_online ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-destructive"}`} title={data.is_online ? "Online" : "Offline"} />
  );
}

function PlayerCount({ server }: { server: GameServer }) {
  const hasPanelConfig = server.panel_type === "pterodactyl";
  const { data } = useServerStatus(server.id, hasPanelConfig);

  if (data?.current_players != null) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Users className="h-3 w-3" />
        {data.current_players}/{data.max_players ?? server.max_players ?? "?"}
      </Badge>
    );
  }

  if (server.max_players) {
    return (
      <Badge variant="outline" className="gap-1">
        <Users className="h-3 w-3" />
        Max {server.max_players}
      </Badge>
    );
  }

  return null;
}

function ServerCard({ server }: { server: GameServer }) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const address = `${server.ip_address}${server.port ? `:${server.port}` : ""}`;

  return (
    <Card className="overflow-hidden hover:ring-1 hover:ring-primary/30 transition-all">
      {(server.image_url || server.games?.cover_image_url) && (
        <div className="h-32 bg-muted overflow-hidden">
          <img src={server.image_url || server.games!.cover_image_url!} alt={server.name} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className={server.image_url ? "p-5" : "p-5"}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot server={server} />
            <h3 className="font-display font-bold text-foreground truncate">{server.name}</h3>
          </div>
          <PlayerCount server={server} />
        </div>

        <Badge variant="outline" className="gap-1 mb-3">
          <Gamepad2 className="h-3 w-3" />
          {server.game}
        </Badge>

        {server.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{server.description}</p>
        )}

        <div className="flex items-center gap-2 mb-3">
          <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono text-foreground truncate">{address}</code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { navigator.clipboard.writeText(address); toast({ title: "Server address copied!" }); }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {server.connection_instructions && (
          <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                How to Join
                <ChevronDown className={`h-4 w-4 transition-transform ${instructionsOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
                {server.connection_instructions}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export default function GameServers() {
  usePageTitle("Game Servers");
  const { data: servers, isLoading } = useGameServers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" />
          Game Servers
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Browse and join our community gaming servers.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
      ) : !servers?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No servers available yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map(s => <ServerCard key={s.id} server={s} />)}
        </div>
      )}
    </div>
  );
}
