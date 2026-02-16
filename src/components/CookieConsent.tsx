import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_CONSENT_KEY = "fgn_cookie_consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-slide-up print:hidden">
      <div className="max-w-2xl mx-auto glass-panel rounded-xl border border-border/50 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <Cookie className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-foreground/90 font-body leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze traffic, and personalize content. By clicking "Accept All," you consent to our use of cookies. Read our{" "}
              <Link to="/privacy" className="text-primary hover:underline font-medium">
                Privacy Policy
              </Link>{" "}
              for more information.
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAccept} className="font-heading tracking-wide">
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} className="font-heading tracking-wide">
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
