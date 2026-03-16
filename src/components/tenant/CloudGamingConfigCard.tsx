import { useState, useEffect } from "react";
import { useTenantCloudGaming } from "@/hooks/useTenantCloudGaming";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, Users, Loader2 } from "lucide-react";

interface Props {
  tenantId: string;
}

const TIERS = [
  { value: "basic", label: "Basic (up to 25 seats)" },
  { value: "standard", label: "Standard (up to 100 seats)" },
  { value: "premium", label: "Premium (unlimited)" },
];

const CloudGamingConfigCard = ({ tenantId }: Props) => {
  const { config, isLoading, upsertConfig, activeSeats } = useTenantCloudGaming(tenantId);

  const [enabled, setEnabled] = useState(false);
  const [maxSeats, setMaxSeats] = useState(25);
  const [tier, setTier] = useState("basic");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setEnabled(config.is_enabled);
      setMaxSeats(config.max_seats);
      setTier(config.subscription_tier);
    }
  }, [config]);

  const handleSave = () => {
    upsertConfig.mutate(
      { is_enabled: enabled, max_seats: maxSeats, subscription_tier: tier },
      { onSuccess: () => setDirty(false) }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Cloud className="h-5 w-5" /> Cloud Gaming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Cloud Gaming</p>
            <p className="text-xs text-muted-foreground">
              Allow subscribers to access cloud-based games via Blacknut.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => { setEnabled(v); setDirty(true); }}
          />
        </div>

        {enabled && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Seats</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxSeats}
                  onChange={(e) => { setMaxSeats(Number(e.target.value)); setDirty(true); }}
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {activeSeats} of {maxSeats} seats in use
                </p>
              </div>
              <div className="space-y-2">
                <Label>Subscription Tier</Label>
                <Select value={tier} onValueChange={(v) => { setTier(v); setDirty(true); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={!dirty || upsertConfig.isPending}>
              {upsertConfig.isPending ? "Saving..." : "Save Cloud Gaming Settings"}
            </Button>
          </>
        )}

        {!enabled && dirty && (
          <Button onClick={handleSave} disabled={upsertConfig.isPending}>
            {upsertConfig.isPending ? "Saving..." : "Save"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default CloudGamingConfigCard;
