import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Target, Compass, Gamepad2, UserPlus, Swords, Award, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Below-the-fold marketing sections for guests landing on the homepage.
 * All stats come from anon-readable content tables only — no user counts,
 * no registration numbers, no tenant internals.
 */

const usePublicStats = () =>
  useQuery({
    queryKey: ["public-platform-stats"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const count = async (table: string, filters?: (q: any) => any) => {
        try {
          let q = (supabase.from(table as any) as any).select("id", { count: "exact", head: true });
          if (filters) q = filters(q);
          const { count: c, error } = await q;
          return error ? null : (c as number | null);
        } catch {
          return null;
        }
      };
      const [tournaments, challenges, quests, games] = await Promise.all([
        count("tournaments", (q) => q.in("status", ["open", "upcoming", "in_progress"])),
        count("challenges", (q) => q.eq("is_active", true)),
        count("quests", (q) => q.eq("is_active", true)),
        count("games", (q) => q.eq("is_active", true)),
      ]);
      return { tournaments, challenges, quests, games };
    },
  });

const StatsStrip = () => {
  const { data } = usePublicStats();
  const stats = [
    { icon: Trophy, label: "Live Tournaments", value: data?.tournaments },
    { icon: Target, label: "Active Challenges", value: data?.challenges },
    { icon: Compass, label: "Quests Running", value: data?.quests },
    { icon: Gamepad2, label: "Supported Games", value: data?.games },
  ].filter((s) => s.value != null && s.value > 0);

  if (stats.length === 0) return null;

  return (
    <section className="border-y border-border bg-card/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-display text-3xl md:text-4xl font-black text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground tracking-wide uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    desc: "Sign up free, pick your display name, and link your game accounts. Players on partner fiber networks unlock extra events.",
  },
  {
    icon: Swords,
    title: "Compete & Complete",
    desc: "Enter tournaments, clear challenges, and finish quests. Every result earns points toward your lifetime and seasonal rank.",
  },
  {
    icon: Award,
    title: "Climb & Redeem",
    desc: "Rise on the leaderboard, earn achievements, and spend your points on real prizes in the Prize Shop.",
  },
];

const HowItWorks = () => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <h2 className="font-display text-3xl md:text-4xl font-black text-center mb-3">
        <span className="text-foreground">HOW IT </span>
        <span className="gradient-text">WORKS</span>
      </h2>
      <p className="text-center text-muted-foreground max-w-xl mx-auto mb-12">
        Three steps from sign-up to standing on the podium.
      </p>
      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <div
            key={title}
            className="relative rounded-xl border border-border bg-card/90 backdrop-blur-sm p-6"
          >
            <span className="absolute top-4 right-5 font-display text-4xl font-black text-primary/15">
              {i + 1}
            </span>
            <Icon className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-10">
        <Button asChild size="lg" className="font-display tracking-wider">
          <Link to="/auth">Join Now — It's Free</Link>
        </Button>
      </div>
    </div>
  </section>
);

const ProviderCallout = () => (
  <section className="py-16 border-t border-border">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
        <div className="shrink-0 rounded-2xl bg-primary/10 border border-primary/30 p-5">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="font-display text-2xl md:text-3xl font-black mb-2">
            Are you a broadband provider?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            FGN gives ISPs a turnkey, white-label gaming platform — branded tournaments, subscriber
            engagement, and cloud gaming add-ons that reduce churn and grow ARPU.
          </p>
        </div>
        <Button asChild size="lg" variant="outline" className="shrink-0 font-display tracking-wider">
          <Link to="/for-providers">
            Learn More <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

/**
 * Real, live tenant-branded pages. Guests (and ISP prospects) can click
 * through to actual partner network pages — social proof built from real
 * tenants rather than mockups. Anon-safe: only active tenants and published
 * web pages within their schedule window, no tenant internals.
 */
const usePublicTenantPages = () =>
  useQuery({
    queryKey: ["public-tenant-pages"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: tenants }, { data: pages }] = await Promise.all([
        supabase.from("tenants").select("id, slug, name").eq("status", "active"),
        supabase
          .from("web_pages")
          .select("id, tenant_id, slug, title, publish_at, unpublish_at")
          .eq("is_published", true),
      ]);
      const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));
      const now = Date.now();
      const live = (pages ?? []).filter((p: any) => {
        if (!p.tenant_id || !tenantById.has(p.tenant_id)) return false;
        if (p.publish_at && new Date(p.publish_at).getTime() > now) return false;
        if (p.unpublish_at && new Date(p.unpublish_at).getTime() <= now) return false;
        return true;
      });
      // One card per tenant for a clean grid
      const seen = new Set<string>();
      return live
        .filter((p: any) => {
          if (seen.has(p.tenant_id)) return false;
          seen.add(p.tenant_id);
          return true;
        })
        .slice(0, 6)
        .map((p: any) => ({
          pageSlug: p.slug,
          pageTitle: p.title,
          tenant: tenantById.get(p.tenant_id)!,
        }));
    },
  });

const PartnerNetworks = () => {
  const { data } = usePublicTenantPages();
  if (!data || data.length === 0) return null;

  return (
    <section className="py-16 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-black mb-2">
            Live on Partner Networks
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real broadband providers already running FGN-powered gaming communities for their
            subscribers.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {data.map(({ tenant, pageSlug, pageTitle }) => (
            <Link
              key={tenant.slug}
              to={`/pages/${tenant.slug}/${pageSlug}`}
              className="group rounded-xl border border-border bg-card/90 backdrop-blur-sm p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-2">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-display font-bold leading-tight">{tenant.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {pageTitle}
                <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const GuestMarketingSections = () => (
  <>
    <StatsStrip />
    <HowItWorks />
    <PartnerNetworks />
    <ProviderCallout />
  </>
);

export default GuestMarketingSections;
