import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CheckCircle2, Zap, Users, BarChart3, Shield, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import usePageTitle from "@/hooks/usePageTitle";

const formSchema = z.object({
  orgName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

type FormValues = z.infer<typeof formSchema>;

const features = [
  { icon: Users, title: "Player Management", desc: "Manage subscribers, leads, and player engagement" },
  { icon: Zap, title: "Cloud Gaming", desc: "Offer cloud gaming seats as a premium add-on" },
  { icon: BarChart3, title: "Analytics & Insights", desc: "Track engagement, retention, and ROI" },
  { icon: Shield, title: "White-Label Events", desc: "Host branded tournaments and challenges" },
];

const ForProviders = () => {
  usePageTitle("For Providers");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { orgName: "", email: "", displayName: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("provision-tenant", {
        body: values,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        toast.success("Redirecting to checkout…");
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const password = form.watch("password");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-heading text-primary tracking-wide">For Broadband Providers</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 tracking-tight">
              Turn Subscribers Into <span className="text-primary">Gamers</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              FGN gives broadband providers a turnkey competitive gaming platform—tournaments, challenges,
              cloud gaming, and community—all under your brand. Reduce churn and boost engagement.
            </p>
            <Button
              size="lg"
              className="font-heading tracking-wide text-lg px-8"
              onClick={() => document.getElementById("signup-form")?.scrollIntoView({ behavior: "smooth" })}
            >
              Get Started — $850/mo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-display font-bold text-center text-foreground mb-10">
            Everything You Need
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((f) => (
              <Card key={f.title} className="bg-card border-border">
                <CardContent className="pt-6">
                  <f.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-heading font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing + signup */}
      <section id="signup-form" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan card */}
            <Card className="bg-card border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
              <CardHeader>
                <CardTitle className="font-display text-2xl text-foreground">Tenant Basic</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Full-featured gaming engagement platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold text-foreground">$850</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    "Branded tournament & challenge hosting",
                    "Subscriber & lead management",
                    "Cloud gaming seat add-on ($29.99/seat/mo)",
                    "Marketing asset library",
                    "Embeddable event calendar",
                    "ZIP-code coverage mapping",
                    "Dedicated team roles (Admin, Manager, Marketing)",
                    "Billing system integration (NISC, GLDS)",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl text-foreground">Create Your Organization</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set up your account and proceed to payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="orgName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Broadband" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <PasswordInput placeholder="Create a password" {...field} />
                          </FormControl>
                          <PasswordStrengthIndicator password={password} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full font-heading tracking-wide" size="lg" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up…
                        </>
                      ) : (
                        "Continue to Checkout"
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      You'll be redirected to Stripe for secure payment. A confirmation email will be sent to verify your account.
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-sm tracking-widest text-primary mb-4">FGN</p>
          <p className="text-sm text-muted-foreground">
            © 2026 Fibre Gaming Network. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ForProviders;
