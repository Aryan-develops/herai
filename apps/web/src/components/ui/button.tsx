import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-soft hover:shadow-lift hover:brightness-105",
        outline: "border border-neutral-300 bg-white text-ink-800 hover:border-brand-300 hover:bg-brand-50",
        ghost: "text-ink-700 hover:bg-brand-50 hover:text-brand-700",
        soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 px-3",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
