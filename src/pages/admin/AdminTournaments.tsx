import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColor: Record<string, string> = {
  upcoming: "bg-blue-500/20 text-blue-400",
  open: "bg-green-500/20 text-green-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/20 text-destructive",
};

const AdminTournaments = () => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["admin-tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      toast.success("Tournament deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3 mb-8">
        <Trophy className="h-8 w-8 text-primary" />
        Tournament Oversight
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link to={`/tournaments/${t.id}/bracket`} className="font-medium hover:text-primary transition-colors">
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.game}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[t.status] ?? ""}>{t.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.max_participants}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(t.start_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget({ id: t.id, name: t.name })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>? This will also remove all registrations, match results, and bracket data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTournaments;
