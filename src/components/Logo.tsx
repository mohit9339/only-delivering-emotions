import logoSrc from "@/assets/only-logo.png";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 40 }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="ONLY"
      width={size}
      height={size}
      className={`rounded-xl shadow-soft ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
