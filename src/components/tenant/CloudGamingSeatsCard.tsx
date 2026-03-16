import { useState } from "react";
import { useCloudGamingSeats } from "@/hooks/useCloudGamingSeats";
import { useTenantSubscribers } from "@/hooks/useTenantSubscribers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Users, Plus, XCircle, Info, Loader2 } from "lucide-react";

interface Props {
  tenantId: string;
}

const CloudGamingSeatsCard = ({ tenantId }: Props) => {
  const {
    seats,
    purchases,
    isLoading,
    assignSeat,
    revokeSeat,
    availableSlots,
    availableSubscribers,
    maxSeats,
  } = useCloudGamingSeats(tenantId);
  const { subscribers } = useTenantSubscribers(tenantId);

  const [selectedSubscriber, setSelectedSubscriber] = useState<string>("");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const getSubscriberName = (subscriberId: string) => {
    const sub = subscribers.find((s) => s.id === subscriberId);
    if (!sub) return "Unknown";
    const name = [sub.first_name, sub.last_name].filter(Boolean).join(" ");
    return name || sub.email || sub.account_number || "Unnamed";
  };

  const getSubscriberEmail = (subscriberId: string) => {
    const sub = subscribers.find((s) => s.id === subscriberId);
    return sub?.email || "—";
  };

  const getPurchaseStatus = (subscriberId: string) => {
    const purchase = purchases.find((p) => p.subscriber_id === subscriberId);
    return purchase?.status || null;
  };

  const handleAssign = () => {
    if (!selectedSubscriber) return;
    assignSeat.mutate(selectedSubscriber, {
      onSuccess: () => setSelectedSubscriber(""),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Cloud Gaming Seats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Capacity bar */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {seats.length} of {maxSeats} seats assigned
            </span>
            <Badge variant={availableSlots > 0 ? "secondary" : "destructive"}>
              {availableSlots} available
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${maxSeats > 0 ? (seats.length / maxSeats) * 100 : 0}%` }}
            />
          </div>

          {/* Integration notice */}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Cloud gaming seats are tracked locally. Blacknut account provisioning will be
              enabled when the API integration is configured.
            </span>
          </div>

          {/* Assign seat */}
          {availableSlots > 0 && availableSubscribers.length > 0 && (
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Assign a Seat</label>
                <Select value={selectedSubscriber} onValueChange={setSelectedSubscriber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscriber..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubscribers.map((s) => {
                      const name = [s.first_name, s.last_name].filter(Boolean).join(" ");
                      const label = name || s.email || s.account_number || s.id;
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAssign}
                disabled={!selectedSubscriber || assignSeat.isPending}
                className="gap-1.5"
              >
                {assignSeat.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Assign
              </Button>
            </div>
          )}

          {availableSlots <= 0 && (
            <p className="text-xs text-muted-foreground">
              All seats are assigned. Increase your max seats in the Cloud Gaming config above to add more.
            </p>
          )}

          {/* Seats table */}
          {seats.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seats.map((seat) => {
                    const purchaseStatus = getPurchaseStatus(seat.subscriber_id);
                    return (
                      <TableRow key={seat.id}>
                        <TableCell className="font-medium">
                          {getSubscriberName(seat.subscriber_id)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {getSubscriberEmail(seat.subscriber_id)}
                        </TableCell>
                        <TableCell>
                          {purchaseStatus === "active" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                          ) : purchaseStatus === "pending" ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : (
                            <Badge variant="outline">Tracked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(seat.activated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRevokeTarget(seat.id)}
                            title="Revoke seat"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {seats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No seats assigned yet. Select a subscriber above to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke Cloud Gaming Seat"
        description="This will deactivate the subscriber's cloud gaming access. Their Stripe subscription (if active) should be canceled separately."
        confirmLabel="Revoke"
        variant="destructive"
        loading={revokeSeat.isPending}
        onConfirm={() => {
          if (revokeTarget) {
            revokeSeat.mutate(revokeTarget, {
              onSuccess: () => setRevokeTarget(null),
            });
          }
        }}
      />
    </>
  );
};

export default CloudGamingSeatsCard;
