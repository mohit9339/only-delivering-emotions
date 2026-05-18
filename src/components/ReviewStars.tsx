import { Star } from "lucide-react";

/** Read-only star display (rounded to nearest half is overkill — round to 1 decimal). */
export function ReviewStars({
  value,
  size = 16,
  showValue = false,
  className = "",
}: {
  value: number | null | undefined;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  if (value == null) {
    return (
      <span className={`text-xs text-muted-foreground ${className}`}>No reviews yet</span>
    );
  }
  const v = Math.max(0, Math.min(5, Number(value)));
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            width={size}
            height={size}
            className={n <= Math.round(v) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
          />
        ))}
      </span>
      {showValue && (
        <span className="text-xs font-medium text-muted-foreground">{v.toFixed(1)}</span>
      )}
    </span>
  );
}

/** Interactive picker — controlled. */
export function ReviewStarsInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="rounded-md p-1 transition-transform hover:scale-110"
        >
          <Star
            width={size}
            height={size}
            className={
              n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </div>
  );
}
