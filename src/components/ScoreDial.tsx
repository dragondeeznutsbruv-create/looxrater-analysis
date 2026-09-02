export function ScoreDial({
  score,
  label,
  size = 176,
}: {
  score: number;
  label?: string;
  size?: number;
}) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="font-display text-brass text-5xl leading-none">{score.toFixed(1)}</span>
        {label && <span className="eyebrow mt-2">{label}</span>}
      </div>
    </div>
  );
}

export function MetricBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-700"
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}
