import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline:
          "text-foreground border border-input",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        interactive: true,
        className: "hover:bg-primary/90 hover:shadow-md",
      },
      {
        variant: "secondary",
        interactive: true,
        className: "hover:bg-secondary/80 hover:shadow-sm",
      },
      {
        variant: "destructive",
        interactive: true,
        className: "hover:bg-destructive/90 hover:shadow-md",
      },
      {
        variant: "outline",
        interactive: true,
        className: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
      },
    ],
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  interactive?: boolean;
}

function Badge({ className, variant, interactive, ...props }: BadgeProps) {
  // Auto-detect if badge is interactive based on presence of click handlers
  const isInteractive = interactive ?? !!(props.onClick || props.onMouseDown || props.onPointerDown);

  return (
    <div
      className={cn(badgeVariants({ variant, interactive: isInteractive }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
