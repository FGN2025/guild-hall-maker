import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Image, Palette, MapPin, Calendar, Users, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface Props {
  tenantId: string;
}

interface StepDef {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  link: string;
}

const STEPS: StepDef[] = [
  { key: "logo", label: "Upload Logo", description: "Add your organization's logo for branding", icon: Image, link: "/tenant/settings" },
  { key: "colors", label: "Set Brand Colors", description: "Customize your primary and accent colors", icon: Palette, link: "/tenant/settings" },
  { key: "zips", label: "Add ZIP Codes", description: "Define your service area coverage", icon: MapPin, link: "/tenant/zip-codes" },
  { key: "event", label: "Create First Event", description: "Launch your first tournament or event", icon: Calendar, link: "/tenant/events" },
  { key: "team", label: "Invite a Team Member", description: "Add staff to help manage your organization", icon: Users, link: "/tenant/team" },
];

const TenantOnboardingChecklist = ({ tenantId }: Props) => {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  const { data: completion, isLoading } = useQuery({
    queryKey: ["tenant-onboarding-steps", tenantId],
    queryFn: async () => {
      const [tenantRes, zipRes, eventRes, adminRes, inviteRes] = await Promise.all([
        supabase.from("tenants").select("logo_url, primary_color").eq("id", tenantId).single(),
        supabase.from("tenant_zip_codes").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("tenant_events").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("tenant_admins").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("tenant_invitations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ]);

      const t = tenantRes.data;
      return {
        logo: !!t?.logo_url,
        colors: !!t?.primary_color,
        zips: (zipRes.count ?? 0) > 0,
        event: (eventRes.count ?? 0) > 0,
        team: (adminRes.count ?? 0) > 1 || (inviteRes.count ?? 0) > 0,
      };
    },
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").update({ onboarding_completed: true } as any).eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-admin-check"] });
      queryClient.invalidateQueries({ queryKey: ["all-tenants-list"] });
      toast({ title: "🎉 Setup Complete!", description: "Your organization is ready to go." });
    },
  });

  if (dismissed || isLoading || !completion) return null;

  const completedSteps = Object.values(completion).filter(Boolean).length;
  const allDone = completedSteps === STEPS.length;
  const progress = (completedSteps / STEPS.length) * 100;
  const completionMap: Record<string, boolean> = completion;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-display">Getting Started</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Complete these steps to set up your organization ({completedSteps}/{STEPS.length})
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />

        <div className="space-y-2">
          {STEPS.map((step) => {
            const done = completionMap[step.key];
            return (
              <Link
                key={step.key}
                to={step.link}
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors group"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-heading ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
                {!done && <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
              </Link>
            );
          })}
        </div>

        {allDone && (
          <Button className="w-full" onClick={() => markComplete.mutate()} disabled={markComplete.isPending}>
            Mark Setup Complete
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantOnboardingChecklist;
