import { useParams, Link, useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { usePublicTenantBySlug, usePublicTenantEvent, usePublicEventAssets } from "@/hooks/usePublicTenantEvents";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Users, Trophy, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const TenantEventDetail = () => {
  usePageTitle("Event Detail");
  const { tenantSlug, eventId } = useParams<{ tenantSlug: string; eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: tenant, isLoading: tl } = usePublicTenantBySlug(tenantSlug);
  const { data: event, isLoading: el } = usePublicTenantEvent(eventId);
  const { data: assets } = usePublicEventAssets(eventId);
  const [registering, setRegistering] = useState(false);

  const myRegKey = ["my-event-reg", eventId, user?.id];
  const { data: myReg } = useQuery({
    queryKey: myRegKey,
    enabled: !!eventId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_event_registrations" as any)
        .select("*")
        .eq("event_id", eventId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const handleRegister = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setRegistering(true);
    const { error } = await supabase
      .from("tenant_event_registrations" as any)
      .upsert(
        { event_id: eventId, user_id: user.id } as any,
        { onConflict: "event_id,user_id", ignoreDuplicates: true } as any
      );
    setRegistering(false);
    if (error) {
      // Treat duplicate as success — they're already registered
      if (error.message?.toLowerCase().includes("duplicate")) {
        toast.success("You're already registered!");
        await qc.invalidateQueries({ queryKey: myRegKey });
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Registered successfully!");
      await qc.invalidateQueries({ queryKey: myRegKey });
    }
  };

  if (tl || el) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tenant || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <Link to={`/events/${tenantSlug}`} className="text-primary hover:underline">← Back to events</Link>
        </div>
      </div>
    );
  }

  const brandColor = tenant.primary_color || undefined;
  const isRegistered = !!(myReg as any)?.id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: brandColor ? `${brandColor}10` : undefined }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to={`/events/${tenantSlug}`} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {tenant.logo_url && <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 rounded-lg object-contain" />}
          <span className="font-display font-bold text-sm" style={brandColor ? { color: brandColor } : undefined}>{tenant.name}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Hero Image */}
        {event.image_url && (
          <div className="aspect-video rounded-xl overflow-hidden">
            <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Title & Meta */}
        <div className="space-y-4">
          <h1 className="text-3xl font-display font-bold">{event.name}</h1>
          <div className="flex flex-wrap gap-3">
            {event.game && <Badge variant="outline">{event.game}</Badge>}
            <Badge variant="outline">{event.format.replace(/_/g, " ")}</Badge>
            {event.registration_open && (
              <Badge style={brandColor ? { backgroundColor: `${brandColor}15`, color: brandColor } : undefined}>Registration Open</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {format(new Date(event.start_date), "EEEE, MMMM d, yyyy")}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {format(new Date(event.start_date), "h:mm a")}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Max {event.max_participants}</span>
            {event.prize_pool && <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4" /> {event.prize_pool}</span>}
          </div>
        </div>

        {/* Registration */}
        {event.registration_open && (
          <Card style={brandColor ? { borderColor: `${brandColor}30` } : undefined}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="font-medium">{isRegistered ? "You're registered!" : "Join this event"}</p>
                <p className="text-sm text-muted-foreground">{isRegistered ? "We'll see you there." : "Sign up to compete."}</p>
              </div>
              <Button
                disabled={isRegistered || registering}
                onClick={handleRegister}
                style={brandColor ? { backgroundColor: brandColor } : undefined}
              >
                {isRegistered ? "Registered ✓" : user ? "Register Now" : "Sign in to Register"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {event.description && (
          <div>
            <h2 className="text-lg font-display font-bold mb-2">About</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Rules */}
        {event.rules && (
          <div>
            <h2 className="text-lg font-display font-bold mb-2">Rules</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{event.rules}</p>
          </div>
        )}

        {/* Assets */}
        {assets && assets.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-bold mb-3">Media</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {assets.map((a: any) => (
                <Card key={a.id} className="overflow-hidden">
                  <img src={a.asset_url} alt={a.label} className="w-full aspect-video object-cover" />
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{a.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TenantEventDetail;
