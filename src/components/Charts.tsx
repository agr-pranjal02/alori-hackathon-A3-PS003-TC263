import React, { useState } from 'react';

interface LineSeries {
  id: string;
  label: string;
  color: string;
  data: { x: number | string; y: number }[];
  dashed?: boolean;
  strokeWidth?: number;
}

interface MultiLineChartProps {
  series: LineSeries[];
  referenceLine?: { y: number; label: string; color: string; dashed?: boolean };
  height?: number;
  yLabel?: string;
  xLabel?: string;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  series,
  referenceLine,
  height = 260,
  yLabel,
  xLabel,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Collect all points
  const allPoints = series.flatMap(s => s.data);
  if (allPoints.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-sm">
        No data points available yet
      </div>
    );
  }

  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const width = 800; // viewBox width

  let minY = Math.min(...allPoints.map(p => p.y));
  let maxY = Math.max(...allPoints.map(p => p.y));

  if (referenceLine) {
    minY = Math.min(minY, referenceLine.y);
    maxY = Math.max(maxY, referenceLine.y);
  }

  // Add 10% vertical padding
  const ySpan = Math.max(1, maxY - minY);
  const chartMinY = Math.max(0, Math.floor(minY - ySpan * 0.1));
  const chartMaxY = Math.ceil(maxY + ySpan * 0.1);

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Max X length across series
  const maxLen = Math.max(...series.map(s => s.data.length));
  const getX = (index: number) => {
    if (maxLen <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (maxLen - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const ratio = (val - chartMinY) / (chartMaxY - chartMinY || 1);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  // Generate 4 horizontal ticks
  const ticks = [0, 0.33, 0.66, 1].map(r => {
    const val = chartMinY + r * (chartMaxY - chartMinY);
    return {
      val: Math.round(val * 10) / 10,
      y: padding.top + plotHeight - r * plotHeight,
    };
  });

  return (
    <div className="w-full relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        {/* Horizontal grid lines */}
        {ticks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              stroke="#e2e8f0"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 8}
              y={t.y + 4}
              textAnchor="end"
              className="text-[10px] font-mono fill-slate-400 tabular-nums"
            >
              {t.val}
            </text>
          </g>
        ))}

        {/* Reference horizontal line if provided */}
        {referenceLine && (
          <g>
            <line
              x1={padding.left}
              y1={getY(referenceLine.y)}
              x2={width - padding.right}
              y2={getY(referenceLine.y)}
              stroke={referenceLine.color}
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
            <text
              x={width - padding.right}
              y={getY(referenceLine.y) - 6}
              textAnchor="end"
              className="text-[10px] font-medium"
              fill={referenceLine.color}
            >
              {referenceLine.label} ({referenceLine.y})
            </text>
          </g>
        )}

        {/* Series paths */}
        {series.map(s => {
          if (s.data.length === 0) return null;
          const d = s.data
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.y)}`)
            .join(' ');

          return (
            <g key={s.id}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.strokeWidth ?? 2}
                strokeDasharray={s.dashed ? '5,4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {s.data.map((p, idx) => (
                <circle
                  key={idx}
                  cx={getX(idx)}
                  cy={getY(p.y)}
                  r={hoverIndex === idx ? 4.5 : 2.5}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              ))}
            </g>
          );
        })}

        {/* X axis labels (sparse) */}
        {series[0]?.data.map((p, i) => {
          const step = Math.max(1, Math.floor(maxLen / 7));
          if (i % step !== 0 && i !== maxLen - 1) return null;
          return (
            <text
              key={i}
              x={getX(i)}
              y={height - 10}
              textAnchor="middle"
              className="text-[10px] font-mono fill-slate-400 tabular-nums"
            >
              {String(p.x)}
            </text>
          );
        })}

        {/* Y Axis Label */}
        {yLabel && (
          <text
            x={14}
            y={height / 2}
            transform={`rotate(-90, 14, ${height / 2})`}
            textAnchor="middle"
            className="text-[10px] font-medium fill-slate-500 uppercase tracking-wider"
          >
            {yLabel}
          </text>
        )}

        {/* X Axis Label */}
        {xLabel && (
          <text
            x={width / 2}
            y={height - 1}
            textAnchor="middle"
            className="text-[10px] font-medium fill-slate-500 uppercase tracking-wider"
          >
            {xLabel}
          </text>
        )}
      </svg>

      {/* Series Legend */}
      <div className="flex flex-wrap items-center justify-end gap-4 mt-2 px-2 text-xs">
        {series.map(s => (
          <div key={s.id} className="flex items-center gap-1.5 text-slate-600">
            <span
              className="w-3 h-0.5 inline-block rounded-full"
              style={{
                backgroundColor: s.color,
                borderBottom: s.dashed ? '1px dashed' : 'none',
              }}
            />
            <span className="font-medium text-slate-700">{s.label}</span>
          </div>
        ))}
        {referenceLine && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <span
              className="w-3 h-0.5 inline-block border-b-2 border-dashed"
              style={{ borderColor: referenceLine.color }}
            />
            <span>{referenceLine.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
  highlight?: boolean;
}

interface DualBarChartProps {
  items: BarChartItem[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  unit?: string;
}

export const DualBarChart: React.FC<DualBarChartProps> = ({
  items,
  primaryLabel,
  secondaryLabel,
  primaryColor = '#6366f1',
  secondaryColor = '#f59e0b',
  height = 200,
  unit = 'KB',
}) => {
  if (items.length === 0) {
    return <div style={{ height }} className="bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">No entries</div>;
  }

  const maxVal = Math.max(...items.flatMap(i => [i.value, i.secondaryValue ?? 0]), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-3 justify-between pt-4 pb-2 border-b border-slate-200" style={{ height }}>
        {items.map((item, idx) => {
          const h1 = Math.max(4, (item.value / maxVal) * (height - 50));
          const h2 = item.secondaryValue !== undefined ? Math.max(4, (item.secondaryValue / maxVal) * (height - 50)) : 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              <div className="text-[10px] font-mono text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap">
                {item.value} {unit}
              </div>
              <div className="flex items-end gap-1 w-full justify-center">
                <div
                  className="w-4 rounded-t transition-all duration-300 hover:brightness-110"
                  style={{ height: `${h1}px`, backgroundColor: primaryColor }}
                />
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-4 rounded-t transition-all duration-300 hover:brightness-110"
                    style={{ height: `${h2}px`, backgroundColor: secondaryColor }}
                  />
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-600 mt-2 truncate w-full text-center">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-4 mt-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: primaryColor }} />
          <span>{primaryLabel}</span>
        </div>
        {secondaryLabel && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: secondaryColor }} />
            <span>{secondaryLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};
