import { useState } from "react";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/hooks/canvas/canvasTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Facebook, Instagram, Twitter, Linkedin, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-6 w-6" />,
  instagram: <Instagram className="h-6 w-6" />,
  twitter: <Twitter className="h-6 w-6" />,
  linkedin: <Linkedin className="h-6 w-6" />,
};

const PLATFORM_HELP: Record<string, string> = {
  facebook: "Enter your Facebook Page Access Token. You can generate one from Meta Business Suite → Settings → Advanced → Page Access Tokens.",
  instagram: "Enter your Instagram Graph API token. Requires a connected Facebook Page with Instagram Business Account.",
  twitter: "Enter your Twitter/X Bearer Token. Generate from the X Developer Portal → Projects → Keys and Tokens.",
  linkedin: "Enter your LinkedIn Access Token. Generate from LinkedIn Developer Portal → My Apps → Auth.",
};

interface Props {
  tenantId?: string | null;
}

const SocialAccountsManager = ({ tenantId }: Props) => {
  const { connections, isLoading, addConnection, removeConnection } = useSocialConnections(tenantId);
  const [connectDialog, setConnectDialog] = useState<string | null>(null);
  const [form, setForm] = useState({ account_name: "", access_token: "", page_id: "" });

  const handleConnect = async () => {
    if (!form.account_name.trim() || !form.access_token.trim()) {
      toast.error("Account name and token are required");
      return;
    }
    await addConnection.mutateAsync({
      platform: connectDialog!,
      account_name: form.account_name,
      access_token: form.access_token,
      page_id: form.page_id || undefined,
    });
    setConnectDialog(null);
    setForm({ account_name: "", access_token: "", page_id: "" });
  };

  const platforms = ["facebook", "instagram", "twitter", "linkedin"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">Social Media Accounts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your social accounts to publish assets directly from the editor.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {platforms.map((platform) => {
          const connected = connections.filter((c) => c.platform === platform);
          const hasConnection = connected.length > 0;

          return (
            <Card key={platform} className={`transition-colors ${hasConnection ? "border-primary/30" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: PLATFORM_COLORS[platform] }}
                  >
                    {PLATFORM_ICONS[platform]}
                  </div>
                  <CardTitle className="text-base font-heading">
                    {PLATFORM_LABELS[platform]}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasConnection ? (
                  <>
                    {connected.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm truncate">{conn.account_name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive shrink-0"
                          onClick={() => removeConnection.mutate(conn.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => { setConnectDialog(platform); setForm({ account_name: "", access_token: "", page_id: "" }); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Another
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" /> Not Connected
                    </Badge>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => { setConnectDialog(platform); setForm({ account_name: "", access_token: "", page_id: "" }); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Connect
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={(open) => { if (!open) setConnectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              {connectDialog && PLATFORM_ICONS[connectDialog]}
              Connect {connectDialog && PLATFORM_LABELS[connectDialog]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {connectDialog && PLATFORM_HELP[connectDialog]}
            </p>
            <div>
              <Label>Account Name</Label>
              <Input
                placeholder="e.g. My Business Page"
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                placeholder="Paste your access token"
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
              />
            </div>
            {connectDialog === "facebook" && (
              <div>
                <Label>Page ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="e.g. 123456789"
                  value={form.page_id}
                  onChange={(e) => setForm({ ...form, page_id: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={addConnection.isPending}>
              {addConnection.isPending ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialAccountsManager;
