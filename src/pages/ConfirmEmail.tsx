import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, Gamepad2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import usePageTitle from "@/hooks/usePageTitle";

const ConfirmEmail = () => {
  usePageTitle("Confirm Your Email");
  const { user, emailConfirmed, loading } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);

  // Poll session to detect confirmation
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email_confirmed_at) {
        // Refresh the session so AuthContext picks it up
        await supabase.auth.refreshSession();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Redirect once confirmed
  useEffect(() => {
    if (!loading && emailConfirmed) {
      navigate("/dashboard", { replace: true });
    }
  }, [emailConfirmed, loading, navigate]);

  // Not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  const handleResend = async () => {
    if (!user?.id) return;
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke("resend-confirmation", {
        body: { userId: user.id },
      });
      if (error) throw error;
      toast.success("Confirmation email sent! Check your inbox.");
    } catch {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <span className="font-display text-2xl font-bold text-foreground">FGN</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Confirm Your Email</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You need to verify your email before accessing the platform
            </p>
          </div>

          <div className="text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <div className="space-y-2">
              <p className="text-foreground font-body">
                We sent a confirmation link to:
              </p>
              <p className="text-primary font-heading font-bold text-lg break-all">
                {user?.email ?? "your email"}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
              <p className="text-sm text-muted-foreground font-body">
                Open the email and click the confirmation link. This page will automatically redirect once your email is verified.
              </p>
            </div>

            <Button
              onClick={handleResend}
              disabled={resending}
              className="w-full font-heading"
            >
              {resending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
              ) : (
                "Resend Confirmation Email"
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full font-heading"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth", { replace: true });
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Sign Out & Return to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
