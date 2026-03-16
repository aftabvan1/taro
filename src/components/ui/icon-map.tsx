"use client";

import {
  Zap,
  Terminal,
  ShieldCheck,
  Activity,
  Store,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Terminal,
  ShieldCheck,
  Activity,
  Store,
  Lock,
};

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const DynamicIcon = ({ name, className, size = 24 }: DynamicIconProps) => {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon size={size} className={cn(className)} />;
};
