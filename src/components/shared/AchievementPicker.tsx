import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trophy } from "lucide-react";

interface AchievementPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const tierColors: Record<string, string> = {
  bronze: "text-amber-600",
  silver: "text-muted-foreground",
  gold: "text-yellow-500",
  platinum: "text-cyan-400",
  special: "text-purple-400",
};

const AchievementPicker = ({ value, onChange, label = "Achievement / Badge" }: AchievementPickerProps) => {
  const selectedValue = value && value !== "" ? value : "none";

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievement-definitions-picker", selectedValue],
    queryFn: async () => {
      let query = supabase
        .from("achievement_definitions")
        .select("id, name, tier, icon, category, is_active")
        .order("tier")
        .order("name");

      query = selectedValue !== "none"
        ? query.or(`is_active.eq.true,id.eq.${selectedValue}`)
        : query.eq("is_active", true);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-2">
      <Label className="font-heading text-sm flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-primary" />
        {label}
      </Label>
      <Select value={selectedValue} onValueChange={onChange}>
        <SelectTrigger className="bg-card border-border font-body">
          <SelectValue placeholder={isLoading ? "Loading..." : "None (no badge)"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None (no badge)</SelectItem>
          {achievements.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <span className="flex items-center gap-2">
                <span className={tierColors[a.tier] || "text-foreground"}>
                  {a.icon || "🏆"}
                </span>
                <span className="capitalize text-xs text-muted-foreground">[{a.tier}]</span>
                {a.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Auto-awarded to players on completion</p>
    </div>
  );
};

export default AchievementPicker;
