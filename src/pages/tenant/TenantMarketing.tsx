import { useState, useMemo } from "react";
import { useMarketingCampaigns, MarketingCampaign } from "@/hooks/useMarketingCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Megaphone, Image as ImageIcon, KeyRound, FileText, Share2, CalendarClock, Bot, Globe } from "lucide-react";
import AgentDraftsPanel from "@/components/tenant/AgentDraftsPanel";
import AgentLaunchCard from "@/components/marketing/AgentLaunchCard";
import RecentAgentRuns from "@/components/marketing/RecentAgentRuns";
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
const CATEGORY_TABS = ["all", "social_media", "print", "email", "event"];
const STATUS_FILTERS: ("all" | CampaignStatusKey)[] = ["all", "pending_review", "approved", "published", "rejected", "draft"];


const VALID_TABS = ["campaigns", "assets", "universal", "codes", "webpages", "social", "scheduled", "agent"] as const;

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

  // Fetch asset counts + first thumbnail per campaign in a single query
  const { data: assetSummaryRaw } = useQuery({
    queryKey: ["marketing_asset_summaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_assets" as any)
        .select("campaign_id, url")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as unknown as { campaign_id: string; url: string }[];
    },
  });

  const assetMap = useMemo(() => {
    const map: Record<string, { count: number; first_url: string }> = {};
    if (!assetSummaryRaw) return map;
    for (const row of assetSummaryRaw) {
      if (!map[row.campaign_id]) {
        map[row.campaign_id] = { count: 0, first_url: row.url };
      }
      map[row.campaign_id].count++;
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

  /** Count of items waiting on a reviewer, shown on the Review tab. */
  const { data: pendingReviewCount = 0 } = useQuery({
    queryKey: ["tenant_pending_review_count", tenantAdmin],
    enabled: !!tenantAdmin,
    queryFn: async () => {
      const [campaignsRes, postsRes, assetsRes] = await Promise.all([
        supabase
          .from("marketing_campaigns")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantAdmin!)
          .eq("status", "pending_review"),
        supabase
          .from("scheduled_posts")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantAdmin!)
          .eq("status", "pending_review"),
        supabase
          .from("tenant_marketing_assets")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantAdmin!)
          .eq("is_published", false)
          .not("campaign_id", "is", null),
      ]);
      return (campaignsRes.count ?? 0) + (postsRes.count ?? 0) + (assetsRes.count ?? 0);
    },
  });

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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" /> Marketing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Campaigns, assets, codes, and web pages in one place</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="campaigns" className="gap-2 font-heading">
            <Megaphone className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2 font-heading">
            <ImageIcon className="h-4 w-4" /> My Assets
          </TabsTrigger>
          <TabsTrigger value="universal" className="gap-2 font-heading">
            <Globe className="h-4 w-4" /> Universal Assets
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-2 font-heading">
            <KeyRound className="h-4 w-4" /> Codes
          </TabsTrigger>
          <TabsTrigger value="webpages" className="gap-2 font-heading">
            <FileText className="h-4 w-4" /> Web Pages
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2 font-heading">
            <Share2 className="h-4 w-4" /> Social Accounts
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2 font-heading">
            <CalendarClock className="h-4 w-4" /> Scheduled
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-2 font-heading">
            <Bot className="h-4 w-4" /> Review
            {pendingReviewCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{pendingReviewCount}</Badge>
            )}
          </TabsTrigger>

        </TabsList>

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
                      <div className="h-12 w-full bg-muted">
                        <img
                          src={assetMap[c.id].first_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg font-heading">{c.title}</CardTitle>
                        {isNew && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">New</Badge>
                        )}
                        {isUpdated && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Updated</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="mb-2 capitalize">{c.category.replace("_", " ")}</Badge>
                      {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>{assetMap[c.id] ? `${assetMap[c.id].count} asset${assetMap[c.id].count !== 1 ? 's' : ''}` : 'No assets yet'}</span>
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
      </Tabs>
    </div>
  );
};

export default TenantMarketing;
