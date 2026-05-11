import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Plus, X, Check } from "lucide-react";
import {
  SKILL_GROUPS,
  ALL_SKILL_TAGS,
  getSkillLabel,
  isValidSkillTag,
} from "@/lib/skillTaxonomy";

interface SkillTagsPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  helperText?: string;
}

const SkillTagsPicker = ({
  value,
  onChange,
  label = "Skills Verified",
  helperText = "Competencies players demonstrate by completing this challenge. Forwarded to FGN Academy.",
}: SkillTagsPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customTag, setCustomTag] = useState("");

  const selected = new Set(value);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SKILL_GROUPS;
    return SKILL_GROUPS
      .map((g) => ({
        ...g,
        tags: g.tags.filter(
          (t) => t.tag.includes(q) || t.label.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.tags.length > 0);
  }, [search]);

  const toggle = (tag: string) => {
    if (selected.has(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const addCustom = () => {
    const t = customTag.trim().toLowerCase();
    if (!t) return;
    if (!/^[a-z0-9_-]+:[a-z0-9_-]+$/.test(t)) return;
    if (!selected.has(t)) onChange([...value, t]);
    setCustomTag("");
  };

  return (
    <div className="space-y-2">
      <Label className="font-heading text-sm flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {label}
      </Label>

      <div className="flex flex-wrap gap-1.5 min-h-[2rem] p-2 rounded-md border border-border bg-card">
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground self-center">No skills selected</span>
        )}
        {value.map((tag) => {
          const known = isValidSkillTag(tag);
          return (
            <Badge
              key={tag}
              variant={known ? "secondary" : "outline"}
              className="gap-1 font-mono text-xs"
              title={tag}
            >
              {getSkillLabel(tag)}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add skill
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="start">
            <div className="p-2 border-b border-border">
              <Input
                placeholder="Search skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
            </div>
            <ScrollArea className="h-[320px]">
              <div className="p-2 space-y-3">
                {filteredGroups.map((g) => (
                  <div key={g.namespace}>
                    <div className="text-xs font-display uppercase text-muted-foreground mb-1 px-1">
                      {g.label}
                    </div>
                    <div className="space-y-0.5">
                      {g.tags.map((t) => {
                        const isSel = selected.has(t.tag);
                        return (
                          <button
                            type="button"
                            key={t.tag}
                            onClick={() => toggle(t.tag)}
                            className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent flex items-center gap-2"
                          >
                            <Check
                              className={`h-3.5 w-3.5 ${isSel ? "opacity-100 text-primary" : "opacity-0"}`}
                            />
                            <span className="flex-1">{t.label}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{t.tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
                )}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Custom tag</Label>
              <div className="flex gap-1">
                <Input
                  placeholder="namespace:slug"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  className="h-7 text-xs font-mono"
                />
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={addCustom}>
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground self-center">
          {value.length} of {ALL_SKILL_TAGS.length} curated
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
};

export default SkillTagsPicker;
