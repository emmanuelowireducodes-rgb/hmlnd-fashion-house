import { Slot } from "@radix-ui/react-slot";
import type { CSSProperties, ReactElement } from "react";
import { cn } from "@/lib/utils";

/** Preserves the child's native link semantics and typed router destination. */
export function EditorialCta({
  children,
  tone = "ink",
  className,
  style,
}: {
  children: ReactElement;
  tone?: "ink" | "light";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Slot className={cn("editorial-cta", className)} data-tone={tone} style={style}>
      {children}
    </Slot>
  );
}
