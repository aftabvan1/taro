"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, size = "md" }: LogoProps) => {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  return (
    <Link href="/" className={cn("flex items-center gap-2 font-bold tracking-tight", sizes[size], className)}>
      <div className={cn("relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-light to-brand-dark", iconSizes[size])}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Straw */}
          <line x1="15" y1="2" x2="13" y2="9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          {/* Cup body */}
          <path
            d="M6 9h12l-1.5 12a2 2 0 0 1-2 1.5h-5a2 2 0 0 1-2-1.5L6 9z"
            fill="rgba(255,255,255,0.2)"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Lid */}
          <rect x="5" y="8" width="14" height="2" rx="1" fill="white" opacity="0.7" />
          {/* Boba pearls */}
          <circle cx="10" cy="17" r="1.3" fill="white" opacity="0.8" />
          <circle cx="14" cy="18" r="1.3" fill="white" opacity="0.8" />
          <circle cx="12" cy="15" r="1.3" fill="white" opacity="0.6" />
        </svg>
      </div>
      <span>
        taro<span className="text-accent">.</span>
      </span>
    </Link>
  );
};
