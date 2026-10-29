import { cn } from "@/lib/utils";

/** Client-supplied wordmarks: black for light surfaces, white for dark surfaces. */
export function Logo({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  return (
    <img
      src={variant === "light" ? "/hmlnd-logo-light.png" : "/hmlnd-logo-dark.png"}
      width={4000}
      height={804}
      alt=""
      aria-hidden="true"
      className={cn("inline-block h-auto w-[5em] max-w-full align-middle", className)}
    />
  );
}
