/**
 * FGN Trade Skills Agent — Trade area catalogue.
 * Extends the original CDL/trucking domain map to every pilot trade area.
 */

import { CDL_DOMAINS, ATS_GAME_ID, type CDLDomainConfig } from "@/lib/cdlDomainMaps";

export type TradeDomainConfig = CDLDomainConfig;

export interface TradeGame {
  id: string;
  name: string;
  /** true when an active knowledge notebook is connected for this game */
  hasNotebook: boolean;
}

export interface TradeArea {
  id: string;
  label: string;
  /** Required prefix for generated challenge titles */
  titlePrefix: string;
  games: TradeGame[];
  domains: Record<string, TradeDomainConfig>;
}

const AVIATION_DOMAINS: Record<string, TradeDomainConfig> = {
  "Preflight inspection and airworthiness": {
    label: "Preflight inspection and airworthiness",
    cfrReference: "14 CFR 91.7, 91.103",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 18,
    defaultMinutes: 60,
    alignment: "STRONG",
    coverImageTheme:
      "pilot performing walkaround preflight inspection of a light aircraft on a sunrise ramp",
    taskCount: 5,
  },
  "Radio communications and ATC procedures": {
    label: "Radio communications and ATC procedures",
    cfrReference: "14 CFR 91.123, AIM Chapter 4",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 12,
    defaultMinutes: 50,
    alignment: "STRONG",
    coverImageTheme:
      "cockpit view with headset and radio stack, control tower visible through windscreen at dusk",
    taskCount: 4,
  },
  "Navigation and flight planning": {
    label: "Navigation and flight planning",
    cfrReference: "14 CFR 91.103",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 16,
    defaultMinutes: 70,
    alignment: "STRONG",
    coverImageTheme:
      "sectional chart, plotter and tablet flight plan spread on a hangar table, aircraft in background",
    taskCount: 5,
  },
  "Weather assessment and decision making": {
    label: "Weather assessment and decision making",
    cfrReference: "14 CFR 91.155, AC 00-6",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 10,
    defaultMinutes: 45,
    alignment: "PARTIAL",
    coverImageTheme:
      "aircraft flying near towering cumulus clouds, dramatic weather front on the horizon",
    taskCount: 4,
  },
  "Takeoff, landing and traffic pattern operations": {
    label: "Takeoff, landing and traffic pattern operations",
    cfrReference: "14 CFR 91.126, AIM 4-3",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 12,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "small aircraft on final approach over runway threshold markings, golden hour lighting",
    taskCount: 4,
  },
  "Emergency procedures and abnormal operations": {
    label: "Emergency procedures and abnormal operations",
    cfrReference: "14 CFR 91.3, 91.7",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 14,
    defaultMinutes: 55,
    alignment: "PARTIAL",
    coverImageTheme:
      "pilot running an emergency checklist in the cockpit, warning annunciator lit",
    taskCount: 4,
  },
};

const CONSTRUCTION_DOMAINS: Record<string, TradeDomainConfig> = {
  "Jobsite safety and fall protection": {
    label: "Jobsite safety and fall protection",
    cfrReference: "29 CFR 1926 Subpart M",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 16,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "construction worker in harness on steel framing above a jobsite, safety signage visible",
    taskCount: 5,
  },
  "Heavy equipment operation and rigging": {
    label: "Heavy equipment operation and rigging",
    cfrReference: "29 CFR 1926 Subpart CC",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 14,
    defaultMinutes: 60,
    alignment: "STRONG",
    coverImageTheme:
      "mobile crane lifting a precast panel on an active construction site, dramatic sky",
    taskCount: 4,
  },
  "Site preparation, excavation and grading": {
    label: "Site preparation, excavation and grading",
    cfrReference: "29 CFR 1926 Subpart P",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 12,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "excavator cutting a trench with shoring in place, surveyor stakes in the foreground",
    taskCount: 4,
  },
  "Framing, drywall and finish carpentry": {
    label: "Framing, drywall and finish carpentry",
    cfrReference: "IRC Chapter 6 (framing), industry standard",
    referenceType: "industry_standard",
    challengeType: "one_time",
    defaultPoints: 15,
    defaultMinutes: 65,
    alignment: "STRONG",
    coverImageTheme:
      "interior of a house under renovation, new stud framing and drywall sheets, work light glow",
    taskCount: 5,
  },
  "Plumbing rough-in and fixture installation": {
    label: "Plumbing rough-in and fixture installation",
    cfrReference: "Uniform Plumbing Code, industry standard",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 12,
    defaultMinutes: 55,
    alignment: "PARTIAL",
    coverImageTheme:
      "plumbing rough-in with copper and PEX lines in an open wall cavity, tools on the floor",
    taskCount: 4,
  },
  "Estimating, materials and project sequencing": {
    label: "Estimating, materials and project sequencing",
    cfrReference: "Industry standard (CSI MasterFormat)",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 9,
    defaultMinutes: 40,
    alignment: "PARTIAL",
    coverImageTheme:
      "blueprints, takeoff sheets and a calculator on a jobsite trailer desk, hard hat beside them",
    taskCount: 4,
  },
};

const ELECTRICAL_DOMAINS: Record<string, TradeDomainConfig> = {
  "Electrical safety and lockout/tagout": {
    label: "Electrical safety and lockout/tagout",
    cfrReference: "29 CFR 1910.147, NFPA 70E",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 16,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "electrician applying a lockout device to an industrial disconnect, arc-flash PPE visible",
    taskCount: 5,
  },
  "Branch circuit wiring and rough-in": {
    label: "Branch circuit wiring and rough-in",
    cfrReference: "NEC Article 210",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 13,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "open wall cavity with romex runs and device boxes installed, work light glow",
    taskCount: 4,
  },
  "Service panels, grounding and bonding": {
    label: "Service panels, grounding and bonding",
    cfrReference: "NEC Articles 250 and 408",
    referenceType: "industry_standard",
    challengeType: "one_time",
    defaultPoints: 18,
    defaultMinutes: 65,
    alignment: "STRONG",
    coverImageTheme:
      "neatly terminated residential load center with grounding bus exposed, close-up detail",
    taskCount: 5,
  },
  "Troubleshooting and test instruments": {
    label: "Troubleshooting and test instruments",
    cfrReference: "NFPA 70E Article 110, industry standard",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 12,
    defaultMinutes: 50,
    alignment: "STRONG",
    coverImageTheme:
      "electrician taking a reading with a multimeter at an outlet, focused hands and meter display",
    taskCount: 4,
  },
  "Lighting systems and controls": {
    label: "Lighting systems and controls",
    cfrReference: "NEC Article 404",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 9,
    defaultMinutes: 40,
    alignment: "PARTIAL",
    coverImageTheme:
      "installing recessed lighting and smart switches in a finished room, warm light spill",
    taskCount: 4,
  },
  "Motors, appliances and dedicated circuits": {
    label: "Motors, appliances and dedicated circuits",
    cfrReference: "NEC Articles 422 and 430",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 11,
    defaultMinutes: 50,
    alignment: "PARTIAL",
    coverImageTheme:
      "industrial motor connection with conduit and disconnect switch, workshop lighting",
    taskCount: 4,
  },
};

const AGRICULTURE_DOMAINS: Record<string, TradeDomainConfig> = {
  "Tractor and implement safety": {
    label: "Tractor and implement safety",
    cfrReference: "29 CFR 1928.51, ASABE S318",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 15,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "farmer checking a tractor ROPS and PTO shield before field work, morning light over fields",
    taskCount: 5,
  },
  "Field operations — tillage, planting and harvest": {
    label: "Field operations — tillage, planting and harvest",
    cfrReference: "Industry standard (agronomy best practice)",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 12,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "combine harvester cutting a wheat field at golden hour, dust trailing behind",
    taskCount: 4,
  },
  "Precision agriculture and GPS guidance": {
    label: "Precision agriculture and GPS guidance",
    cfrReference: "Industry standard (ISOBUS / precision ag)",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 11,
    defaultMinutes: 50,
    alignment: "STRONG",
    coverImageTheme:
      "tractor cab display showing guidance lines and yield map overlay, field visible ahead",
    taskCount: 4,
  },
  "Equipment maintenance and diagnostics": {
    label: "Equipment maintenance and diagnostics",
    cfrReference: "Industry standard (OEM service practice)",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 12,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "technician servicing a tractor engine bay in a farm shop, tools and parts laid out",
    taskCount: 4,
  },
  "Heavy equipment site and haulage operations": {
    label: "Heavy equipment site and haulage operations",
    cfrReference: "29 CFR 1926 Subpart O",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 13,
    defaultMinutes: 60,
    alignment: "STRONG",
    coverImageTheme:
      "articulated hauler and dozer working a muddy earthworks site under overcast sky",
    taskCount: 4,
  },
  "Livestock, crops and resource stewardship": {
    label: "Livestock, crops and resource stewardship",
    cfrReference: "Industry standard (NRCS conservation practice)",
    referenceType: "industry_standard",
    challengeType: "monthly",
    defaultPoints: 8,
    defaultMinutes: 40,
    alignment: "PARTIAL",
    coverImageTheme:
      "mixed farm landscape with pasture, irrigation and crop rows at sunrise",
    taskCount: 4,
  },
};

export const TRADE_AREAS: TradeArea[] = [
  {
    id: "transportation",
    label: "Transportation & trucking (CDL)",
    titlePrefix: "ATS Skills:",
    games: [{ id: ATS_GAME_ID, name: "American Truck Simulator", hasNotebook: true }],
    domains: CDL_DOMAINS,
  },
  {
    id: "aviation",
    label: "Aviation & flight",
    titlePrefix: "Aviation Skills:",
    games: [
      { id: "7a78dd57-9061-47d3-9ee7-436a48aba2f6", name: "Microsoft Flight Simulator 2024", hasNotebook: false },
    ],
    domains: AVIATION_DOMAINS,
  },
  {
    id: "construction",
    label: "Construction & home repair",
    titlePrefix: "Construction Skills:",
    games: [
      { id: "4a43cc04-2745-4938-8bbe-8ffe1397af37", name: "Construction Simulator", hasNotebook: true },
      { id: "3913b35e-534e-4e8a-b5d6-bb8f3c7d84bd", name: "House Flipper 2", hasNotebook: false },
      { id: "66658f49-9e0d-43c6-bc0a-185d61a49a2b", name: "House Flipper", hasNotebook: false },
    ],
    domains: CONSTRUCTION_DOMAINS,
  },
  {
    id: "electrical",
    label: "Electrical",
    titlePrefix: "Electrical Skills:",
    games: [
      { id: "e84b53cd-98d7-4b8c-ad43-ca8e313c4c04", name: "Electrician Simulator", hasNotebook: false },
    ],
    domains: ELECTRICAL_DOMAINS,
  },
  {
    id: "agriculture",
    label: "Agriculture & heavy equipment",
    titlePrefix: "Agriculture Skills:",
    games: [
      { id: "ecd6b3ca-06d2-4139-846e-a5bb02dc5ceb", name: "Farm Simulator 2025", hasNotebook: true },
      { id: "c0e087e2-e309-40a1-8176-0c3d676ad145", name: "Roadcraft", hasNotebook: true },
    ],
    domains: AGRICULTURE_DOMAINS,
  },
];

export function getTradeArea(id: string): TradeArea | undefined {
  return TRADE_AREAS.find((a) => a.id === id);
}
