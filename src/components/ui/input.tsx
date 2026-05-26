import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-[hsl(30,12%,88%)] bg-white px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-[hsl(20,10%,65%)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(38,65%,55%)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
export { Input };
