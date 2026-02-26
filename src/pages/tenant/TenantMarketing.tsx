import { useState } from "react";
import { useMarketingCampaigns, MarketingCampaign } from "@/hooks/useMarketingCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORY_TABS = ["all", "social_media", "print", "email", "event"];

const TenantMarketing = () => {
  const { campaigns, isLoading } = useMarketingCampaigns(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const navigate = useNavigate();

  const filtered = campaigns.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" /> Marketing Library
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and download marketing assets for your campaigns</p>
      </div>

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
          {filtered.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(`/tenant/marketing/${c.id}`)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="mb-2 capitalize">{c.category.replace("_", " ")}</Badge>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantMarketing;
