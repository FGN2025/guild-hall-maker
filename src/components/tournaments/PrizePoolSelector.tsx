import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Gift, Ban } from "lucide-react";

interface PrizePoolSelectorProps {
  prizeType: string;
  onPrizeTypeChange: (type: string) => void;
  prizePool: string;
  onPrizePoolChange: (value: string) => void;
  prizeId: string;
  onPrizeIdChange: (id: string) => void;
  pointsFirst: number;
  pointsSecond: number;
  pointsThird: number;
}

const PrizePoolSelector = ({
  prizeType,
  onPrizeTypeChange,
  prizePool,
  onPrizePoolChange,
  prizeId,
  onPrizeIdChange,
  pointsFirst,
  pointsSecond,
  pointsThird,
}: PrizePoolSelectorProps) => {
  const { data: prizes } = useQuery({
    queryKey: ["prizes-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prizes")
        .select("id, name, image_url, points_cost")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalWeight = pointsFirst + pointsSecond + pointsThird;

  const parseValue = (v: string) => {
    const num = parseFloat(v.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const numericValue = parseValue(prizePool);

  const formatCurrency = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const selectedPrize = prizes?.find((p) => p.id === prizeId);

  return (
    <div className="space-y-3">
      <Label className="font-heading text-sm">Prize Pool</Label>
      <RadioGroup
        value={prizeType}
        onValueChange={(v) => {
          onPrizeTypeChange(v);
          if (v === "none") {
            onPrizePoolChange("");
            onPrizeIdChange("");
          }
        }}
        className="flex gap-4"
      >
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body">
          <RadioGroupItem value="none" />
          <Ban className="h-3.5 w-3.5 text-muted-foreground" />
          None
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body">
          <RadioGroupItem value="physical" />
          <Gift className="h-3.5 w-3.5 text-primary" />
          Physical Prize
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body">
          <RadioGroupItem value="value" />
          <Trophy className="h-3.5 w-3.5 text-accent" />
          Value
        </label>
      </RadioGroup>

      {prizeType === "physical" && (
        <div className="space-y-2">
          <Select
            value={prizeId}
            onValueChange={(id) => {
              onPrizeIdChange(id);
              const prize = prizes?.find((p) => p.id === id);
              if (prize) onPrizePoolChange(prize.name);
            }}
          >
            <SelectTrigger className="bg-card border-border font-body">
              <SelectValue placeholder="Select a prize…" />
            </SelectTrigger>
            <SelectContent>
              {(prizes ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-5 w-5 rounded object-cover"
                      />
                    )}
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPrize && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
              {selectedPrize.image_url && (
                <img src={selectedPrize.image_url} alt="" className="h-10 w-10 rounded object-cover" />
              )}
              <div>
                <p className="text-sm font-heading text-foreground">{selectedPrize.name}</p>
                <p className="text-xs text-muted-foreground">{selectedPrize.points_cost} pts</p>
              </div>
            </div>
          )}
        </div>
      )}

      {prizeType === "value" && (
        <div className="space-y-2">
          <Input
            value={prizePool}
            onChange={(e) => onPrizePoolChange(e.target.value)}
            maxLength={50}
            className="bg-card border-border font-body"
            placeholder="e.g. $5,000"
          />
          {numericValue > 0 && totalWeight > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "1st Place", weight: pointsFirst },
                { label: "2nd Place", weight: pointsSecond },
                { label: "3rd Place", weight: pointsThird },
              ].map((tier) => (
                <div key={tier.label} className="bg-muted rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">{tier.label}</p>
                  <p className="font-heading text-sm font-semibold text-foreground">
                    {formatCurrency(numericValue * (tier.weight / totalWeight))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrizePoolSelector;
