/**
 * Statistics Card Component
 * Glassmorphism card component for displaying warehouse statistics
 * Supports light/dark mode with colored variants (sky, emerald, amber, rose)
 */

import React from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Color variant types for statistics cards
 */
type CardVariant =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "orange"
  | "teal";

/**
 * Badge data structure
 */
interface BadgeData {
  label: string;
  value: string | number;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Expandable section data (e.g. per-category value breakdown)
 */
interface ExpandableSection {
  title: string;
  items: { label: string; value: string | number }[];
}

/**
 * Props for StatisticsCard component
 */
interface StatisticsCardProps {
  /**
   * Card title
   */
  title: string;
  /**
   * Main value to display
   */
  value: string | number;
  /**
   * Optional description text
   */
  description?: string;
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;
  /**
   * Color variant for the card
   */
  variant?: CardVariant;
  /**
   * Array of badges to display below the value
   */
  badges?: BadgeData[];
  /**
   * Optional collapsible sections displayed inside the card (e.g. category breakdown)
   */
  expandableSections?: ExpandableSection[];
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * Color configuration for each variant
 */
const variantConfig: Record<
  CardVariant,
  {
    border: string;
    gradient: string;
    shadow: string;
    hoverBorder: string;
  }
> = {
  sky: {
    border: "border-sky-400/30",
    gradient: "bg-gradient-to-br from-sky-500/25 via-sky-500/10 to-sky-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(2,132,199,0.35)] dark:shadow-[0_30px_80px_rgba(2,132,199,0.25)]",
    hoverBorder: "hover:border-sky-300/50",
  },
  emerald: {
    border: "border-emerald-400/30",
    gradient:
      "bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-emerald-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(16,185,129,0.35)] dark:shadow-[0_30px_80px_rgba(16,185,129,0.25)]",
    hoverBorder: "hover:border-emerald-300/50",
  },
  amber: {
    border: "border-amber-400/30",
    gradient:
      "bg-gradient-to-br from-amber-500/30 via-amber-500/15 to-amber-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(245,158,11,0.25)] dark:shadow-[0_30px_80px_rgba(245,158,11,0.2)]",
    hoverBorder: "hover:border-amber-300/60",
  },
  rose: {
    border: "border-rose-400/30",
    gradient:
      "bg-gradient-to-br from-rose-500/25 via-rose-500/10 to-rose-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(225,29,72,0.35)] dark:shadow-[0_30px_80px_rgba(225,29,72,0.25)]",
    hoverBorder: "hover:border-rose-300/50",
  },
  violet: {
    border: "border-violet-400/30",
    gradient:
      "bg-gradient-to-br from-violet-500/25 via-violet-500/10 to-violet-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(139,92,246,0.35)] dark:shadow-[0_30px_80px_rgba(139,92,246,0.25)]",
    hoverBorder: "hover:border-violet-300/50",
  },
  blue: {
    border: "border-blue-400/30",
    gradient:
      "bg-gradient-to-br from-blue-500/25 via-blue-500/10 to-blue-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(59,130,246,0.35)] dark:shadow-[0_30px_80px_rgba(59,130,246,0.25)]",
    hoverBorder: "hover:border-blue-300/50",
  },
  orange: {
    border: "border-orange-400/30",
    gradient:
      "bg-gradient-to-br from-orange-500/25 via-orange-500/10 to-orange-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(249,115,22,0.35)] dark:shadow-[0_30px_80px_rgba(249,115,22,0.25)]",
    hoverBorder: "hover:border-orange-300/50",
  },
  teal: {
    border: "border-teal-400/30",
    gradient:
      "bg-gradient-to-br from-teal-500/25 via-teal-500/10 to-teal-500/5",
    shadow:
      "shadow-[0_30px_80px_rgba(20,184,166,0.35)] dark:shadow-[0_30px_80px_rgba(20,184,166,0.25)]",
    hoverBorder: "hover:border-teal-300/50",
  },
};

/**
 * StatisticsCard component
 * Displays a glassmorphism card with statistics, icon, and badges
 */
export function StatisticsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "sky",
  badges = [],
  expandableSections = [],
  className,
}: StatisticsCardProps) {
  const config = variantConfig[variant];

  return (
    <article
      className={cn(
        "group rounded-[28px] border min-h-[210px] h-full flex flex-col p-4 sm:p-6 backdrop-blur-sm transition min-w-0 overflow-visible",
        config.border,
        config.gradient,
        config.shadow,
        config.hoverBorder,
        className,
      )}
    >
      <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full overflow-visible">
        {/* Title and icon inline so badges get full width below */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs uppercase tracking-[0.45em] text-gray-700 dark:text-white/60 min-w-0">
            {title}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300/30 bg-gray-100/50 shadow-inner shadow-primary/30 backdrop-blur dark:border-white/15 dark:bg-white/10">
            <Icon className="h-5 w-5 text-gray-900 dark:text-white" />
          </div>
        </div>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-white/70">
            {description}
          </p>
        )}
        {badges.length > 0 && (
          <div className="mt-3 flex w-full min-w-0 flex-wrap gap-2 overflow-visible">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || "outline"}
                className="text-xs border-gray-300/50 bg-gray-100/80 text-gray-800 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-white/5 dark:text-white/80"
              >
                <span className="font-medium">{badge.label}:</span>{" "}
                <span className="ml-1">{badge.value}</span>
              </Badge>
            ))}
          </div>
        )}
        {expandableSections.length > 0 && (
          <div className="mt-3 w-full min-w-0 space-y-2">
            {expandableSections.map((section, sectionIndex) => (
              <details
                key={sectionIndex}
                className="group w-full rounded-2xl border border-gray-300/40 bg-gray-100/70 dark:border-white/10 dark:bg-white/5"
              >
                <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-white/80 transition hover:bg-gray-200/70 dark:hover:bg-white/10 [&::-webkit-details-marker]:hidden">
                  <span>{section.title}</span>
                  <span className="text-gray-500 dark:text-white/50 transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="flex max-h-48 w-full flex-col gap-1 overflow-y-auto border-t border-gray-200/60 px-3 py-2 dark:border-white/10">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-white/80"
                    >
                      <span className="truncate font-medium">{item.label}</span>
                      <span className="shrink-0">{item.value}</span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
