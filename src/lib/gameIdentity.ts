import bannerConstruction from "@/assets/games/construction-simulator.jpg";
import bannerFarm from "@/assets/games/farm-simulator-2025.jpg";
import bannerAts from "@/assets/games/american-truck-simulator.jpg";
import bannerMsfs from "@/assets/games/msfs-2024.jpg";
import bannerHouseFlipper from "@/assets/games/house-flipper.jpg";
import bannerHouseFlipper2 from "@/assets/games/house-flipper-2.jpg";
import bannerRoadcraft from "@/assets/games/roadcraft.jpg";
import bannerDataCenter from "@/assets/games/data-center.jpg";
import bannerFarmerReplaced from "@/assets/games/the-farmer-was-replaced.jpg";
import bannerDefault from "@/assets/games/default.jpg";

export interface GameIdentity {
  banner: string;
  /** HSL triplet used as the --game-accent CSS variable. */
  accent: string;
  tagline: string;
}

/** FGN pillar locks: Play = cyan, Perf = violet, Path = amber, Fiber = azure. */
const CYAN = "180 100% 42%";
const VIOLET = "262 83% 58%";
const AMBER = "38 95% 55%";
const AZURE = "212 95% 58%";

const IDENTITIES: Record<string, GameIdentity> = {
  "msfs-2024": {
    banner: bannerMsfs,
    accent: CYAN,
    tagline: "Take off, navigate and log your hours in the virtual sky.",
  },
  "american-truck-simulator": {
    banner: bannerAts,
    accent: CYAN,
    tagline: "Run the long haul. Deliver clean, on time, every time.",
  },
  "construction-simulator": {
    banner: bannerConstruction,
    accent: VIOLET,
    tagline: "Operate the heavy iron and build the job site from the ground up.",
  },
  "house-flipper": {
    banner: bannerHouseFlipper,
    accent: VIOLET,
    tagline: "Learn the trades room by room — repair, paint, renovate.",
  },
  "house-flipper-2": {
    banner: bannerHouseFlipper2,
    accent: VIOLET,
    tagline: "Bigger builds, sharper craft. Master the full renovation.",
  },
  roadcraft: {
    banner: bannerRoadcraft,
    accent: AMBER,
    tagline: "Move earth, rebuild roads and keep the convoy rolling.",
  },
  "farm-simulator-2025": {
    banner: bannerFarm,
    accent: AMBER,
    tagline: "Work the season — plant, tend and bring in the harvest.",
  },
  "the-farmer-was-replaced": {
    banner: bannerFarmerReplaced,
    accent: AMBER,
    tagline: "Automate the farm with code and let the robots do the work.",
  },
  "data-center": {
    banner: bannerDataCenter,
    accent: AZURE,
    tagline: "Rack, cable and keep the network alive under pressure.",
  },
};

const CATEGORY_ACCENT: Record<string, string> = {
  Simulation: VIOLET,
  Strategy: AZURE,
  Racing: AMBER,
  Shooter: CYAN,
};

export const getGameIdentity = (slug?: string | null, category?: string | null): GameIdentity => {
  if (slug && IDENTITIES[slug]) return IDENTITIES[slug];
  return {
    banner: bannerDefault,
    accent: (category && CATEGORY_ACCENT[category]) || CYAN,
    tagline: "Complete challenges, earn points and build real skills.",
  };
};
