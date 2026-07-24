import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, FileText } from "lucide-react";
import TenantBanner from "@/pages/tenant/TenantBanner";
import TenantLandingPages from "@/pages/tenant/TenantLandingPages";

const VALID_SUBS = ["banner", "pages"] as const;
type Sub = (typeof VALID_SUBS)[number];

/**
 * Marketing → Web Pages tab. Two sub-tabs (Banner | Landing Pages) that host
 * the full editor surfaces previously living at /tenant/branding/banner and
 * /tenant/branding/pages. Sub-tab state persists in ?sub=banner|pages.
 */
const WebPagesTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = searchParams.get("sub");
  const activeSub: Sub = (VALID_SUBS as readonly string[]).includes(subParam || "")
    ? (subParam as Sub)
    : "banner";

  const handleSubChange = (val: string) => {
    searchParams.set("tab", "webpages");
    if (val === "banner") searchParams.delete("sub");
    else searchParams.set("sub", val);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <Tabs value={activeSub} onValueChange={handleSubChange} className="space-y-4">
      <TabsList className="bg-muted">
        <TabsTrigger value="banner" className="gap-2 font-heading">
          <Radio className="h-4 w-4" /> Banner
        </TabsTrigger>
        <TabsTrigger value="pages" className="gap-2 font-heading">
          <FileText className="h-4 w-4" /> Landing Pages
        </TabsTrigger>
      </TabsList>

      <TabsContent value="banner">
        <TenantBanner embedded />
      </TabsContent>
      <TabsContent value="pages">
        <TenantLandingPages embedded />
      </TabsContent>
    </Tabs>
  );
};

export default WebPagesTab;
