import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, ExternalLink, CheckCircle2, Loader2, Info } from "lucide-react";
import { useDiscordClientId } from "@/hooks/useDiscordClientId";

const LinkDiscord = () => {
  usePageTitle("Link Discord");
  const { user, isAdmin, roleLoading, refreshDiscordStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);
  const clientId = useDiscordClientId();

  // Admins don't need Discord — redirect them to dashboard
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [roleLoading, isAdmin, navigate]);

  const redirectUri = window.location.hostname.includes("localhost")
    ? `${window.location.origin}/link-discord`
    : "https://play.fgn.gg/link-discord";

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || !user || linking || linked) return;

    const exchangeCode = async () => {
      setLinking(true);
      try {
        const { data, error } = await supabase.functions.invoke("discord-oauth-callback", {
          body: { code, redirect_uri: redirectUri },
        });

        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          setLinking(false);
          return;
        }

        toast.success(`Discord linked: ${data.discord_username}`);
        setLinked(true);
        await refreshDiscordStatus();
        setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      } catch (err: any) {
        toast.error(err.message || "Failed to link Discord");
        setLinking(false);
      }
    };

    exchangeCode();
  }, [searchParams, user]);

  const handleLink = () => {
    if (!clientId) {
      toast.error("Discord configuration not found. Contact an administrator.");
      return;
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.members.read",
    });
    window.location.href = `https://discord.com/api/oauth2/authorize?${params}`;
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <Card className="glass-panel border-border/50 max-w-md w-full">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#5865F2]/10">
            <MessageSquare className="h-7 w-7 text-[#5865F2]" />
          </div>
          <CardTitle className="font-display text-2xl">Link Your Discord</CardTitle>
          <CardDescription className="font-body text-base">
            Discord is used for tournament communication, brackets, and player identity.
            Linking your account is required to access the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {linked ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-foreground font-heading text-lg">Discord linked successfully!</p>
              <p className="text-muted-foreground text-sm">Redirecting to Dashboard…</p>
            </div>
          ) : linking ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#5865F2]" />
              <p className="text-muted-foreground font-body">Linking your Discord account…</p>
            </div>
          ) : (
            <>
              <Button
                onClick={handleLink}
                disabled={!clientId}
                className="w-full py-5 font-heading tracking-wide gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Link Discord Account
              </Button>
              <p className="text-xs text-muted-foreground text-center font-body">
                Don't have a Discord account yet? You'll be able to create one for free during the linking process.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkDiscord;
