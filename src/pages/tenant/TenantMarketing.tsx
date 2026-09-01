import { useState, useMemo } from "react";
import { useMarketingCampaigns, MarketingCampaign } from "@/hooks/useMarketingCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Megaphone, Image as ImageIcon, KeyRound, FileText, Share2, CalendarClock, Bot, Globe, Rocket } from "lucide-react";
import AgentDraftsPanel from "@/components/tenant/AgentDraftsPanel";
import AgentLaunchCard from "@/components/marketing/AgentLaunchCard";
import RecentAgentRuns from "@/components/marketing/RecentAgentRuns";
import SeedRunDashboard from "@/components/marketing/SeedRunDashboard";
import DispatchStatusBanner from "@/components/marketing/DispatchStatusBanner";

import SocialAccountsManager from "@/components/marketing/SocialAccountsManager";
import ScheduledPostsCalendar from "@/components/marketing/ScheduledPostsCalendar";
import { useNavigate, useSearchParams } from "react-router-dom";
import CalendarPublishManager from "@/components/admin/CalendarPublishManager";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import TenantMarketingAssets from "./TenantMarketingAssets";
import TenantCodes from "./TenantCodes";
import WebPagesTab from "@/components/tenant/marketing/WebPagesTab";
import UniversalAssetsTab from "@/components/tenant/UniversalAssetsTab";
import CampaignStatusBadge, { resolveCampaignStatus, STATUS_ORDER, CAMPAIGN_STATUS_LABELS, type CampaignStatusKey } from "@/components/marketing/CampaignStatusBadge";
import { useTenantReviewQueue } from "@/hooks/useTenantReviewQueue";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CATEGORY_TABS = ["all", "social_media", "print", "email", "event"];
const STATUS_FILTERS: ("all" | CampaignStatusKey)[] = ["all", "pending_review", "approved", "published", "rejected", "draft"];


const VALID_TABS = ["campaigns", "assets", "universal", "codes", "webpages", "social", "scheduled", "agent", "runs"] as const;

const TenantMarketing = () => {
  // Not published-only: tenant staff must see their own drafts / pending-review
  // campaigns (the Aug 2026 seed is the first tenant-owned unpublished set).
  const { campaigns, isLoading } = useMarketingCampaigns(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatusKey>("all");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { tenantInfo } = useTenantAdmin();
  const tenantRole = tenantInfo?.tenantRole ?? "admin";

  const tabParam = searchParams.get("tab");
  const activeTab = (VALID_TABS as readonly string[]).includes(tabParam || "")
    ? (tabParam as string)
    : "campaigns";
  const handleTabChange = (val: string) => {
    if (val === "campaigns") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", val);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Campaign thumbnails come from three places, in priority order:
  //   1. marketing_assets      — the shared platform library (manual uploads)
  //   2. tenant_marketing_assets — where the marketing agent writes composed
  //      promos (library boundary intact: read-only here, never written to (1))
  //   3. scheduled_posts.image_url — art attached only at post level
  const { data: assetSummaryRaw } = useQuery({
    queryKey: ["marketing_asset_summaries"],
    queryFn: async () => {
      const [libRes, tenantRes, postsRes] = await Promise.all([
        supabase.from("marketing_assets" as any).select("campaign_id, url").order("display_order", { ascending: true }),
        supabase
          .from("tenant_marketing_assets" as any)
          .select("campaign_id, url")
          .not("campaign_id", "is", null)
          .order("created_at", { ascending: true }),
        supabase
          .from("scheduled_posts" as any)
          .select("campaign_id, image_url")
          .not("campaign_id", "is", null)
          .not("image_url", "is", null),
      ]);
      if (libRes.error) throw libRes.error;
      return {
        library: (libRes.data ?? []) as unknown as { campaign_id: string; url: string }[],
        tenant: (tenantRes.data ?? []) as unknown as { campaign_id: string; url: string }[],
        posts: (postsRes.data ?? []) as unknown as { campaign_id: string; image_url: string }[],
      };
    },
  });

  const assetMap = useMemo(() => {
    const map: Record<string, { count: number; first_url: string }> = {};
    if (!assetSummaryRaw) return map;
    const add = (campaignId: string | null, url: string | null) => {
      if (!campaignId) return;
      if (!map[campaignId]) map[campaignId] = { count: 0, first_url: url ?? "" };
      else if (!map[campaignId].first_url && url) map[campaignId].first_url = url;
      map[campaignId].count++;
    };
    for (const row of assetSummaryRaw.library) add(row.campaign_id, row.url);
    for (const row of assetSummaryRaw.tenant) add(row.campaign_id, row.url);
    // Post images do not count as library assets — they only supply a thumbnail.
    for (const row of assetSummaryRaw.posts) {
      if (!map[row.campaign_id]) map[row.campaign_id] = { count: 0, first_url: row.image_url };
      else if (!map[row.campaign_id].first_url) map[row.campaign_id].first_url = row.image_url;
    }
    return map;
  }, [assetSummaryRaw]);


  // Get the user's tenant_id
  const { data: tenantAdmin } = useQuery({
    queryKey: ["my_tenant_id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_admins")
        .select("tenant_id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data?.tenant_id as string | null;
    },
  });

  /** Count of items waiting on a reviewer, shown on the Review tab and banner.
   *  Shared with the portal bell so both surfaces can never disagree. */
  const { data: reviewQueue } = useTenantReviewQueue(tenantAdmin ?? tenantInfo?.tenantId ?? null);
  const pendingReviewCount = reviewQueue?.total ?? 0;


  /** Scope: this tenant's own rows + platform library rows (tenant_id IS NULL),
   *  matching what the tab has always shown. */
  const scoped = useMemo(
    () => campaigns.filter((c) => c.tenant_id === null || (tenantAdmin && c.tenant_id === tenantAdmin)),
    [campaigns, tenantAdmin]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of scoped) counts[resolveCampaignStatus(c)] = (counts[resolveCampaignStatus(c)] ?? 0) + 1;
    return counts;
  }, [scoped]);

  const filtered = useMemo(
    () =>
      scoped
        .filter((c) => {
          if (category !== "all" && c.category !== category) return false;
          if (statusFilter !== "all" && resolveCampaignStatus(c) !== statusFilter) return false;
          if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        })
        // Pending review surfaces first, then newest within each status group.
        .sort((a, b) => {
          const d = STATUS_ORDER[resolveCampaignStatus(a)] - STATUS_ORDER[resolveCampaignStatus(b)];
          if (d !== 0) return d;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }),
    [scoped, category, statusFilter, search]
  );


  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <Megaphone className="h-7 w-7 sm:h-8 sm:w-8 text-primary" /> Marketing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Campaigns, assets, codes, and web pages in one place</p>
      </div>

      {/* Reviewer shortcut. The tab row scrolls, but on a 390px phone a reviewer
          arriving from a digest email should never have to find a tab at all. */}
      {pendingReviewCount > 0 && activeTab !== "agent" && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {pendingReviewCount} item{pendingReviewCount === 1 ? "" : "s"} waiting for review
            </p>
            {reviewQueue && (reviewQueue.lapsed > 0 || reviewQueue.dueSoon > 0) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {reviewQueue.lapsed > 0 && `${reviewQueue.lapsed} past their slot`}
                {reviewQueue.lapsed > 0 && reviewQueue.dueSoon > 0 && " · "}
                {reviewQueue.dueSoon > 0 && `${reviewQueue.dueSoon} due within 48h`}
              </p>
            )}
          </div>
          <Button className="min-h-[44px] w-full sm:w-auto" onClick={() => handleTabChange("agent")}>
            Review now <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      <DispatchStatusBanner tenantId={tenantAdmin} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">

        {/* Horizontally scrollable on narrow screens — an eight-item row cannot
            fit at 390px, and the Review tab must never be the one clipped off. */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
          <TabsList className="bg-muted w-max flex-nowrap justify-start">
            <TabsTrigger value="agent" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <Bot className="h-4 w-4" /> Review
              {pendingReviewCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{pendingReviewCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <Rocket className="h-4 w-4" /> Runs
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <Megaphone className="h-4 w-4" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="assets" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <ImageIcon className="h-4 w-4" /> My Assets
            </TabsTrigger>
            <TabsTrigger value="universal" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <Globe className="h-4 w-4" /> Universal Assets
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <KeyRound className="h-4 w-4" /> Codes
            </TabsTrigger>
            <TabsTrigger value="webpages" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <FileText className="h-4 w-4" /> Web Pages
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <Share2 className="h-4 w-4" /> Social Accounts
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2 font-heading shrink-0 min-h-[44px]">
              <CalendarClock className="h-4 w-4" /> Scheduled
            </TabsTrigger>
          </TabsList>
        </div>



        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={category} onValueChange={setCategory} className="flex-1">
              <TabsList className="bg-muted">
                {CATEGORY_TABS.map((t) => (
                  <TabsTrigger key={t} value={t} className="capitalize text-sm font-heading">
                    {t.replace("_", " ")}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Status filter — pending review is also sorted to the top by default */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => {
              const count = s === "all" ? scoped.length : statusCounts[s] ?? 0;
              if (s !== "all" && count === 0) return null;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-heading transition-colors ${
                    statusFilter === s
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : CAMPAIGN_STATUS_LABELS[s]} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>


          {isLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">No campaigns available yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => {
                const now = Date.now();
                const createdMs = new Date(c.created_at).getTime();
                const updatedMs = new Date(c.updated_at).getTime();
                const isNew = now - createdMs < 7 * 24 * 60 * 60 * 1000;
                const isUpdated = !isNew && now - updatedMs < 3 * 24 * 60 * 60 * 1000;

                return (
                  <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition-colors overflow-hidden" onClick={() => navigate(`/tenant/marketing/${c.id}`)}>
                    {assetMap[c.id]?.first_url && (
                      <div className="h-32 w-full bg-muted">
                        <img
                          src={assetMap[c.id].first_url}
                          alt={`${c.title} promo art`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg font-heading">{c.title}</CardTitle>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <CampaignStatusBadge status={resolveCampaignStatus(c)} />
                          {isNew && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">New</Badge>
                          )}
                          {isUpdated && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">Updated</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <Badge variant="outline" className="mb-2 capitalize">{c.category.replace("_", " ")}</Badge>
                      {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>
                          {assetMap[c.id]?.count
                            ? `${assetMap[c.id].count} asset${assetMap[c.id].count !== 1 ? "s" : ""}`
                            : assetMap[c.id]?.first_url
                              ? "Art on posts"
                              : "No assets yet"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {tenantAdmin && (
            <div className="rounded-lg border border-border bg-card p-6">
              <CalendarPublishManager
                tenantId={tenantAdmin}
                tenantLogoUrl={tenantInfo?.logoUrl}
                tenantPrimaryColor={tenantInfo?.primaryColor}
                tenantAccentColor={tenantInfo?.accentColor}
              />
            </div>
          )}
        </TabsContent>

        {/* My Assets Tab */}
        <TabsContent value="assets">
          <TenantMarketingAssets embedded />
        </TabsContent>

        <TabsContent value="universal">
          <UniversalAssetsTab tenantId={tenantAdmin ?? null} />
        </TabsContent>


        {/* Codes Tab */}
        <TabsContent value="codes">
          <TenantCodes embedded />
        </TabsContent>

        {/* Web Pages Tab */}
        <TabsContent value="webpages">
          <WebPagesTab />
        </TabsContent>

        {/* Social Accounts Tab */}
        <TabsContent value="social">
          <SocialAccountsManager tenantId={tenantAdmin} />
        </TabsContent>

        {/* Scheduled Posts Tab */}
        <TabsContent value="scheduled">
          <ScheduledPostsCalendar tenantId={tenantAdmin} />
        </TabsContent>

        <TabsContent value="agent" className="space-y-4">
          {tenantAdmin && (
            <>
              <AgentLaunchCard tenantId={tenantAdmin} role={tenantRole} />
              <RecentAgentRuns tenantId={tenantAdmin} />
            </>
          )}
          <AgentDraftsPanel tenantId={tenantAdmin} />
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          <SeedRunDashboard tenantId={tenantAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantMarketing;
