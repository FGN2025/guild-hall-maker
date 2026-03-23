import { useState, useEffect, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera, Save, User, Gamepad2, ArrowLeft, MessageSquare, Unlink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import NotificationPreferences from "@/components/NotificationPreferences";
import { useDiscordClientId } from "@/hooks/useDiscordClientId";
import PageBackground from "@/components/PageBackground";
import CoachProfileCard from "@/components/coach/CoachProfileCard";


const ProfileSettings = () => {
  usePageTitle("Profile Settings");
  const { user, discordLinked, refreshDiscordStatus } = useAuth();
  const discordClientId = useDiscordClientId();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [gamerTag, setGamerTag] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordAvatarHash, setDiscordAvatarHash] = useState<string | null>(null);
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [steamUsername, setSteamUsername] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkingSteam, setUnlinkingSteam] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [showUnlinkSteamConfirm, setShowUnlinkSteamConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Handle steam linking callback
  useEffect(() => {
    const steamParam = searchParams.get("steam");
    if (steamParam === "linked") {
      toast.success("Steam account linked successfully!");
      searchParams.delete("steam");
      setSearchParams(searchParams, { replace: true });
      if (user) fetchProfile();
    } else if (steamParam === "error") {
      toast.error("Failed to link Steam account. Please try again.");
      searchParams.delete("steam");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, gamer_tag, avatar_url, discord_id, discord_username, discord_avatar, steam_id, steam_username")
      .eq("user_id", user!.id)
      .single();

    if (error) {
      toast.error("Failed to load profile.");
    } else if (data) {
      setDisplayName(data.display_name ?? "");
      setGamerTag(data.gamer_tag ?? "");
      setAvatarUrl(data.avatar_url);
      setDiscordUsername((data as any).discord_username);
      setDiscordAvatarHash((data as any).discord_avatar);
      setDiscordId((data as any).discord_id);
      setSteamId((data as any).steam_id);
      setSteamUsername((data as any).steam_username);
    }
    setInitialLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB.");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast.error("Failed to save avatar.");
    } else {
      setAvatarUrl(newUrl);
      toast.success("Avatar updated!");
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (displayName.trim().length === 0) {
      toast.error("Display name cannot be empty.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        gamer_tag: gamerTag.trim() || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile.");
    } else {
      toast.success("Profile updated!");
    }
    setLoading(false);
  };

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center pt-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-bg relative">
      <PageBackground pageSlug="profile" />
      <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pb-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Profile Settings</CardTitle>
            <CardDescription className="font-body">
              Customize your player identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-24 w-24 border-2 border-primary/30">
                  <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-foreground" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground font-body">
                {uploading ? "Uploading..." : "Click to change avatar (max 2MB)"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="font-heading text-sm text-foreground">
                  Display Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="pl-10 bg-card border-border font-body"
                    maxLength={50}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gamerTag" className="font-heading text-sm text-foreground">
                  Gamer Tag
                </Label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="gamerTag"
                    value={gamerTag}
                    onChange={(e) => setGamerTag(e.target.value)}
                    placeholder="e.g. xShadow_99"
                    className="pl-10 bg-card border-border font-body"
                    maxLength={30}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-heading text-sm text-foreground">Email</Label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="bg-muted border-border font-body text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground font-body">
                  Email cannot be changed here.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5 gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Discord Section */}
        <Card className="glass-panel border-border/50 mt-6">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#5865F2]" />
              Discord
            </CardTitle>
            <CardDescription className="font-body">
              Your Discord identity for tournaments and brackets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {discordLinked && discordUsername ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {discordAvatarHash && discordId ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://cdn.discordapp.com/avatars/${discordId}/${discordAvatarHash}.png`} alt="Discord avatar" />
                      <AvatarFallback className="bg-[#5865F2] text-white text-sm">{discordUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-sm">
                      {discordUsername.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-heading text-foreground">{discordUsername}</p>
                    <p className="text-xs text-muted-foreground">Linked</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!discordClientId) {
                        toast.error("Discord configuration not found. Contact an administrator.");
                        return;
                      }
                      const params = new URLSearchParams({
                        client_id: discordClientId,
                        redirect_uri: `${window.location.origin}/link-discord`,
                        response_type: "code",
                        scope: "identify guilds.members.read",
                      });
                      window.location.href = `https://discord.com/api/oauth2/authorize?${params}`;
                    }}
                    className="gap-1 font-heading text-xs"
                  >
                    <RefreshCw className="h-3 w-3" /> Re-link
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={unlinking}
                    onClick={() => setShowUnlinkConfirm(true)}
                    className="gap-1 font-heading text-xs"
                  >
                    <Unlink className="h-3 w-3" /> {unlinking ? "Unlinking…" : "Unlink"}
                  </Button>
                  <ConfirmDialog
                    open={showUnlinkConfirm}
                    onOpenChange={setShowUnlinkConfirm}
                    title="Unlink Discord"
                    description="Unlinking Discord will block platform access until you re-link. Are you sure you want to continue?"
                    confirmLabel="Unlink"
                    variant="destructive"
                    onConfirm={async () => {
                      setShowUnlinkConfirm(false);
                      setUnlinking(true);
                      try {
                        const { error } = await supabase.functions.invoke("discord-oauth-callback", {
                          body: { action: "unlink" },
                        });
                        if (error) throw error;
                        setDiscordUsername(null);
                        setDiscordAvatarHash(null);
                        setDiscordId(null);
                        await refreshDiscordStatus();
                        toast.success("Discord unlinked.");
                      } catch {
                        toast.error("Failed to unlink Discord.");
                      }
                      setUnlinking(false);
                    }}
                  />
                </div>
              </div>
            ) : (
              <Button
                onClick={() => {
                  if (!discordClientId) {
                    toast.error("Discord configuration not found. Contact an administrator.");
                    return;
                  }
                  const params = new URLSearchParams({
                    client_id: discordClientId,
                    redirect_uri: `${window.location.origin}/link-discord`,
                    response_type: "code",
                    scope: "identify guilds.members.read",
                  });
                  window.location.href = `https://discord.com/api/oauth2/authorize?${params}`;
                }}
                className="w-full py-5 font-heading tracking-wide gap-2"
                style={{ backgroundColor: "#5865F2" }}
              >
                <MessageSquare className="h-4 w-4" />
                Link Discord Account
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Steam Section */}
        <Card className="glass-panel border-border/50 mt-6">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              Steam
            </CardTitle>
            <CardDescription className="font-body">
              Link your Steam account to launch games directly from the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {steamId ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-sm">
                    {(steamUsername ?? "ST").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-heading text-foreground">{steamUsername}</p>
                    <p className="text-xs text-muted-foreground">Steam ID: {steamId}</p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={unlinkingSteam}
                  onClick={() => setShowUnlinkSteamConfirm(true)}
                  className="gap-1 font-heading text-xs"
                >
                  <Unlink className="h-3 w-3" /> {unlinkingSteam ? "Unlinking…" : "Unlink Steam"}
                </Button>
                <ConfirmDialog
                  open={showUnlinkSteamConfirm}
                  onOpenChange={setShowUnlinkSteamConfirm}
                  title="Unlink Steam"
                  description="This will remove your Steam account link. You can re-link at any time."
                  confirmLabel="Unlink"
                  variant="destructive"
                  onConfirm={async () => {
                    setShowUnlinkSteamConfirm(false);
                    setUnlinkingSteam(true);
                    try {
                      const { error } = await supabase.functions.invoke("steam-openid-callback", {
                        body: { action: "unlink" },
                      });
                      if (error) throw error;
                      setSteamId(null);
                      setSteamUsername(null);
                      toast.success("Steam unlinked.");
                    } catch {
                      toast.error("Failed to unlink Steam.");
                    }
                    setUnlinkingSteam(false);
                  }}
                />
              </div>
            ) : (
              <Button
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    toast.error("Please sign in first.");
                    return;
                  }
                  const returnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-openid-callback`;
                  const params = new URLSearchParams({
                    "openid.ns": "http://specs.openid.net/auth/2.0",
                    "openid.mode": "checkid_setup",
                    "openid.return_to": `${returnUrl}?state=${session.access_token}`,
                    "openid.realm": returnUrl,
                    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
                    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
                  });
                  window.location.href = `https://steamcommunity.com/openid/login?${params}`;
                }}
                className="w-full py-5 font-heading tracking-wide gap-2"
              >
                <Gamepad2 className="h-4 w-4" />
                Link Steam Account
              </Button>
            )}
          </CardContent>
        </Card>

        <NotificationPreferences />
      </main>
    </div>
  );
};

export default ProfileSettings;
