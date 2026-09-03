import { cn } from "@/lib/utils";

export function Mark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="64" height="64" fill="#12151A" />
      <g fill="none" strokeWidth="4" strokeLinecap="round">
        <circle cx="32" cy="16" r="7.5" stroke="#C9A227" />
        <path d="M24.5 32a7.5 7.5 0 0 0 15 0" stroke="#C6CBD1" />
        <path d="M32 40.5v15M24.5 48h15" stroke="#3A6EA5" />
      </g>
    </svg>
  );
}

const STROKE = ["#6E7581", "#C9A227", "#C6CBD1", "#3A6EA5"];

function Figure({ kind, y }: { kind: number; y: number }) {
  const s = STROKE[kind] ?? STROKE[0];
  if (kind === 0) {
    return <circle cx="8" cy={y} r="1.2" fill={s} />;
  }
  if (kind === 1) {
    return <circle cx="8" cy={y} r="4.2" fill="none" stroke={s} strokeWidth="1.6" />;
  }
  if (kind === 2) {
    return (
      <path
        d={`M4.2 ${y} a4.2 4.2 0 0 0 7.6 0`}
        fill="none"
        stroke={s}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    );
  }
  return (
    <path
      d={`M8 ${y - 4.2}v8.4M3.8 ${y}h8.4`}
      fill="none"
      stroke={s}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  );
}

export function GlypheSvg({
  etages,
  className,
}: {
  etages: [number, number, number];
  className?: string;
}) {
  return (
    <svg viewBox="0 0 16 36" className={cn("inline-block", className)} aria-hidden>
      <Figure kind={etages[0]} y={6} />
      <Figure kind={etages[1]} y={18} />
      <Figure kind={etages[2]} y={30} />
    </svg>
  );
}
