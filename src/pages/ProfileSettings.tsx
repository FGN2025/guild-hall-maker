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
import { Link } from "react-router-dom";
import NotificationPreferences from "@/components/NotificationPreferences";
import { useDiscordClientId } from "@/hooks/useDiscordClientId";


const ProfileSettings = () => {
  usePageTitle("Profile Settings");
  const { user, discordLinked, refreshDiscordStatus } = useAuth();
  const discordClientId = useDiscordClientId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [gamerTag, setGamerTag] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordAvatarHash, setDiscordAvatarHash] = useState<string | null>(null);
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, gamer_tag, avatar_url, discord_id, discord_username, discord_avatar")
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
    <div className="min-h-screen bg-background grid-bg">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors font-body text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

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
                      const params = new URLSearchParams({
                        client_id: discordClientId!,
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
                    onClick={async () => {
                      if (!confirm("Unlinking Discord will block platform access until you re-link. Continue?")) return;
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
                    className="gap-1 font-heading text-xs"
                  >
                    <Unlink className="h-3 w-3" /> {unlinking ? "Unlinking…" : "Unlink"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => {
                  const params = new URLSearchParams({
                    client_id: discordClientId!,
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

        <NotificationPreferences />
      </main>
    </div>
  );
};

export default ProfileSettings;
