import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CheckCircle2, Zap, Users, BarChart3, Shield, Loader2, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  contactEmail: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.string().min(1, "Please select a role"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  preferredDate: z.string().optional().or(z.literal("")),
  preferredTime: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;
type ContactFormValues = z.infer<typeof contactSchema>;

const features = [
  { icon: Users, title: "Player Management", desc: "Manage subscribers, leads, and player engagement" },
  { icon: Zap, title: "Cloud Gaming", desc: "Offer cloud gaming seats as a premium add-on" },
  { icon: BarChart3, title: "Analytics & Insights", desc: "Track engagement, retention, and ROI" },
  { icon: Shield, title: "White-Label Events", desc: "Host branded tournaments and challenges" },
];

const ForProviders = () => {
  usePageTitle("For Providers");
  const [submitting, setSubmitting] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

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

  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: "", lastName: "", contactEmail: "", phone: "", role: "", message: "", preferredDate: "", preferredTime: "" },
  });

  const onContactSubmit = async (values: ContactFormValues) => {
    setContactSubmitting(true);
    try {
      const { error } = await supabase.from("provider_inquiries").insert({
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.contactEmail,
        phone: values.phone || null,
        role: values.role,
        message: values.message || null,
        preferred_date: values.preferredDate || null,
        preferred_time: values.preferredTime || null,
      });
      if (error) throw error;
      toast.success("Thank you! We'll be in touch shortly.");
      setContactSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setContactSubmitting(false);
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="font-heading tracking-wide text-lg px-8"
                onClick={() => document.getElementById("signup-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                Get Started — $850/mo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="font-heading tracking-wide text-lg px-8 border-primary text-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] hover:bg-primary/10 transition-shadow"
                onClick={() => document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Schedule a Meeting
              </Button>
            </div>
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

      {/* Contact / Schedule a Meeting */}
      <section id="contact-form" className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">Schedule a Meeting</h2>
              <p className="text-muted-foreground">
                Interested in learning more? Fill out the form below and we'll reach out to schedule a conversation.
              </p>
            </div>

            {contactSubmitted ? (
              <Card className="bg-card border-primary/30">
                <CardContent className="pt-8 pb-8 text-center space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="font-heading text-xl font-semibold text-foreground">We've received your inquiry!</h3>
                  <p className="text-muted-foreground">A member of our team will contact you within 1–2 business days.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <Form {...contactForm}>
                    <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={contactForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contactForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={contactForm.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone <span className="text-muted-foreground">(optional)</span></FormLabel>
                            <FormControl><Input type="tel" placeholder="(555) 123-4567" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>I am a…</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="broadband_operator">Broadband Operator</SelectItem>
                                <SelectItem value="marketing_director">Marketing Director</SelectItem>
                                <SelectItem value="executive">Executive</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message <span className="text-muted-foreground">(optional)</span></FormLabel>
                            <FormControl><Textarea placeholder="Tell us about your organization and goals…" rows={4} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={contactForm.control}
                          name="preferredDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Date <span className="text-muted-foreground">(optional)</span></FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contactForm.control}
                          name="preferredTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Time <span className="text-muted-foreground">(optional)</span></FormLabel>
                              <FormControl><Input type="time" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" className="w-full font-heading tracking-wide" size="lg" disabled={contactSubmitting}>
                        {contactSubmitting ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                        ) : (
                          "Request a Meeting"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

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
