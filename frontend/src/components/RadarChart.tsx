import type { DomainStat } from '../lib/dashboard/aggregate';
import { DOMAIN_LABELS } from '../lib/questions/types';

interface Props {
  stats: DomainStat[];
  size?: number;
}

export function RadarChart({ stats, size = 280 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 32;
  const n = stats.length;

  const ringPcts = [25, 50, 75, 100];
  const points = stats.map((s, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = s.hasEnoughData ? (s.pct / 100) * radius : 0;
    return {
      angle,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      labelX: cx + Math.cos(angle) * (radius + 16),
      labelY: cy + Math.sin(angle) * (radius + 16),
      label: DOMAIN_LABELS[s.domain].split(' ')[0],
      hasData: s.hasEnoughData,
      stat: s,
    };
  });

  const polygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Accuracy by domain"
    >
      {ringPcts.map((p) => (
        <circle
          key={p}
          cx={cx}
          cy={cy}
          r={(p / 100) * radius}
          fill="none"
          stroke="hsl(var(--color-divider))"
          strokeOpacity={0.5}
          strokeWidth={1}
        />
      ))}
      {points.map((p) => (
        <line
          key={`axis-${p.label}`}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(p.angle) * radius}
          y2={cy + Math.sin(p.angle) * radius}
          stroke="hsl(var(--color-divider))"
          strokeOpacity={p.hasData ? 0.7 : 0.25}
          strokeDasharray={p.hasData ? undefined : '3 3'}
        />
      ))}
      <polygon points={polygon} fill="hsl(var(--color-accent) / 0.25)" stroke="hsl(var(--color-accent))" strokeWidth={2} />
      {points.map((p) => (
        <g key={`pt-${p.label}`}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="hsl(var(--color-accent))" />
          <text
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill={p.hasData ? 'hsl(var(--color-fg))' : 'hsl(var(--color-fg-muted))'}
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
