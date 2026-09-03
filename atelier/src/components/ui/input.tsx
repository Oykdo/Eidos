import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-sm bg-creux px-3.5 font-mono text-base text-encre",
        "shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]",
        "placeholder:text-sourd/70",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or",
        "disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-sourd",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Label };
