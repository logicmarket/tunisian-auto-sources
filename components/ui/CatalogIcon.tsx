/**
 * File: components/ui/CatalogIcon.tsx
 * Purpose: Resolve taxonomy icon names to Lucide components without leaking
 * component references into the data layer.
 */

import {
  BookOpen,
  Calendar,
  Cog,
  Cpu,
  Fuel,
  Gauge,
  GitBranch,
  GraduationCap,
  Layers,
  Package,
  Paintbrush,
  ScanLine,
  Settings2,
  Stethoscope,
  Thermometer,
  Users,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CatalogIconName } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const ICONS: Record<CatalogIconName, LucideIcon> = {
  layers: Layers,
  stethoscope: Stethoscope,
  zap: Zap,
  cog: Cog,
  gauge: Gauge,
  thermometer: Thermometer,
  fuel: Fuel,
  "git-branch": GitBranch,
  paintbrush: Paintbrush,
  wind: Wind,
  "book-open": BookOpen,
  "scan-line": ScanLine,
  cpu: Cpu,
  "graduation-cap": GraduationCap,
  settings: Settings2,
  users: Users,
  package: Package,
  wrench: Wrench,
  calendar: Calendar,
};

interface CatalogIconProps {
  name: CatalogIconName;
  className?: string;
  strokeWidth?: number;
}

export function CatalogIcon({
  name,
  className,
  strokeWidth = 2,
}: CatalogIconProps) {
  const Icon = ICONS[name] ?? Wrench;
  return (
    <Icon className={cn("h-5 w-5", className)} strokeWidth={strokeWidth} aria-hidden="true" />
  );
}

export { ICONS as catalogIcons };
