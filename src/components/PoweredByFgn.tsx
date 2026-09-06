import { Link } from "react-router-dom";

/**
 * Subtle FGN attribution + provider acquisition hook for public
 * tenant-branded pages. Tenants keep their branding; this just gives
 * visitors (and other ISPs) a path back to the platform.
 */
const PoweredByFgn = () => (
  <footer className="border-t border-border py-8 mt-auto">
    <div className="max-w-5xl mx-auto px-6 text-center space-y-2">
      <p className="text-sm text-muted-foreground">
        Powered by{" "}
        <a href="https://play.fgn.gg" className="text-primary hover:underline font-medium">
          Fiber Gaming Network
        </a>
      </p>
      <p className="text-sm text-muted-foreground">
        Want events like this for your community?{" "}
        <Link to="/for-providers" className="text-primary hover:underline">
          See how FGN works for broadband providers
        </Link>
      </p>
    </div>
  </footer>
);

export default PoweredByFgn;
