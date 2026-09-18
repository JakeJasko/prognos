import React, { useState } from "react";
import { CalibrationBucket } from "../types";

interface CalibrationChartProps {
  buckets: CalibrationBucket[];
}

export const CalibrationChart: React.FC<CalibrationChartProps> = ({ buckets }) => {
  const [hovered, setHovered] = useState<CalibrationBucket | null>(null);

  const size = 360;
  const pad = 42;
  const plot = size - pad * 2;

  const toX = (val: number) => pad + val * plot;
  const toY = (val: number) => size - pad - val * plot;

  const active = buckets.filter(
    (b) => b.count > 0 && b.meanPrediction !== null && b.meanOutcome !== null
  );

  const pathD = active
    .map((b, idx) => {
      const x = toX(b.meanPrediction!);
      const y = toY(b.meanOutcome!);
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "380px", margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="precision-chart-svg"
        role="img"
        aria-label="Observer calibration plot showing empirical outcome rate versus forecasted probability"
      >
        {/* Subtle Grid */}
        {ticks.map((t) => {
          const x = toX(t);
          const y = toY(t);
          return (
            <React.Fragment key={t}>
              <line
                x1={pad}
                y1={y}
                x2={size - pad}
                y2={y}
                stroke="var(--border-dim)"
                strokeWidth="1"
              />
              <line
                x1={x}
                y1={pad}
                x2={x}
                y2={size - pad}
                stroke="var(--border-dim)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={size - pad + 15}
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-sans)"
                textAnchor="middle"
              >
                {Math.round(t * 100)}%
              </text>
              <text
                x={pad - 8}
                y={y + 3}
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-sans)"
                textAnchor="end"
              >
                {Math.round(t * 100)}%
              </text>
            </React.Fragment>
          );
        })}

        {/* Diagonal Line of Perfect Calibration (y = x) */}
        <line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(1)}
          y2={toY(1)}
          stroke="var(--accent-brass)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.6"
        />

        {/* Observer Calibration Line */}
        {active.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--text-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data Points */}
        {active.map((b) => {
          const cx = toX(b.meanPrediction!);
          const cy = toY(b.meanOutcome!);
          const isHov = hovered?.binIndex === b.binIndex;

          return (
            <g
              key={b.binIndex}
              onMouseEnter={() => setHovered(b)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHov ? 9 : 5}
                fill={isHov ? "var(--accent-brass)" : "var(--text-primary)"}
                stroke="var(--bg-surface)"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Axis Titles */}
        <text
          x={size / 2}
          y={size - 4}
          fill="var(--text-muted)"
          fontSize="10.5"
          fontWeight="600"
          textAnchor="middle"
        >
          Forecast Probability →
        </text>
        <text
          x={-size / 2}
          y={12}
          transform="rotate(-90)"
          fill="var(--text-muted)"
          fontSize="10.5"
          fontWeight="600"
          textAnchor="middle"
        >
          Observed Win Rate →
        </text>
      </svg>

      {/* Hover Card */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: `${toY(hovered.meanOutcome!) - 30}px`,
            left: `${toX(hovered.meanPrediction!)}px`,
            transform: "translate(-50%, -100%)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-brass)",
            borderRadius: "var(--radius-xs)",
            padding: "0.4rem 0.65rem",
            fontSize: "0.75rem",
            color: "var(--text-primary)",
            pointerEvents: "none",
            boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
            zIndex: 10,
            whiteSpace: "nowrap"
          }}
        >
          <div>Bin: <b>{hovered.binRange}</b> ({hovered.count} forecasts)</div>
          <div>Avg Forecast: <b>{Math.round(hovered.meanPrediction! * 100)}%</b></div>
          <div style={{ color: "var(--accent-brass)" }}>Actual Win: <b>{Math.round(hovered.meanOutcome! * 100)}%</b></div>
        </div>
      )}

      {active.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Resolve predictions to plot your reliability curve.
        </div>
      )}
    </div>
  );
};
