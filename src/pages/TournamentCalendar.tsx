import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useNavigate, Link } from "react-router-dom";
import nawCalendarLogo from "@/assets/naw-calendar-logo-2026.png";
import nawInfographic from "@/assets/naw-infographic-2026.png";
import { isWithinInterval } from "date-fns";
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

  const NAW_START = new Date(2026, 3, 26); // April 26
  const NAW_END = new Date(2026, 4, 2);   // May 2

  const isNawDay = (day: Date) =>
    isWithinInterval(day, { start: NAW_START, end: NAW_END });

  const tournamentsByDate = new Map<string, typeof tournaments>();
  tournaments.forEach((t) => {
    const key = format(parseISO(t.start_date), "yyyy-MM-dd");
    if (!tournamentsByDate.has(key)) tournamentsByDate.set(key, []);
    tournamentsByDate.get(key)!.push(t);
  });

  return (
    <div className="space-y-6 relative">
      <PageBackground pageSlug="calendar" />
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Tournament Calendar
          </h1>
          <div className="flex items-center gap-4">
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
            <a href={nawInfographic} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img src={nawCalendarLogo} alt="National Apprenticeship Week 2026" className="h-12 w-auto object-contain" />
            </a>
          </div>
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
              const naw = isNawDay(day);

              return (
                <div
                  key={key}
                  className={`min-h-[100px] border-b border-r border-border/20 p-1.5 transition-colors ${
                    naw ? "bg-red-700/10 border-l-2 border-l-red-600" : ""
                  } ${
                    today ? "bg-primary/5" : !naw ? "hover:bg-muted/30" : ""
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

                  {naw && (
                    <Link
                      to="/challenges"
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight bg-red-600 text-white hover:bg-red-700 transition-colors ml-1"
                    >
                      NAW
                    </Link>
                  )}

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

      <div className="mt-8 flex justify-center">
        <img
          src="/images/April_2026_calendar_square.png"
          alt="FGN Tournaments - April 2026"
          className="w-full max-w-2xl rounded-xl border border-border/50"
        />
      </div>
    </div>
  );
};

export default TournamentCalendar;
