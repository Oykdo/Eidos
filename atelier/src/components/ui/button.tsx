import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-sm font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-or active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        or: "bg-or text-or-fg hover:opacity-90",
        discret:
          "bg-transparent text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)] hover:shadow-[0_0_0_1px_rgb(198_203_209_/_0.4)]",
        danger:
          "bg-transparent text-fer shadow-[0_0_0_1px_rgb(168_51_42_/_0.4)] hover:bg-fer/10",
        ghost: "bg-transparent text-sourd hover:text-encre",
        etain: "bg-etain text-encre hover:opacity-90",
      },
      size: {
        default: "h-11 w-full rounded-sm px-4",
        sm: "h-9 rounded-sm px-3 text-xs",
        chip: "h-8 rounded-sm px-2.5 text-[11px] tracking-wide",
        icon: "size-11 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "or",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
