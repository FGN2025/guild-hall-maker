import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Structured rejection reasons shared by player UI (TaskChecklist) and reviewer UI. */
export const REJECTION_REASONS: Record<string, { label: string; explanation: string }> = {
  steam_achievement_locked: {
    label: "Steam: achievement not unlocked",
    explanation: "The required Steam achievement isn't unlocked on the linked account.",
  },
  steam_insufficient_playtime: {
    label: "Steam: insufficient playtime",
    explanation: "Recorded Steam playtime is below the required minutes for this task.",
  },
  steam_profile_private: {
    label: "Steam: profile private",
    explanation: "Steam profile or game details are private — auto-verification was blocked.",
  },
  steam_not_linked: {
    label: "Steam: account not linked",
    explanation: "No Steam account is linked to this player profile.",
  },
  steam_api_error: {
    label: "Steam: API unavailable",
    explanation: "Steam couldn't be reached at review time. Player should re-run the check later.",
  },
  evidence_unclear: {
    label: "Evidence unclear / unreadable",
    explanation: "Submitted evidence didn't clearly demonstrate the task requirement.",
  },
  evidence_off_topic: {
    label: "Evidence doesn't match task",
    explanation: "Submitted evidence is for a different task or game.",
  },
  policy_violation: {
    label: "Policy / rules violation",
    explanation: "Submission violates competition rules or community guidelines.",
  },
  other: {
    label: "Other (use note)",
    explanation: "See reviewer note for details.",
  },
};

/** Encode a structured reason + free-text note into a single `reviewer_notes` string. */
export function encodeReviewerNotes(code: string | null, note: string): string {
  const trimmed = note.trim();
  if (!code || code === "none") return trimmed;
  const meta = REJECTION_REASONS[code];
  if (!meta) return trimmed;
  const base = `[${code}] ${meta.explanation}`;
  return trimmed ? `${base} — ${trimmed}` : base;
}

interface Props {
  value: string | null;
  onChange: (code: string | null) => void;
  disabled?: boolean;
}

const RejectionReasonSelect = ({ value, onChange, disabled }: Props) => (
  <Select
    value={value ?? "none"}
    onValueChange={(v) => onChange(v === "none" ? null : v)}
    disabled={disabled}
  >
    <SelectTrigger className="h-8 text-xs">
      <SelectValue placeholder="Why rejected? (optional)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">— No structured reason —</SelectItem>
      {Object.entries(REJECTION_REASONS).map(([code, { label }]) => (
        <SelectItem key={code} value={code}>
          {label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default RejectionReasonSelect;
