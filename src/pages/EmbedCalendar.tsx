import { useParams } from "react-router-dom";
import { useCalendarPublishById } from "@/hooks/useCalendarPublish";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  name: string;
  start_date: string;
  type: "tournament" | "tenant_event";
}

const EmbedCalendar = () => {
  const { configId } = useParams<{ configId: string }>();
  const { data: config, isLoading } = useCalendarPublishById(configId);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch tournaments
  const { data: tournaments } = useQuery({
    queryKey: ["embed_tournaments", config?.show_platform_tournaments],
    enabled: !!config?.show_platform_tournaments,
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, start_date")
        .order("start_date");
      return (data ?? []).map((t: any) => ({ ...t, type: "tournament" as const }));
    },
  });

  // Fetch tenant events
  const { data: tenantEvents } = useQuery({
    queryKey: ["embed_tenant_events", config?.tenant_id],
    enabled: !!config?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_events")
        .select("id, name, start_date")
        .eq("tenant_id", config!.tenant_id!)
        .eq("is_public", true)
        .eq("status", "published")
        .order("start_date");
      return (data ?? []).map((e: any) => ({ ...e, type: "tenant_event" as const }));
    },
  });

  const events: CalendarEvent[] = useMemo(
    () => [...(tournaments ?? []), ...(tenantEvents ?? [])],
    [tournaments, tenantEvents]
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun

  const primaryColor = config?.primary_color || "#6366f1";
  const accentColor = config?.accent_color || primaryColor;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        Calendar not found or inactive.
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden font-sans"
      style={{ "--cal-primary": primaryColor, "--cal-accent": accentColor } as React.CSSProperties}
    >
      {/* Background */}
      {config.bg_image_url && (
        <div className="absolute inset-0 z-0">
          <img
            src={config.bg_image_url}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {config.logo_url && (
            <img
              src={config.logo_url}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          )}
          <h1
            className="text-xl sm:text-2xl font-bold"
            style={{ color: config.bg_image_url ? "#fff" : primaryColor }}
          >
            {config.title}
          </h1>
        </div>

        {/* Month Nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-md hover:bg-white/10 transition"
            style={{ color: config.bg_image_url ? "#fff" : primaryColor }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span
            className="text-lg font-semibold"
            style={{ color: config.bg_image_url ? "#fff" : "#1a1a1a" }}
          >
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-md hover:bg-white/10 transition"
            style={{ color: config.bg_image_url ? "#fff" : primaryColor }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 text-center text-xs font-medium mb-1"
          style={{ color: config.bg_image_url ? "rgba(255,255,255,0.6)" : "#888" }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden"
          style={{ backgroundColor: config.bg_image_url ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}
        >
          {Array.from({ length: startPad }).map((_, i) => (
            <div
              key={`pad-${i}`}
              className="min-h-[80px]"
              style={{ backgroundColor: config.bg_image_url ? "rgba(0,0,0,0.3)" : "#f9fafb" }}
            />
          ))}
          {days.map((day) => {
            const dayEvents = events.filter((e) => isSameDay(parseISO(e.start_date), day));
            return (
              <div
                key={day.toISOString()}
                className="min-h-[80px] p-1"
                style={{ backgroundColor: config.bg_image_url ? "rgba(0,0,0,0.3)" : "#fff" }}
              >
                <span
                  className="text-xs font-medium block mb-0.5"
                  style={{ color: config.bg_image_url ? "rgba(255,255,255,0.7)" : "#555" }}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[10px] leading-tight truncate rounded px-1 py-0.5 mb-0.5"
                    style={{
                      backgroundColor: ev.type === "tournament" ? primaryColor : accentColor,
                      color: "#fff",
                    }}
                    title={ev.name}
                  >
                    {ev.name}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px]" style={{ color: config.bg_image_url ? "rgba(255,255,255,0.5)" : "#999" }}>
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmbedCalendar;
