import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Loader2, Clock, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface AccessRequest {
  id: string;
  email: string;
  display_name: string | null;
  zip_code: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const AdminAccessRequests = () => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: requests, isLoading } = useQuery({
    queryKey: ["access-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as AccessRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, email, adminNotes }: { id: string; email: string; adminNotes?: string }) => {
      // Generate a single-use bypass code
      const code = `AR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: { user } } = await supabase.auth.getUser();

      // Create the bypass code
      const { error: codeError } = await supabase.from("bypass_codes").insert({
        code,
        created_by: user!.id,
        description: `Auto-generated for access request from ${email}`,
        max_uses: 1,
        is_active: true,
      });
      if (codeError) throw codeError;

      // Update request status
      const { error: updateError } = await supabase
        .from("access_requests" as any)
        .update({
          status: "approved",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        } as any)
        .eq("id", id);
      if (updateError) throw updateError;

      // Send approval email with bypass code
      await supabase.functions.invoke("send-notification-email", {
        body: {
          type: "access_request_approved",
          target_email: email,
          bypass_code: code,
        },
      });

      return code;
    },
    onSuccess: (code) => {
      toast.success(`Approved! Invite code ${code} sent to user.`);
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("access_requests" as any)
        .update({
          status: "denied",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request denied.");
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Approved</Badge>;
    if (status === "denied") return <Badge variant="destructive">Denied</Badge>;
    return <Badge variant="outline" className="text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Access Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve registration requests from users without a local provider.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !requests?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            No access requests yet.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>ZIP</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="font-medium">{req.display_name || "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {req.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {req.zip_code}
                      </span>
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
                            onClick={() =>
                              approveMutation.mutate({
                                id: req.id,
                                email: req.email,
                                adminNotes: notes[req.id],
                              })
                            }
                            disabled={approveMutation.isPending || denyMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              denyMutation.mutate({
                                id: req.id,
                                adminNotes: notes[req.id],
                              })
                            }
                            disabled={approveMutation.isPending || denyMutation.isPending}
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
    </>
  );
};

export default AdminAccessRequests;
