import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[hsl(20,14%,12%)] text-white hover:bg-[hsl(20,14%,20%)]": variant === "default",
            "bg-[hsl(0,72%,51%)] text-white hover:opacity-90": variant === "destructive",
            "border border-[hsl(30,12%,88%)] bg-white hover:bg-[hsl(30,15%,94%)]": variant === "outline",
            "bg-[hsl(30,15%,94%)] text-[hsl(20,14%,12%)] hover:bg-[hsl(30,12%,88%)]": variant === "secondary",
            "hover:bg-[hsl(30,15%,94%)] hover:text-[hsl(20,14%,12%)]": variant === "ghost",
            "text-[hsl(38,65%,55%)] underline-offset-4 hover:underline": variant === "link",
          },
          {
            "h-9 px-4 py-2": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-11 px-6": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
export { Button };
