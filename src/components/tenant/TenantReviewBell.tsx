import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertTriangle, Clock, CalendarClock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTenantReviewQueue } from "@/hooks/useTenantReviewQueue";

const REVIEW_ROUTE = "/tenant/marketing?tab=agent";

/**
 * Tenant-portal review bell.
 *
 * It reports *work waiting now*, grouped by urgency, and every path out of it
 * leads to the review queue. It intentionally does not render a history of past
 * notification rows: an unread pile trains a reviewer to ignore the bell, and
 * this portal has the receipts to prove it. When nothing is pending, no dot is
 * drawn and the panel says so in one line.
 *
 * Sized for a phone first: 44px trigger, 48px rows, full-width primary action.
 */
export default function TenantReviewBell({ tenantId }: { tenantId: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data } = useTenantReviewQueue(tenantId);
  const total = data?.total ?? 0;

  const go = () => {
    setOpen(false);
    navigate(REVIEW_ROUTE);
  };

  return (
    <>
      <button
        type="button"
        aria-label={total > 0 ? `Review queue, ${total} items waiting` : "Review queue, nothing waiting"}
        onClick={() => setOpen(true)}
        className="relative h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
          <SheetHeader className="px-4 py-4 border-b border-border text-left">
            <SheetTitle className="text-base">Waiting on you</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {total === 0 ? (
              <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Nothing waiting for review</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    New drafts appear here as soon as they are created.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {total} item{total === 1 ? "" : "s"} need a decision before anything can publish.
                </p>

                {data!.lapsed > 0 && (
                  <Row
                    icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                    title={`${data!.lapsed} past their scheduled slot`}
                    detail="These need rescheduling as well as approval."
                    onClick={go}
                  />
                )}
                {data!.dueSoon > 0 && (
                  <Row
                    icon={<Clock className="h-5 w-5 text-yellow-400" />}
                    title={`${data!.dueSoon} due in the next 48 hours`}
                    detail="Approve now or they will lapse too."
                    onClick={go}
                  />
                )}
                {data!.posts > 0 && (
                  <Row
                    icon={<CalendarClock className="h-5 w-5 text-primary" />}
                    title={`${data!.posts} scheduled post${data!.posts === 1 ? "" : "s"}`}
                    detail={
                      data!.nextAt
                        ? `Next slot ${new Date(data!.nextAt).toLocaleString()}`
                        : "No slot set"
                    }
                    onClick={go}
                  />
                )}
                {(data!.campaigns > 0 || data!.assets > 0) && (
                  <Row
                    icon={<CalendarClock className="h-5 w-5 text-primary" />}
                    title={`${data!.campaigns + data!.assets} campaign${
                      data!.campaigns + data!.assets === 1 ? "" : "s"
                    } and graphics`}
                    detail="Copy and artwork awaiting sign-off."
                    onClick={go}
                  />
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <Button className="w-full min-h-[44px]" onClick={go}>
              Open review queue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Row({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 rounded-lg border border-border p-3 min-h-[48px] hover:bg-secondary transition-colors"
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}
