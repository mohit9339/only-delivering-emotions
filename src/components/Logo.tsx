interface LogoProps {
  className?: string;
  variant?: "light" | "dark";
}

export function Logo({ className = "", variant = "dark" }: LogoProps) {
  const fill = variant === "light" ? "white" : "currentColor";
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden>
        <path
          d="M24 4 L42 14 V34 L24 44 L6 34 V14 Z"
          fill={fill}
          opacity="0.95"
        />
        <path
          d="M24 4 L42 14 L24 24 L6 14 Z"
          fill={fill}
          opacity="0.7"
        />
        <path
          d="M20 9 L28 9 L28 19 L24 17 L20 19 Z"
          fill={variant === "light" ? "var(--primary)" : "white"}
        />
      </svg>
      <div className="leading-none">
        <div className={`font-[Sora] text-xl font-extrabold tracking-tight ${variant === "light" ? "text-white" : "text-foreground"}`}>
          ONLY
        </div>
        <div className={`text-[9px] uppercase tracking-[0.2em] ${variant === "light" ? "text-white/80" : "text-muted-foreground"}`}>
          Delivering Emotions
        </div>
      </div>
    </div>
  );
}
