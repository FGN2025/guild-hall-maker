import { Plane, Truck, Wrench, Zap, Hammer, ShieldCheck, Award, type LucideIcon } from "lucide-react";

const MERIT_ICON_MAP: Record<string, LucideIcon> = {
  Plane,
  Truck,
  Wrench,
  Zap,
  Hammer,
  ShieldCheck,
  Award,
};

export function getMeritIcon(name: string | null | undefined): LucideIcon {
  return (name && MERIT_ICON_MAP[name]) || Award;
}
