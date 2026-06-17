// Shared Discord embed builder used by discord-send-message.
// Keep template names stable — DB triggers (dispatch_discord_message) pass these strings.

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  timestamp?: string;
  author?: { name: string; icon_url?: string; url?: string };
}

export interface DiscordPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// FGN brand colors (BRAND.md pillar locks)
export const FGN_COLOR = {
  cyan: 0x22d3ee,     // Play
  violet: 0x8b5cf6,   // Perf
  amber: 0xf59e0b,    // Path
  azure: 0x3b82f6,    // Fiber
  ink: 0x0a0e1a,
} as const;

const FOOTER = { text: "FGN — fgn.gg" };

function ts(date?: string | null): string | undefined {
  if (!date) return undefined;
  const t = Math.floor(new Date(date).getTime() / 1000);
  if (!Number.isFinite(t)) return undefined;
  return `<t:${t}:F>`;
}

function base(color: number, title: string, description?: string): DiscordEmbed {
  return {
    title,
    description: description?.slice(0, 4000),
    color,
    footer: FOOTER,
    timestamp: new Date().toISOString(),
  };
}

export type TemplateName =
  | "tournament_published"
  | "tournament_completed"
  | "tenant_event_published"
  | "challenge_published"
  | "quest_published"
  | "prize_redeemed"
  | "achievement_earned";

export function buildEmbed(template: TemplateName, d: Record<string, any>): DiscordPayload {
  switch (template) {
    case "tournament_published": {
      const e = base(FGN_COLOR.cyan, `🏆 New Tournament: ${d.name ?? "Tournament"}`, d.description);
      const fields: DiscordEmbedField[] = [];
      if (d.game) fields.push({ name: "Game", value: String(d.game), inline: true });
      if (d.format) fields.push({ name: "Format", value: String(d.format), inline: true });
      const when = ts(d.start_date);
      if (when) fields.push({ name: "Starts", value: when });
      if (d.url) fields.push({ name: "Register", value: d.url });
      e.fields = fields;
      if (d.image_url) e.image = { url: d.image_url };
      return { embeds: [e] };
    }
    case "tournament_completed": {
      const e = base(FGN_COLOR.amber, `🥇 ${d.name ?? "Tournament"} — Results`, "Congratulations to our champions!");
      e.fields = [
        d.first_name && { name: "🥇 1st", value: String(d.first_name), inline: true },
        d.second_name && { name: "🥈 2nd", value: String(d.second_name), inline: true },
        d.third_name && { name: "🥉 3rd", value: String(d.third_name), inline: true },
      ].filter(Boolean) as DiscordEmbedField[];
      if (d.url) e.url = d.url;
      return { embeds: [e] };
    }
    case "tenant_event_published": {
      const e = base(FGN_COLOR.violet, `📅 ${d.name ?? "Event"}`, d.description);
      const fields: DiscordEmbedField[] = [];
      const when = ts(d.start_date);
      if (when) fields.push({ name: "When", value: when });
      if (d.url) fields.push({ name: "Details", value: d.url });
      e.fields = fields;
      if (d.image_url) e.image = { url: d.image_url };
      return { embeds: [e] };
    }
    case "challenge_published": {
      const e = base(FGN_COLOR.cyan, `🎯 New Challenge: ${d.name ?? "Challenge"}`, d.description);
      const fields: DiscordEmbedField[] = [];
      if (d.game) fields.push({ name: "Game", value: String(d.game), inline: true });
      if (d.points_reward) fields.push({ name: "Reward", value: `${d.points_reward} pts`, inline: true });
      if (d.url) fields.push({ name: "View", value: d.url });
      e.fields = fields;
      if (d.image_url) e.image = { url: d.image_url };
      return { embeds: [e] };
    }
    case "quest_published": {
      const e = base(FGN_COLOR.amber, `📜 New Quest: ${d.name ?? "Quest"}`, d.description);
      const fields: DiscordEmbedField[] = [];
      if (d.xp_reward) fields.push({ name: "XP", value: String(d.xp_reward), inline: true });
      if (d.points_reward) fields.push({ name: "Points", value: String(d.points_reward), inline: true });
      if (d.url) fields.push({ name: "View", value: d.url });
      e.fields = fields;
      return { embeds: [e] };
    }
    case "prize_redeemed": {
      const e = base(FGN_COLOR.violet, `🎁 Prize Redeemed`, `${d.player_name ?? "A player"} claimed **${d.prize_name ?? "a prize"}**`);
      return { embeds: [e] };
    }
    case "achievement_earned": {
      const e = base(FGN_COLOR.azure, `🏅 Achievement Unlocked`, `${d.player_name ?? "A player"} earned **${d.achievement_name ?? "an achievement"}** (${d.tier ?? ""})`.trim());
      return { embeds: [e] };
    }
  }
  return { embeds: [] };
}
