import React, { useState, useRef, useCallback } from 'react';
import { fmtD } from '../utils';

export interface ActivityTrendPoint {
  posts: number;
  replies: number;
  label: string | number;
  date?: Date;
  dateStr?: string;
}

interface ActivityTrendChartProps {
  data: ActivityTrendPoint[];
  className?: string;
}

export const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({ data, className }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = data.length;
  const W = 600;
  const H = 230;
  const base = 196;
  const ch = 13;
  const rows = 15;
  const step = n > 0 ? (W - 40) / n : 0;

  // Ensure day labels never overlap: calculate minimum gap required
  const minLabelGap = 28;
  const skipInterval = step < minLabelGap ? Math.ceil(minLabelGap / step) : 1;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || n === 0) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;
      const colIdx = Math.floor((mouseX - 20) / step);
      const clampedIdx = Math.max(0, Math.min(n - 1, colIdx));

      if (mouseX >= 10 && mouseX <= W - 10) {
        setHoveredIdx((prev) => (prev === clampedIdx ? prev : clampedIdx));
      } else {
        setHoveredIdx((prev) => (prev === null ? null : null));
      }
    },
    [n, step, W]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIdx(null);
  }, []);

  const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : null;
  // Snap hoveredX to an integer for crisp, jitter-free line rendering
  const hoveredX = hoveredIdx !== null ? Math.round(20 + hoveredIdx * step + step / 2) : 0;

  // Calculate top of the hovered stack for circle indicator
  let hoveredTopY = base;
  if (hoveredItem) {
    const p = Math.min(hoveredItem.posts, 3);
    const r = Math.min(hoveredItem.replies, rows - p);
    const totalFilled = p + r;
    hoveredTopY = Math.round(base - totalFilled * ch);
  }

  return (
    <div className={`relative w-full select-none ${className || ''}`} onMouseLeave={handleMouseLeave}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
      >
        {/* Render columns of dots */}
        {data.map((item, i) => {
          const colCenterX = 20 + i * step + step / 2;
          const x = Math.round(colCenterX - 5);
          const p = Math.min(item.posts, 3);
          const r = Math.min(item.replies, rows - p);
          const isHovered = hoveredIdx === i;

          const rects = [];
          for (let k = 0; k < rows; k++) {
            const y = base - (k + 1) * ch + 3;
            const c = k < r ? '#161616' : k < r + p ? '#f26a1b' : '#ebe9e3';
            rects.push(
              <rect
                key={k}
                x={x}
                y={y}
                width={10}
                height={10}
                rx={2.5}
                fill={c}
                opacity={isHovered ? 1 : 0.9}
                filter={isHovered ? 'brightness(1.06)' : undefined}
                className="pointer-events-none transition-[filter,opacity] duration-100"
              />
            );
          }

          // Day label with overlap prevention: strict interval spacing ensures labels never collide
          const showLabel = i % skipInterval === 0;

          return (
            <g key={i} className="pointer-events-none">
              {/* Soft hover column highlight background track without moving layout */}
              {isHovered && (
                <rect
                  x={x - 2}
                  y={base - rows * ch + 1}
                  width={14}
                  height={rows * ch + 4}
                  rx={4}
                  fill="rgba(0, 0, 0, 0.04)"
                />
              )}
              {rects}
              {showLabel && (
                <text
                  x={colCenterX}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={isHovered ? '600' : '400'}
                  fill={isHovered ? '#161616' : '#9b988f'}
                  className="font-sans select-none"
                >
                  {item.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover elements: cursor line and circle marker matching Image 2 */}
        {hoveredIdx !== null && (
          <g className="pointer-events-none">
            {/* Vertical dashed guide line with crispEdges to eliminate any subpixel shaking */}
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={12}
              y2={base + 2}
              stroke="#9b988f"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              shapeRendering="crispEdges"
            />

            {/* Target indicator circle on top of active column */}
            <circle
              cx={hoveredX}
              cy={hoveredTopY}
              r="4.5"
              fill="#ffffff"
              stroke="#f26a1b"
              strokeWidth="2.5"
            />
          </g>
        )}

        {/* Invisible hit-testing layer covering the entire chart to prevent event bubbling jitter */}
        <rect
          x="0"
          y="0"
          width={W}
          height={H}
          fill="none"
          pointerEvents="all"
          className="cursor-crosshair"
        />
      </svg>

      {/* Floating Tooltip Card matching Image 2: locks synchronously to hovered coordinates */}
      {hoveredItem && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-full mb-3.5 transition-opacity duration-150 animate-in fade-in"
          style={{
            left: `${(hoveredX / W) * 100}%`,
            top: `${(Math.max(hoveredTopY - 10, 16) / H) * 100}%`,
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm border border-[var(--line)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] rounded-xl px-3 py-1.5 whitespace-nowrap text-center">
            <span className="font-mono text-[12px] font-medium text-[var(--ink)]">
              {hoveredItem.dateStr || (hoveredItem.date ? fmtD(hoveredItem.date) : hoveredItem.label)}
            </span>
            <span className="text-[var(--mute)] mx-1.5 font-mono text-[12px]">·</span>
            <span className="font-mono text-[12px] text-[#f26a1b] font-semibold">
              {hoveredItem.posts} {hoveredItem.posts === 1 ? 'post' : 'posts'}
            </span>
            <span className="text-[var(--mute)] mx-1 font-mono text-[12px]">,</span>
            <span className="font-mono text-[12px] text-[#161616] font-semibold">
              {hoveredItem.replies} {hoveredItem.replies === 1 ? 'reply' : 'replies'}
            </span>
            <span className="text-[var(--mute)] font-mono text-[11px] ml-1.5">
              ({hoveredItem.posts + hoveredItem.replies} total)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
