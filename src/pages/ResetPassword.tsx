import { useState, useEffect } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { Label } from "@/components/ui/label";
import { Gamepad2, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  usePageTitle("Reset Password");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;
    const grant = () => {
      if (!settled) {
        settled = true;
        setCanReset(true);
        setChecking(false);
      }
    };

    // 1. Check URL hash for recovery markers
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      grant();
    }

    // 2. Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        grant();
      }
    });

    // 3. Check if a session already exists (token was already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        grant();
      }
      // If nothing granted after session check, mark as invalid
      if (!settled) {
        // Give a short delay for the auth event to fire
        setTimeout(() => {
          if (!settled) {
            settled = true;
            setChecking(false);
          }
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  // Still checking — show spinner
  if (checking) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-xl p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Verifying reset link…</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid link
  if (!canReset) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-xl p-8 text-center">
            <Gamepad2 className="h-8 w-8 text-primary mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold text-foreground mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              This link is invalid or has expired. Please request a new password reset.
            </p>
            <Link to="/auth">
              <Button variant="outline" className="font-heading">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Valid — show reset form
  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>

        <div className="glass-panel rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <span className="font-display text-2xl font-bold text-foreground">FGN</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading text-sm text-foreground">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-card border-border font-body"
                  minLength={6}
                  maxLength={72}
                  required
                />
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-heading text-sm text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-card border-border font-body"
                  minLength={6}
                  maxLength={72}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
