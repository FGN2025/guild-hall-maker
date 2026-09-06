import { Link } from "react-router-dom";

interface PoweredByFgnProps {
  tenantSlug: string;
}

/**
 * Subtle FGN attribution + provider acquisition hook for public
 * tenant-branded pages. Tenants keep their branding; this just gives
 * visitors (and other ISPs) a path back to the platform.
 */
const PoweredByFgn = ({ tenantSlug }: PoweredByFgnProps) => {
  const fgnUrl = new URL("https://play.fgn.gg");
  fgnUrl.searchParams.set("utm_source", "fgn-tenant");
  fgnUrl.searchParams.set("utm_medium", "referral");
  fgnUrl.searchParams.set("utm_campaign", "tenant-events");
  fgnUrl.searchParams.set("utm_content", tenantSlug);

  return (
    <footer className="border-t border-border py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Powered by{" "}
          <a
            href={fgnUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Fiber Gaming Network
          </a>
        </p>
        <p className="text-sm text-muted-foreground">
          Want events like this for your community?{" "}
          <Link to="/for-providers#contact-form" className="text-primary hover:underline">
            See how FGN works for broadband providers
          </Link>
        </p>
      </div>
    </footer>
  );
};

export default PoweredByFgn;
