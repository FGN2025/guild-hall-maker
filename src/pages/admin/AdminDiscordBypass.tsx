import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BypassRequest {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  display_name: string | null;
}

const AdminDiscordBypass = () => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["discord-bypass-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discord_bypass_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch display names for all user_ids
      const userIds = (data as any[]).map((r: any) => r.user_id);
      let profileMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.display_name]));
        }
      }

      return (data as any[]).map((r: any) => ({
        ...r,
        display_name: profileMap[r.user_id] || null,
      })) as BypassRequest[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("discord_bypass_requests")
        .update({
          status,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Request approved — user can now access the platform." : "Request denied.");
      queryClient.invalidateQueries({ queryKey: ["discord-bypass-requests"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = requests?.filter((r) => filter === "all" || r.status === filter) ?? [];

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Approved</Badge>;
    if (status === "denied") return <Badge variant="destructive">Denied</Badge>;
    return <Badge variant="outline" className="text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Discord Bypass Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review manual verification requests from users who cannot link their Discord account.
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-12 text-muted-foreground">
          No {filter === "all" ? "" : filter} requests found.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{statusBadge(req.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{req.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{req.user_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px]">
                    {req.reason || <span className="text-muted-foreground italic">No reason given</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(req.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {req.status === "pending" ? (
                      <Textarea
                        placeholder="Admin notes (optional)"
                        value={notes[req.id] || ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="h-16 text-xs bg-card border-border"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{req.admin_notes || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === "pending" && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: req.id, status: "approved", adminNotes: notes[req.id] })}
                          disabled={updateMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateMutation.mutate({ id: req.id, status: "denied", adminNotes: notes[req.id] })}
                          disabled={updateMutation.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Deny
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminDiscordBypass;
