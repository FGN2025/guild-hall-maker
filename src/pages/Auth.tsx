import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ZipCheckStep from "@/components/auth/ZipCheckStep";
import { useRegistrationZipCheck } from "@/hooks/useRegistrationZipCheck";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ZIP check state (signup only)
  const [zipCode, setZipCode] = useState("");
  const [bypassCode, setBypassCode] = useState("");
  const [zipVerified, setZipVerified] = useState(false);
  const { checkZip, loading: zipLoading, result: zipResult, reset: resetZip } = useRegistrationZipCheck();

  const handleZipCheck = async () => {
    await checkZip(zipCode, bypassCode || undefined);
  };

  const handleZipProceed = () => {
    setZipVerified(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName.trim() || undefined,
            zip_code: zipCode,
          },
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        // Store ZIP in profile and create service interest leads
        if (data.user) {
          // Update profile with zip_code
          await supabase
            .from("profiles")
            .update({ zip_code: zipCode })
            .eq("user_id", data.user.id);

          // Create leads for matched providers
          if (zipResult?.providers && zipResult.providers.length > 0) {
            const interests = zipResult.providers.map((p) => ({
              user_id: data.user!.id,
              tenant_id: p.tenant_id,
              zip_code: zipCode,
              status: "new",
            }));
            await supabase.from("user_service_interests").insert(interests);
          }
        }
        toast.success("Check your email to confirm your account!");
      }
    }

    setLoading(false);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setZipVerified(false);
    setZipCode("");
    setBypassCode("");
    resetZip();
  };

  // For signup: show ZIP check step first, then account form
  const showAccountForm = isLogin || zipVerified;

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="glass-panel rounded-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <span className="font-display text-2xl font-bold text-foreground">FGN</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {isLogin ? "Welcome Back" : zipVerified ? "Create Account" : "Verify Location"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin
                ? "Sign in to your account"
                : zipVerified
                ? "Complete your registration"
                : "Enter your ZIP code to get started"}
            </p>
          </div>

          {/* Signup: ZIP check step */}
          {!isLogin && !zipVerified && (
            <ZipCheckStep
              zipCode={zipCode}
              setZipCode={setZipCode}
              bypassCode={bypassCode}
              setBypassCode={setBypassCode}
              result={zipResult}
              loading={zipLoading}
              onCheck={handleZipCheck}
              onProceed={handleZipProceed}
            />
          )}

          {/* Login form or signup account form (after ZIP verified) */}
          {showAccountForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="font-heading text-sm text-foreground">
                    Display Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your gamer name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10 bg-card border-border font-body"
                      maxLength={50}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-heading text-sm text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="player@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-card border-border font-body"
                    maxLength={255}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-heading text-sm text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>

              {!isLogin && (
                <button
                  type="button"
                  onClick={() => { setZipVerified(false); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to location check
                </button>
              )}
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-body"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
