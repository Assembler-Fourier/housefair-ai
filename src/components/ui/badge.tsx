import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground",
        success:
          "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        warning:
          "border-amber-500/20 bg-amber-500/15 text-amber-800 dark:text-amber-300",
        danger:
          "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
        info:
          "border-cyan-500/20 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
