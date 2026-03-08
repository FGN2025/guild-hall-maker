import { useParams, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { usePublicTenantBySlug, usePublicTenantEvents } from "@/hooks/usePublicTenantEvents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const TenantEventPage = () => {
  usePageTitle("Events");
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { data: tenant, isLoading: tenantLoading } = usePublicTenantBySlug(tenantSlug);
  const { data: events, isLoading: eventsLoading } = usePublicTenantEvents(tenant?.id);

  if (tenantLoading || eventsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Organization not found</h1>
          <p className="text-muted-foreground">This event page doesn't exist.</p>
        </div>
      </div>
    );
  }

  const brandColor = tenant.primary_color || undefined;
  const accentColor = tenant.accent_color || undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Branded Header */}
      <header
        className="border-b"
        style={{ backgroundColor: brandColor ? `${brandColor}10` : undefined, borderColor: brandColor ? `${brandColor}30` : undefined }}
      >
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center gap-4">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-14 w-14 rounded-xl object-contain" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center" style={brandColor ? { backgroundColor: `${brandColor}20` } : undefined}>
              <span className="text-xl font-bold" style={brandColor ? { color: brandColor } : undefined}>{tenant.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold" style={brandColor ? { color: brandColor } : undefined}>{tenant.name}</h1>
            <p className="text-muted-foreground text-sm">Events & Tournaments</p>
          </div>
        </div>
      </header>

      {/* Events List */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {!events || events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">No upcoming events</p>
            <p className="text-sm">Check back soon for new events and tournaments.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <Link key={event.id} to={`/events/${tenantSlug}/${event.id}`}>
                <Card className="group hover:shadow-lg transition-shadow overflow-hidden h-full cursor-pointer border" style={brandColor ? { borderColor: `${brandColor}20` } : undefined}>
                  {event.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img src={event.image_url} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-bold text-lg leading-tight">{event.name}</h3>
                      <ArrowRight className="h-4 w-4 shrink-0 mt-1 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {event.game && <Badge variant="outline">{event.game}</Badge>}
                      {event.registration_open && (
                        <Badge style={brandColor ? { backgroundColor: `${brandColor}15`, color: brandColor, borderColor: `${brandColor}30` } : undefined}>
                          Open
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(new Date(event.start_date), "MMM d, yyyy")}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {event.max_participants}</span>
                      {event.prize_pool && <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> {event.prize_pool}</span>}
                    </div>
                    {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TenantEventPage;
