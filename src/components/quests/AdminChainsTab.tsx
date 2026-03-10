import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";

const AdminChainsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editChain, setEditChain] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data: chains = [], isLoading } = useQuery({
    queryKey: ["admin-quest-chains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_chains")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: chainQuestCounts = {} } = useQuery({
    queryKey: ["admin-chain-quest-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("chain_id")
        .not("chain_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((q: any) => {
        counts[q.chain_id] = (counts[q.chain_id] || 0) + 1;
      });
      return counts;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-quest-chains"] });
    queryClient.invalidateQueries({ queryKey: ["admin-chain-quest-counts"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quest_chains").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Chain deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("quest_chains").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Chain
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : chains.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No quest chains yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chains.map((chain: any) => (
            <Card key={chain.id} className="overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {chain.name}
                    </h3>
                    {chain.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{chain.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={chain.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: chain.id, is_active: checked })}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="outline" className="gap-1">
                    <Link2 className="h-3 w-3" />
                    {(chainQuestCounts as any)[chain.id] || 0} quests
                  </Badge>
                  {chain.bonus_points > 0 && (
                    <Badge variant="secondary" className="font-mono">+{chain.bonus_points} bonus pts</Badge>
                  )}
                  <span>Order: {chain.display_order}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditChain(chain)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(chain)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ChainFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        chain={null}
        userId={user?.id}
        onSuccess={invalidate}
      />

      <ChainFormDialog
        open={!!editChain}
        onOpenChange={(o) => !o && setEditChain(null)}
        chain={editChain}
        userId={user?.id}
        onSuccess={invalidate}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chain</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? Quests in this chain will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// --- Chain Form Dialog ---
interface ChainFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: any | null;
  userId?: string;
  onSuccess: () => void;
}

const ChainFormDialog = ({ open, onOpenChange, chain, userId, onSuccess }: ChainFormDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [storyIntro, setStoryIntro] = useState("");
  const [storyOutro, setStoryOutro] = useState("");
  const [bonusPoints, setBonusPoints] = useState(0);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const isEdit = !!chain;

  // Populate on open
  const handleOpenChange = (o: boolean) => {
    if (o && chain) {
      setName(chain.name || "");
      setDescription(chain.description || "");
      setStoryIntro(chain.story_intro || "");
      setStoryOutro(chain.story_outro || "");
      setBonusPoints(chain.bonus_points || 0);
      setDisplayOrder(chain.display_order || 0);
      setCoverImageUrl(chain.cover_image_url || "");
    } else if (o) {
      setName(""); setDescription(""); setStoryIntro(""); setStoryOutro("");
      setBonusPoints(0); setDisplayOrder(0); setCoverImageUrl("");
    }
    onOpenChange(o);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name, description: description || null,
        story_intro: storyIntro || null, story_outro: storyOutro || null,
        bonus_points: bonusPoints, display_order: displayOrder,
        cover_image_url: coverImageUrl || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("quest_chains").update(payload as any).eq("id", chain.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quest_chains").insert({ ...payload, created_by: userId! } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      onSuccess();
      toast.success(isEdit ? "Chain updated" : "Chain created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? "Edit" : "Create"} Quest Chain</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CDL Trucker Path" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Chain overview..." rows={2} />
          </div>
          <div>
            <Label>Story Intro</Label>
            <Textarea value={storyIntro} onChange={(e) => setStoryIntro(e.target.value)} placeholder="Narrative shown at chain start..." rows={3} />
          </div>
          <div>
            <Label>Story Outro</Label>
            <Textarea value={storyOutro} onChange={(e) => setStoryOutro(e.target.value)} placeholder="Narrative shown on chain completion..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bonus Points</Label>
              <Input type="number" min={0} value={bonusPoints} onChange={(e) => setBonusPoints(Number(e.target.value))} />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input type="number" min={0} value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Cover Image URL</Label>
            <Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()} className="w-full">
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Chain"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminChainsTab;
