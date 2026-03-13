import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  getDay,
  isSameDay,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTournaments } from "@/hooks/useTournaments";
import PageBackground from "@/components/PageBackground";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TournamentCalendar = () => {
  usePageTitle("Tournament Calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { tournaments, isLoading } = useTournaments();
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const tournamentsByDate = new Map<string, typeof tournaments>();
  tournaments.forEach((t) => {
    const key = format(parseISO(t.start_date), "yyyy-MM-dd");
    if (!tournamentsByDate.has(key)) tournamentsByDate.set(key, []);
    tournamentsByDate.get(key)!.push(t);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Tournament Calendar
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-heading text-lg font-semibold text-foreground min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      ) : (
        <div className="glass-panel border border-border/50 rounded-xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-3 text-center text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for padding */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div
                key={`pad-${i}`}
                className="min-h-[100px] border-b border-r border-border/20 bg-muted/20"
              />
            ))}

            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTournaments = tournamentsByDate.get(key) ?? [];
              const today = isToday(day);

              return (
                <div
                  key={key}
                  className={`min-h-[100px] border-b border-r border-border/20 p-1.5 transition-colors ${
                    today ? "bg-primary/5" : "hover:bg-muted/30"
                  } ${!isSameMonth(day, currentMonth) ? "opacity-40" : ""}`}
                >
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-heading font-semibold ${
                      today
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="mt-1 space-y-0.5">
                    {dayTournaments.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => navigate(`/tournaments/${t.id}`)}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-body leading-tight truncate bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                      >
                        {t.name}
                      </button>
                    ))}
                    {dayTournaments.length > 3 && (
                      <span className="block text-[10px] text-muted-foreground px-1.5">
                        +{dayTournaments.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentCalendar;
