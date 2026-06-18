import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailX, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import usePageTitle from "@/hooks/usePageTitle";

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "done" | "error";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Unsubscribe = () => {
  usePageTitle("Unsubscribe");
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("validating");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const r = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, { headers: { apikey: ANON } });
        const j = await r.json();
        if (!r.ok) { setState("invalid"); return; }
        if (j.valid === false && j.reason === "already_unsubscribed") setState("already");
        else if (j.valid) setState("ready");
        else setState("invalid");
      } catch { setState("error"); }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    if (error) setState("error");
    else if ((data as any)?.success) setState("done");
    else if ((data as any)?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center gap-3">
          <MailX className="h-6 w-6 text-primary" />
          <CardTitle>Unsubscribe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "validating" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking your link…</p>
          )}
          {state === "ready" && (
            <>
              <p className="text-sm">Confirm you want to stop receiving these emails.</p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {state === "submitting" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Processing…</p>
          )}
          {state === "done" && (
            <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-5 w-5 text-primary" /> You've been unsubscribed.</p>
          )}
          {state === "already" && (
            <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-5 w-5 text-primary" /> You're already unsubscribed.</p>
          )}
          {state === "invalid" && (
            <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-5 w-5" /> This unsubscribe link is invalid or expired.</p>
          )}
          {state === "error" && (
            <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-5 w-5" /> Something went wrong. Please try again.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
