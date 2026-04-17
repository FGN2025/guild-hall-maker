import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import SectionPreview from "@/components/webpages/SectionPreview";

/**
 * Renders the active tenant's custom banner sections (built in the
 * Web Page editor) at the top of the player portal. Renders nothing
 * when the user has no tenant or the tenant has no published banner.
 */
const TenantBannerSlot = () => {
  const { branding } = useTenantBranding();
  if (!branding || branding.bannerSections.length === 0) return null;

  return (
    <div className="mb-4 md:mb-6 space-y-4">
      {branding.bannerSections.map((s) => (
        <SectionPreview key={s.id} section={s} />
      ))}
    </div>
  );
};

export default TenantBannerSlot;
