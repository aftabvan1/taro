"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-foreground hover:brightness-110 glow-brand-sm",
        secondary:
          "backdrop-blur-xl bg-white/5 border border-white/10 text-foreground hover:bg-white/[0.08] hover:border-white/15",
        ghost:
          "text-muted hover:text-foreground hover:bg-white/5",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-5 text-sm rounded-lg",
        lg: "h-12 px-7 text-base rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export const Button = ({
  children,
  className,
  variant,
  size,
  href,
  onClick,
}: ButtonProps) => {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
};
