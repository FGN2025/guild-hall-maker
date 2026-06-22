import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Mail, Phone, Calendar, Clock, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import usePageTitle from "@/hooks/usePageTitle";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const roleLabels: Record<string, string> = {
  broadband_operator: "Broadband Operator",
  marketing_director: "Marketing Director",
  executive: "Executive",
  other: "Other",
};

const STATUSES = ["new", "contacted", "qualified", "closed"] as const;
type Status = (typeof STATUSES)[number];

const statusVariant: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  closed: "destructive",
};

const AdminInquiries = () => {
  usePageTitle("Provider Inquiries");
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("new");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["provider-inquiries", roleFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("provider_inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (roleFilter !== "all") q = q.eq("role", roleFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { status?: Status; notes?: string } }) => {
      const { error } = await supabase.from("provider_inquiries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
      toast.success(vars.patch.status ? "Status updated" : "Notes saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_inquiries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
      toast.success("Inquiry deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Provider Inquiries</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Role:</span>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="broadband_operator">Broadband Operator</SelectItem>
              <SelectItem value="marketing_director">Marketing Director</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")} className="mb-4">
        <TabsList>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="qualified">Qualified</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">
            {inquiries?.length ?? 0} Inquir{inquiries?.length === 1 ? "y" : "ies"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !inquiries?.length ? (
            <p className="text-center text-muted-foreground py-12">No inquiries in this view.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Preferred</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.map((inq: any) => {
                    const status = (inq.status ?? "new") as Status;
                    const noteDraft = draftNotes[inq.id] ?? inq.notes ?? "";
                    const dirty = noteDraft !== (inq.notes ?? "");
                    return (
                      <TableRow key={inq.id} className="align-top">
                        <TableCell className="font-medium whitespace-nowrap">
                          {inq.first_name} {inq.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${inq.email}`} className="text-primary hover:underline">{inq.email}</a>
                            </span>
                            {inq.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {inq.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{roleLabels[inq.role] ?? inq.role}</Badge>
                          {inq.message && (
                            <p className="mt-1 text-xs text-muted-foreground max-w-xs line-clamp-3">{inq.message}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={status}
                            onValueChange={(v) =>
                              updateMutation.mutate({ id: inq.id, patch: { status: v as Status } })
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue>
                                <Badge variant={statusVariant[status]} className="capitalize">{status}</Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {inq.handled_at && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {format(new Date(inq.handled_at), "MMM d, h:mm a")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <Textarea
                            value={noteDraft}
                            onChange={(e) => setDraftNotes((d) => ({ ...d, [inq.id]: e.target.value }))}
                            placeholder="Internal notes…"
                            className="min-h-[60px] text-xs"
                          />
                          {dirty && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1 h-7"
                              onClick={() =>
                                updateMutation.mutate({ id: inq.id, patch: { notes: noteDraft } })
                              }
                            >
                              <Save className="h-3 w-3 mr-1" /> Save
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {inq.preferred_date || inq.preferred_time ? (
                            <div className="flex flex-col gap-0.5">
                              {inq.preferred_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {inq.preferred_date}
                                </span>
                              )}
                              {inq.preferred_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  {inq.preferred_time}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(inq.created_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(inq.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Inquiry"
        description="Are you sure you want to delete this inquiry? This cannot be undone."
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
};

export default AdminInquiries;
