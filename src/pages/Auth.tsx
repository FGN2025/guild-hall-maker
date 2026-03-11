import { useState, useEffect } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Gamepad2, Mail, Lock, User, ArrowLeft, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ZipCheckStep from "@/components/auth/ZipCheckStep";
import SubscriberVerifyStep from "@/components/auth/SubscriberVerifyStep";
import { useRegistrationZipCheck } from "@/hooks/useRegistrationZipCheck";
import { useDisplayNameCheck } from "@/hooks/useDisplayNameCheck";

type SignupStep = "zip" | "subscriber-verify" | "account" | "confirmation";

const Auth = () => {
  usePageTitle("Sign In");
  const [searchParams] = useSearchParams();
  const isInviteFlow = searchParams.get("invite") === "true";
  const inviteEmail = searchParams.get("email") || "";
  const { user, loading: authLoading, emailConfirmed } = useAuth();

  const [isLogin, setIsLogin] = useState(!isInviteFlow);
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [legacyUsername, setLegacyUsername] = useState<string | null>(null);
  const navigate = useNavigate();

  // Redirect authenticated users away from /auth
  useEffect(() => {
    if (authLoading) return;
    if (user && emailConfirmed) {
      navigate("/dashboard", { replace: true });
    } else if (user && !emailConfirmed) {
      navigate("/confirm-email", { replace: true });
    }
  }, [user, emailConfirmed, authLoading, navigate]);

  // ZIP check state (signup only)
  const [zipCode, setZipCode] = useState("");
  const [bypassCode, setBypassCode] = useState("");
  const [signupStep, setSignupStep] = useState<SignupStep>(isInviteFlow ? "account" : "zip");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { checkZip, loading: zipLoading, result: zipResult, reset: resetZip } = useRegistrationZipCheck();
  const displayNameStatus = useDisplayNameCheck(displayName, !isLogin && signupStep === "account" && !isInviteFlow);

  const handleZipCheck = async () => {
    await checkZip(zipCode, bypassCode || undefined);
  };

  const handleZipProceed = async (tenantId?: string) => {
    setSelectedTenantId(tenantId || null);

    // If a provider was selected, check if it requires subscriber validation
    if (tenantId) {
      try {
        const { data } = await supabase
          .from("tenants")
          .select("require_subscriber_validation")
          .eq("id", tenantId)
          .single();

        if (data?.require_subscriber_validation) {
          setSignupStep("subscriber-verify");
          return;
        }
      } catch {
        // If lookup fails, skip validation
      }
    }

    setSignupStep("account");
  };

  const handleSubscriberVerified = () => {
    setSignupStep("account");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!isLogin && !termsAccepted) {
      toast.error("You must accept the Terms and Conditions to create an account.");
      return;
    }

    if (!isLogin && !isInviteFlow && !displayName.trim()) {
      toast.error("Display Name is required.");
      return;
    }

    if (!isLogin && displayNameStatus === "taken") {
      toast.error("That display name is already taken. Please choose another.");
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
        // Claim any pending tenant invitations silently
        try { await supabase.rpc('claim_pending_invitations'); } catch {}
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
        // Detect repeated signup (existing user) — Supabase returns user with empty identities
        const isRepeatedSignup = data.user && (!data.user.identities || data.user.identities.length === 0);
        if (isRepeatedSignup) {
          // Stay in confirmation flow — don't force login; offer resend instead
          toast.info("An account with this email already exists but hasn't been verified yet. We've kept you on the verification screen so you can resend the confirmation email.");
          setSignupStep("confirmation");
          setLoading(false);
          return;
        }
        if (data.user) {
          await supabase
            .from("profiles")
            .update({ zip_code: zipCode })
            .eq("user_id", data.user.id);

          // Create lead only for the selected provider (not all)
          if (selectedTenantId) {
            await supabase.from("user_service_interests").insert({
              user_id: data.user.id,
              tenant_id: selectedTenantId,
              zip_code: zipCode,
              status: "new",
            });
          } else if (zipResult?.providers && zipResult.providers.length > 0) {
            // Bypass flow — link all providers
            const interests = zipResult.providers.map((p) => ({
              user_id: data.user!.id,
              tenant_id: p.tenant_id,
              zip_code: zipCode,
              status: "new",
            }));
            await supabase.from("user_service_interests").insert(interests);
          }

          // Auto-match legacy user by email
          try {
            const { data: matchResult } = await supabase.functions.invoke("match-legacy-user", {
              body: { email, user_id: data.user!.id },
            });
            if (matchResult?.matched) {
              setLegacyUsername(matchResult.legacy_username);
            }
          } catch {
            // ignore
          }

          setSignupStep("confirmation");
        } else {
          setSignupStep("confirmation");
        }
      }
    }

    setLoading(false);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setSignupStep("zip");
    setSelectedTenantId(null);
    setZipCode("");
    setBypassCode("");
    setTermsAccepted(false);
    resetZip();
  };

  const getTitle = () => {
    if (isLogin) return "Welcome Back";
    if (signupStep === "zip") return "Verify Location";
    if (signupStep === "subscriber-verify") return "Verify Subscriber";
    if (signupStep === "confirmation") return "You're Almost There!";
    return "Create Account";
  };

  const getSubtitle = () => {
    if (isLogin) return "Sign in to your account";
    if (signupStep === "zip") return "Enter your ZIP code to get started";
    if (signupStep === "subscriber-verify") return "Confirm your service provider account";
    if (signupStep === "confirmation") return "Just one more step to activate your account";
    return "Complete your registration";
  };

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
            <h1 className="font-display text-xl font-bold text-foreground">{getTitle()}</h1>
            <p className="text-sm text-muted-foreground mt-1">{getSubtitle()}</p>
          </div>

          {/* Signup: ZIP check step */}
          {!isLogin && signupStep === "zip" && (
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

          {/* Signup: Subscriber verification step */}
          {!isLogin && signupStep === "subscriber-verify" && selectedTenantId && (
            <SubscriberVerifyStep
              tenantId={selectedTenantId}
              zipCode={zipCode}
              onVerified={handleSubscriberVerified}
              onBack={() => {
                setSignupStep("zip");
                setSelectedTenantId(null);
              }}
            />
          )}

          {/* Confirmation screen after signup */}
          {!isLogin && signupStep === "confirmation" && (
            <div className="text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>

              {legacyUsername && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm text-foreground font-heading">
                    Welcome back, <span className="font-bold">{legacyUsername}</span>!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your legacy account has been linked automatically.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-foreground font-body">
                  We've sent a confirmation email to:
                </p>
                <p className="text-primary font-heading font-bold text-lg break-all">
                  {email}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground font-body">
                    Open the email and click the confirmation link
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground font-body">
                    Your account will be activated instantly
                  </p>
                </div>
                {isInviteFlow && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground font-body">
                      Your team role will be assigned automatically
                    </p>
                  </div>
                )}
              </div>

              {/* Resend confirmation email */}
              <Button
                variant="default"
                className="w-full font-heading"
                disabled={resending}
                onClick={async () => {
                  setResending(true);
                  try {
                    const { error } = await supabase.functions.invoke("resend-confirmation", {
                      body: { email: email.trim() },
                    });
                    if (error) throw error;
                    toast.success("Confirmation email resent! Check your inbox.");
                  } catch {
                    toast.error("Failed to resend. Please try again in a moment.");
                  } finally {
                    setResending(false);
                  }
                }}
              >
                {resending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Resend Confirmation Email</>
                )}
              </Button>

              {/* Try signing in after verifying */}
              <Button
                variant="secondary"
                className="w-full font-heading"
                disabled={loading}
                onClick={async () => {
                  if (!password.trim()) {
                    toast.error("Enter your password to continue.");
                    return;
                  }
                  setLoading(true);
                  const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                  });
                  setLoading(false);
                  if (error) {
                    if (error.message.toLowerCase().includes("not confirmed")) {
                      toast.error("Email not verified yet. Please check your inbox and click the link first.");
                    } else {
                      toast.error(error.message);
                    }
                  } else {
                    toast.success("Welcome!");
                    navigate("/dashboard");
                  }
                }}
              >
                {loading ? "Checking…" : "I've Verified — Continue"}
              </Button>

              <Button
                variant="outline"
                className="w-full font-heading"
                onClick={() => {
                  setIsLogin(true);
                  setSignupStep("zip");
                  setPassword("");
                  setLegacyUsername(null);
                }}
              >
                Go to Sign In
              </Button>
            </div>
          )}

          {/* Login form or signup account form */}
          {(isLogin || signupStep === "account") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isInviteFlow && (
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
                      required
                    />
                  </div>
                  {displayName.trim().length >= 2 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {displayNameStatus === "checking" && (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Checking…</span></>
                      )}
                      {displayNameStatus === "available" && (
                        <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-xs text-green-500">Available</span></>
                      )}
                      {displayNameStatus === "taken" && (
                        <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-destructive">Already taken</span></>
                      )}
                    </div>
                  )}
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
                    readOnly={isInviteFlow && !isLogin}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-heading text-sm text-foreground">
                  Password
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
                {!isLogin && <PasswordStrengthIndicator password={password} />}
                {isLogin && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email.trim()) {
                        toast.error("Enter your email first, then click Forgot Password.");
                        return;
                      }
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) toast.error(error.message);
                      else toast.success("Password reset link sent! Check your email.");
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-body"
                  >
                    Forgot your password?
                  </button>
                )}
              </div>

              {!isLogin && (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(!!v)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm font-body text-muted-foreground cursor-pointer leading-snug">
                    I have read and agree to the{" "}
                    <Link to="/terms" target="_blank" className="text-primary hover:underline">
                      Terms and Conditions
                    </Link>
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (!isLogin && (displayNameStatus === "taken" || displayNameStatus === "checking"))}
                className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
              >
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>

              {!isLogin && !isInviteFlow && (
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep("zip");
                    setSelectedTenantId(null);
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to location check
                </button>
              )}
            </form>
          )}

          {signupStep !== "confirmation" && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
