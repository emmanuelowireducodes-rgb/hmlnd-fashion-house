import { cn } from "@/lib/utils";

/**
 * HMLND wordmark — CSS/text approximation of the client logo
 * (very bold, wide, slanted uppercase + #E99801 dot at lower right).
 * Replace the inner markup with the supplied vector (SVG) once provided.
 * variant "dark" = black text (for white surfaces); "light" = white text (for black surfaces).
 */
export function Logo({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  return (
    <span
      className={cn("logo-mark", variant === "light" ? "text-primary-foreground" : "text-foreground", className)}
      aria-hidden="true"
    >
      HMLND<span className="logo-dot" />
    </span>
  );
}
